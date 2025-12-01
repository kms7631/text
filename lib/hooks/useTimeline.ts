import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import type { EditLogCreatedEvent, SocketEvent } from '../types'

export interface EditLog {
  id: string
  documentId: string
  userName: string
  lineNumber: number
  summary: string
  createdAt: Date
}

interface UseTimelineOptions {
  documentId: string
  socket: Socket | null
  enabled?: boolean
}

export function useTimeline({ documentId, socket, enabled = true }: UseTimelineOptions) {
  const [editLogs, setEditLogs] = useState<EditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  /**
   * 중복된 변경 이력 제거
   * - 같은 summary를 가진 연속된 로그 제거 (정규화된 summary 비교)
   * - 같은 줄 번호 + 같은 사용자 + 10초 이내 생성된 로그 중 가장 최신 것만 유지
   */
  const deduplicatedLogs = useMemo(() => {
    if (editLogs.length === 0) return []

    // 시간순으로 정렬 (최신이 먼저)
    const sorted = [...editLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const filtered: EditLog[] = []
    const seenSummaries = new Set<string>()

    for (let i = 0; i < sorted.length; i++) {
      const log = sorted[i]
      
      // summary 정규화 (공백 제거, 소문자 변환하여 비교)
      const normalizedSummary = log.summary
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .substring(0, 100) // 처음 100자만 비교
      
      const summaryKey = `${log.userName}-${normalizedSummary}`
      
      // 이전 로그와 비교하여 중복 체크
      let isDuplicate = false
      
      // 같은 summary를 가진 로그가 이미 있는지 확인
      if (seenSummaries.has(summaryKey)) {
        isDuplicate = true
      } else {
        // 같은 사용자가 같은 줄 번호에서 10초 이내에 수정한 경우 체크
        const logTime = new Date(log.createdAt).getTime()
        for (const existingLog of filtered) {
          if (
            existingLog.userName === log.userName &&
            existingLog.lineNumber === log.lineNumber &&
            Math.abs(new Date(existingLog.createdAt).getTime() - logTime) < 10000 // 10초 이내
          ) {
            // 이미 있는 로그가 더 최신이면 현재 로그는 중복
            if (new Date(existingLog.createdAt).getTime() > logTime) {
              isDuplicate = true
              break
            }
          }
        }
      }

      if (!isDuplicate) {
        filtered.push(log)
        seenSummaries.add(summaryKey)
      }
    }

    // 다시 시간순으로 정렬 (최신이 먼저)
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [editLogs])

  // 초기 편집 로그 로드
  useEffect(() => {
    if (!enabled || !documentId) return

    const loadEditLogs = async () => {
      try {
        const response = await fetch(`/api/edit-logs?documentId=${documentId}&limit=50`)
        if (response.ok) {
          const data = await response.json()
          setEditLogs(data.editLogs || [])
        }
      } catch (error) {
        console.error('편집 로그 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEditLogs()
  }, [documentId, enabled])

  // 실시간 편집 로그 수신
  useEffect(() => {
    if (!socket || !enabled) return

    const handleEditLogCreated = (event: Extract<SocketEvent, { type: 'edit_log_created' }>) => {
      if (event.editLog.documentId === documentId) {
        setEditLogs((prev) => [event.editLog, ...prev])
      }
    }

    socket.on('edit_log_created', handleEditLogCreated)

    return () => {
      socket.off('edit_log_created', handleEditLogCreated)
    }
  }, [socket, documentId, enabled])

  const createEditLog = useCallback(
    async (userName: string, lineNumber: number, summary: string) => {
      if (!socket) return

      socket.emit('create_edit_log', {
        documentId,
        userName,
        lineNumber,
        summary
      })
    },
    [socket, documentId]
  )

  const deleteEditLog = useCallback(
    async (editLogId: string) => {
      try {
        const response = await fetch(`/api/edit-logs/${editLogId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // 목록에서 제거
          setEditLogs((prev) => prev.filter((log) => log.id !== editLogId))
          return true
        }
        return false
      } catch (error) {
        console.error('편집 로그 삭제 실패:', error)
        return false
      }
    },
    []
  )

  return {
    editLogs: deduplicatedLogs, // 중복 제거된 로그 반환
    isLoading,
    createEditLog,
    deleteEditLog
  }
}

