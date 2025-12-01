import { useEffect, useRef, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import type { DocumentUpdatedEvent } from '../types'

interface UseDocumentSyncOptions {
  documentId: string
  socket: Socket | null
  onContentUpdate: (content: string) => void
}

export function useDocumentSync({
  documentId,
  socket,
  onContentUpdate
}: UseDocumentSyncOptions) {
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLocalUpdateRef = useRef(false)

  useEffect(() => {
    if (!socket) return

    const handleDocumentUpdate = (event: DocumentUpdatedEvent) => {
      // 로컬 업데이트가 아닌 경우에만 반영
      if (!isLocalUpdateRef.current) {
        onContentUpdate(event.content)
      }
      isLocalUpdateRef.current = false
    }

    socket.on('document_updated', handleDocumentUpdate)

    return () => {
      socket.off('document_updated', handleDocumentUpdate)
    }
  }, [socket, onContentUpdate])

  const updateDocument = useCallback(
    (content: string) => {
      if (!socket) return

      isLocalUpdateRef.current = true

      // 디바운스: 마지막 입력 후 500ms 후에 서버로 전송
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      updateTimeoutRef.current = setTimeout(async () => {
        // WebSocket으로 브로드캐스트
        socket.emit('update_document', { documentId, content })
        
        // DB에도 저장
        try {
          await fetch(`/api/documents/${documentId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
          })
        } catch (error) {
          console.error('문서 저장 실패:', error)
        }
      }, 500)
    },
    [socket, documentId]
  )

  return { updateDocument }
}

