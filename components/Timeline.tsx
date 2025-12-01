'use client'

import { useState, useRef, useEffect } from 'react'
import type { EditLog } from '@/lib/hooks/useTimeline'

interface TimelineProps {
  editLogs: EditLog[]
  isLoading: boolean
  onLogClick?: (lineNumber: number) => void
  onDelete?: (editLogId: string) => void
}

export default function Timeline({ editLogs, isLoading, onLogClick, onDelete }: TimelineProps) {
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [truncatedLogs, setTruncatedLogs] = useState<Set<string>>(new Set())
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const formatTime = (date: Date) => {
    const d = new Date(date)
    const hours = d.getHours().toString().padStart(2, '0')
    const minutes = d.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleLogClick = (lineNumber: number, e: React.MouseEvent) => {
    // 삭제 버튼 클릭 시에는 클릭 이벤트 전파 방지
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    if (onLogClick) {
      onLogClick(lineNumber)
    }
  }

  const handleDelete = (e: React.MouseEvent, editLogId: string) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(editLogId)
    }
  }

  const toggleExpand = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation()
    setExpandedLogs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  const isExpanded = (logId: string) => expandedLogs.has(logId)
  const isTruncated = (logId: string) => truncatedLogs.has(logId)

  // 텍스트가 잘렸는지 확인하는 함수
  useEffect(() => {
    const checkTruncation = () => {
      const newTruncated = new Set<string>()
      contentRefs.current.forEach((el, logId) => {
        if (el && !expandedLogs.has(logId)) {
          // scrollHeight가 clientHeight보다 크면 텍스트가 잘린 것
          const isTruncated = el.scrollHeight > el.clientHeight
          if (isTruncated) {
            newTruncated.add(logId)
          }
        }
      })
      setTruncatedLogs(newTruncated)
    }

    // 렌더링 후 확인
    const timeoutId = setTimeout(checkTruncation, 100)
    
    // 윈도우 리사이즈 시에도 확인
    window.addEventListener('resize', checkTruncation)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', checkTruncation)
    }
  }, [editLogs, expandedLogs])

  return (
    <div className="h-full flex flex-col bg-white border-l">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800">변경 이력</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">로딩 중...</div>
        ) : editLogs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">변경 이력이 없습니다.</div>
        ) : (
          <div className="divide-y">
            {editLogs.map((log) => (
              <div
                key={log.id}
                onClick={(e) => handleLogClick(log.lineNumber, e)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer group relative"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {log.userName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {log.lineNumber}번째 줄 근처 수정
                      {log.summary.includes('|||') && (
                        <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                          [삭제]
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <div 
                        ref={(el) => {
                          if (el) {
                            contentRefs.current.set(log.id, el)
                          } else {
                            contentRefs.current.delete(log.id)
                          }
                        }}
                        className={`text-sm text-gray-800 flex-1 ${
                          isExpanded(log.id) ? '' : 'line-clamp-2'
                        }`}
                      >
                        {log.summary.includes('|||') ? (
                          // 삭제인 경우: 기존 내용과 화살표, 수정된 내용 표시
                          (() => {
                            const [oldContent, newContent] = log.summary.split('|||')
                            return (
                              <div className="space-y-1">
                                <div className="text-gray-700">{oldContent || '(빈 줄)'}</div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                  <span className="text-xs">삭제됨</span>
                                </div>
                                {newContent && (
                                  <div className="text-gray-600 text-xs italic">
                                    {newContent}
                                  </div>
                                )}
                              </div>
                            )
                          })()
                        ) : (
                          // 일반 수정인 경우: 기존처럼 표시
                          log.summary
                        )}
                      </div>
                      {/* 실제로 텍스트가 잘렸을 때만 화살표 표시 */}
                      {isTruncated(log.id) && (
                        <button
                          onClick={(e) => toggleExpand(e, log.id)}
                          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title={isExpanded(log.id) ? '접기' : '펼치기'}
                        >
                          {isExpanded(log.id) ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {onDelete && (
                    <button
                      onClick={(e) => handleDelete(e, log.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="삭제"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

