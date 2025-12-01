import { useEffect, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Collaborator, SocketEvent } from '../types'

interface UsePresenceOptions {
  documentId: string
  userName: string
  enabled?: boolean
}

export function usePresence({ documentId, userName, enabled = true }: UsePresenceOptions) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const editingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !documentId || !userName) return

    // Socket.IO 클라이언트 연결
    const socket = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('join_document', { documentId, userName })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('collaborator_joined', (event: Extract<SocketEvent, { type: 'collaborator_joined' }>) => {
      setCollaborators(event.collaborators)
    })

    socket.on('collaborator_left', (event: Extract<SocketEvent, { type: 'collaborator_left' }>) => {
      setCollaborators(event.collaborators)
    })

    socket.on('collaborator_editing', (event: Extract<SocketEvent, { type: 'collaborator_editing' }>) => {
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === event.collaboratorId ? { ...c, isEditing: event.isEditing } : c
        )
      )
    })

    return () => {
      if (editingTimeoutRef.current) {
        clearTimeout(editingTimeoutRef.current)
      }
      socket.emit('leave_document', { documentId })
      socket.disconnect()
    }
  }, [documentId, userName, enabled])

  const startEditing = () => {
    if (!socketRef.current || !isConnected) return

    // 이전 타이머 취소
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current)
    }

    socketRef.current.emit('start_editing', { documentId })
  }

  const stopEditing = () => {
    if (!socketRef.current || !isConnected) return

    // 디바운스: 일정 시간 후 편집 중지
    if (editingTimeoutRef.current) {
      clearTimeout(editingTimeoutRef.current)
    }

    editingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_editing', { documentId })
    }, 2000) // 2초 후 편집 중지
  }

  return {
    collaborators,
    isConnected,
    startEditing,
    stopEditing,
    socket: socketRef.current
  }
}

