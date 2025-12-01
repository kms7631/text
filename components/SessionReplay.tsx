'use client'

import { useState } from 'react'
import type { EditLog } from '@/lib/hooks/useTimeline'
import type { ReplaySpeed } from '@/lib/hooks/useSessionReplay'

interface SessionReplayProps {
  documentId: string
  initialContent: string
  editLogs: EditLog[]
  isReplaying: boolean
  currentIndex: number
  replayContent: string
  speed: ReplaySpeed
  totalSteps: number
  currentLog: EditLog | null
  onStartReplay: () => void
  onStopReplay: () => void
  onTogglePlayPause: () => void
  onNextStep: () => void
  onPrevStep: () => void
  onGoToStep: (index: number) => void
  onChangeSpeed: (speed: ReplaySpeed) => void
}

/**
 * 세션 히스토리 리플레이 컴포넌트
 * 문서 변경 이력을 시간순으로 재생하는 UI를 제공합니다.
 */
export default function SessionReplay({
  documentId,
  initialContent,
  editLogs,
  isReplaying,
  currentIndex,
  replayContent,
  speed,
  totalSteps,
  currentLog,
  onStartReplay,
  onStopReplay,
  onTogglePlayPause,
  onNextStep,
  onPrevStep,
  onGoToStep,
  onChangeSpeed
}: SessionReplayProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDateTime = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const progress = totalSteps > 0 ? ((currentIndex + 1) / totalSteps) * 100 : 0

  if (!isOpen) {
    return (
      <div className="p-4 border-b bg-gray-50">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          히스토리 재생
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white border-l">
      {/* 헤더 */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-800">히스토리 재생</h2>
          <button
            onClick={() => {
              setIsOpen(false)
              onStopReplay()
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        {totalSteps === 0 && (
          <p className="text-sm text-gray-500">재생할 변경 이력이 없습니다.</p>
        )}
      </div>

      {totalSteps > 0 && (
        <>
          {/* 컨트롤 패널 */}
          <div className="p-4 border-b bg-white">
            {/* 재생 컨트롤 */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={onPrevStep}
                disabled={currentIndex < 0}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ◀◀
              </button>
              <button
                onClick={onTogglePlayPause}
                className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                {isReplaying ? '⏸ 일시정지' : '▶ 재생'}
              </button>
              <button
                onClick={onNextStep}
                disabled={currentIndex >= totalSteps - 1}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                ▶▶
              </button>
              <button
                onClick={onStopReplay}
                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm ml-auto"
              >
                중지
              </button>
            </div>

            {/* 속도 조절 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600">속도:</span>
              {([1, 2, 4] as ReplaySpeed[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-3 py-1 rounded text-sm ${
                    speed === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* 진행 바 */}
            <div className="mb-3">
              <input
                type="range"
                min={-1}
                max={totalSteps - 1}
                value={currentIndex}
                onChange={(e) => onGoToStep(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>시작</span>
                <span>
                  {currentIndex + 1} / {totalSteps}
                </span>
                <span>끝</span>
              </div>
            </div>

            {/* 현재 재생 정보 */}
            {currentLog && (
              <div className="p-3 bg-gray-50 rounded text-sm">
                <div className="font-medium text-gray-700 mb-1">
                  {currentLog.userName}
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {formatDateTime(currentLog.createdAt)}
                </div>
                <div className="text-xs text-gray-600">
                  {currentLog.lineNumber}번째 줄 근처 수정
                </div>
                <div className="text-xs text-gray-700 mt-1 line-clamp-2">
                  {currentLog.summary}
                </div>
              </div>
            )}
          </div>

          {/* 리플레이 내용 영역 */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-gray-50 rounded p-4 mb-2">
              <div className="text-xs text-gray-500 mb-2">
                재생 중인 내용 (읽기 전용)
              </div>
              <textarea
                value={replayContent}
                readOnly
                className="w-full h-full min-h-[300px] p-4 text-gray-900 bg-white resize-none focus:outline-none border border-gray-200 rounded font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

