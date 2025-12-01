'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePresence } from '@/lib/hooks/usePresence'
import { useTimeline } from '@/lib/hooks/useTimeline'
import { useSessionReplay } from '@/lib/hooks/useSessionReplay'
import { useContributionStats, type PeriodFilter } from '@/lib/hooks/useContributionStats'
import UserList from '@/components/UserList'
import Timeline from '@/components/Timeline'
import DocumentEditor, { type DocumentEditorRef } from '@/components/DocumentEditor'
import SessionReplay from '@/components/SessionReplay'
import ContributionChart from '@/components/ContributionChart'

interface Document {
  id: string
  title: string
  content: string
  updatedAt: string
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [scrollToLine, setScrollToLine] = useState<number | null>(null)
  const [showReplay, setShowReplay] = useState(false)
  const [contributionPeriod, setContributionPeriod] = useState<PeriodFilter>('all')
  const documentEditorRef = useRef<DocumentEditorRef>(null)
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { collaborators, isConnected, startEditing, stopEditing, socket } = usePresence({
    documentId,
    userName: nickname,
    enabled: !!nickname && !!documentId
  })

  const { editLogs, isLoading: timelineLoading, createEditLog, deleteEditLog } = useTimeline({
    documentId,
    socket,
    enabled: !!documentId && !showReplay // 리플레이 중일 때는 실시간 업데이트 비활성화
  })

  // 세션 리플레이 훅
  const replayState = useSessionReplay({
    documentId,
    initialContent: content,
    editLogs
  })

  // 유저별 기여도 통계 훅
  const { stats, totalCount, isLoading: statsLoading } = useContributionStats({
    documentId,
    period: contributionPeriod,
    enabled: !!documentId
  })

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname')
    if (!savedNickname) {
      router.push('/')
      return
    }
    setNickname(savedNickname)
  }, [router])

  useEffect(() => {
    if (!documentId) return
    loadDocument()
  }, [documentId])

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
        setTitle(data.document.title)
        setContent(data.document.content)
      } else if (response.status === 404) {
        router.push('/docs')
      }
    } catch (error) {
      console.error('문서 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveTitle = async (newTitle: string) => {
    if (!documentId) return

    setIsSavingTitle(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle })
      })

      if (response.ok) {
        const data = await response.json()
        setDocument(data.document)
      }
    } catch (error) {
      console.error('제목 저장 실패:', error)
    } finally {
      setIsSavingTitle(false)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)

    // 디바운스: 1초 후 자동 저장
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current)
    }

    titleTimeoutRef.current = setTimeout(() => {
      saveTitle(newTitle)
    }, 1000)
  }

  const handleContentChange = (newContent: string) => {
    // 리플레이 모드가 아닐 때만 실제 편집 반영
    if (!showReplay) {
      setContent(newContent)
      startEditing()
      stopEditing()
    }
  }

  const handleTimelineLogClick = useCallback((lineNumber: number) => {
    setScrollToLine(lineNumber)
    // 스크롤 후 상태 초기화 (다시 클릭할 수 있도록)
    setTimeout(() => {
      setScrollToLine(null)
    }, 100)
  }, [])

  const handleDeleteEditLog = useCallback(async (editLogId: string) => {
    if (confirm('이 변경 이력을 삭제하시겠습니까?')) {
      const success = await deleteEditLog(editLogId)
      if (success) {
        // 삭제 성공 시 추가 작업 없음 (이미 목록에서 제거됨)
      } else {
        alert('변경 이력 삭제에 실패했습니다.')
      }
    }
  }, [deleteEditLog])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">문서를 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => router.push('/docs')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← 목록
            </button>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="flex-1 px-3 py-1 text-lg font-semibold border-none outline-none bg-transparent"
              placeholder="문서 제목"
            />
            {isSavingTitle && (
              <span className="text-xs text-gray-500">저장 중...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="text-xs text-green-600">● 연결됨</span>
            ) : (
              <span className="text-xs text-red-600">● 연결 끊김</span>
            )}
            <span className="text-sm text-gray-600">{nickname}</span>
          </div>
        </div>
      </header>

      {/* 사용자 목록 */}
      <UserList collaborators={collaborators} currentUserName={nickname} />

      {/* 활동 올리기 버튼 */}
      <div className="px-4 py-2 bg-white border-b flex justify-end">
        <button
          onClick={() => {
            // DocumentEditor의 createLog 함수 호출
            if (documentEditorRef.current) {
              documentEditorRef.current.createLog()
            }
          }}
          className="w-32 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          활동 올리기
        </button>
      </div>

      {/* 메인 영역 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 편집 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden bg-white">
            <DocumentEditor
              ref={documentEditorRef}
              documentId={documentId}
              initialContent={showReplay ? replayState.replayContent : content}
              userName={nickname}
              socket={showReplay ? null : socket}
              onContentChange={handleContentChange}
              scrollToLine={scrollToLine}
              readOnly={showReplay}
              autoLog={false}
            />
          </div>
        </div>

        {/* 우측 사이드바 */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          {showReplay ? (
            /* 리플레이 모드 */
            <SessionReplay
              documentId={documentId}
              initialContent={content}
              editLogs={editLogs}
              isReplaying={replayState.isReplaying}
              currentIndex={replayState.currentIndex}
              replayContent={replayState.replayContent}
              speed={replayState.speed}
              totalSteps={replayState.totalSteps}
              currentLog={replayState.currentLog}
              onStartReplay={replayState.startReplay}
              onStopReplay={() => {
                replayState.stopReplay()
                setShowReplay(false)
              }}
              onTogglePlayPause={replayState.togglePlayPause}
              onNextStep={replayState.nextStep}
              onPrevStep={replayState.prevStep}
              onGoToStep={replayState.goToStep}
              onChangeSpeed={replayState.changeSpeed}
            />
          ) : (
            /* 일반 모드: 기여도 차트 + 타임라인 */
            <>
              {/* 유저별 기여도 차트 */}
              <ContributionChart
                stats={stats}
                totalCount={totalCount}
                isLoading={statsLoading}
                period={contributionPeriod}
                onPeriodChange={setContributionPeriod}
              />

              {/* 히스토리 재생 버튼 */}
              <div className="p-4 border-b bg-gray-50">
                <button
                  onClick={() => {
                    setShowReplay(true)
                    replayState.startReplay()
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  히스토리 재생
                </button>
              </div>

              {/* 타임라인 */}
              <div className="flex-1 overflow-hidden">
                <Timeline
                  editLogs={editLogs}
                  isLoading={timelineLoading}
                  onLogClick={handleTimelineLogClick}
                  onDelete={handleDeleteEditLog}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

