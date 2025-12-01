import { useState, useEffect, useRef, useCallback } from 'react'
import type { EditLog } from './useTimeline'

/**
 * 세션 히스토리 리플레이 훅
 * EditLog를 시간순으로 재생하여 문서 변경 이력을 시각화합니다.
 */
interface UseSessionReplayOptions {
  documentId: string
  initialContent: string
  editLogs: EditLog[]
}

export type ReplaySpeed = 1 | 2 | 4

export interface ReplayState {
  isPlaying: boolean
  currentIndex: number
  currentContent: string
  speed: ReplaySpeed
}

export function useSessionReplay({
  documentId,
  initialContent,
  editLogs
}: UseSessionReplayOptions) {
  const [isReplaying, setIsReplaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [replayContent, setReplayContent] = useState(initialContent)
  const [speed, setSpeed] = useState<ReplaySpeed>(1)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const contentHistoryRef = useRef<string[]>([])

  // EditLog를 시간순으로 정렬 (오름차순)
  const sortedLogs = [...editLogs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // 리플레이용 내용 히스토리 생성
  // 실제 문서 내용 변화를 정확히 재현하기 어려우므로,
  // summary를 기반으로 간단한 시뮬레이션을 수행합니다.
  useEffect(() => {
    if (sortedLogs.length === 0) {
      contentHistoryRef.current = [initialContent]
      return
    }

    // 각 EditLog 시점의 내용을 추정하여 히스토리 생성
    const history: string[] = [initialContent]
    let currentContent = initialContent

    sortedLogs.forEach((log, index) => {
      // summary를 기반으로 내용 변화 시뮬레이션
      // 실제로는 summary가 변경된 텍스트 일부이므로,
      // 해당 줄 근처에 summary가 포함되도록 간단히 처리
      const lines = currentContent.split('\n')
      const targetLineIndex = Math.max(0, log.lineNumber - 1)

      // summary가 현재 내용에 없으면 추가 (간단한 시뮬레이션)
      if (targetLineIndex < lines.length) {
        const targetLine = lines[targetLineIndex]
        if (!targetLine.includes(log.summary.substring(0, 20))) {
          // summary의 일부를 해당 줄에 반영
          lines[targetLineIndex] = `${targetLine}\n${log.summary.substring(0, 50)}`
          currentContent = lines.join('\n')
        }
      } else {
        // 줄이 부족하면 추가
        while (lines.length <= targetLineIndex) {
          lines.push('')
        }
        lines[targetLineIndex] = log.summary.substring(0, 50)
        currentContent = lines.join('\n')
      }

      history.push(currentContent)
    })

    contentHistoryRef.current = history
  }, [sortedLogs, initialContent])

  // 리플레이 시작
  const startReplay = useCallback(() => {
    setIsReplaying(true)
    setCurrentIndex(-1)
    setReplayContent(initialContent)
  }, [initialContent])

  // 리플레이 중지
  const stopReplay = useCallback(() => {
    setIsReplaying(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 리플레이 재생/일시정지 토글
  const togglePlayPause = useCallback(() => {
    if (isReplaying) {
      if (currentIndex >= sortedLogs.length - 1) {
        // 끝에 도달했으면 처음부터 다시 시작
        startReplay()
      } else {
        // 일시정지
        stopReplay()
      }
    } else {
      // 재생 시작
      setIsReplaying(true)
    }
  }, [isReplaying, currentIndex, sortedLogs.length, startReplay, stopReplay])

  // 다음 스텝으로 이동
  const nextStep = useCallback(() => {
    if (currentIndex < sortedLogs.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      if (nextIndex >= 0 && nextIndex < contentHistoryRef.current.length) {
        setReplayContent(contentHistoryRef.current[nextIndex + 1] || replayContent)
      }
    }
  }, [currentIndex, sortedLogs.length, replayContent])

  // 이전 스텝으로 이동
  const prevStep = useCallback(() => {
    if (currentIndex >= 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      if (prevIndex >= -1 && prevIndex < contentHistoryRef.current.length - 1) {
        setReplayContent(
          prevIndex >= 0
            ? contentHistoryRef.current[prevIndex + 1]
            : initialContent
        )
      }
    } else {
      // 처음으로 돌아가기
      setCurrentIndex(-1)
      setReplayContent(initialContent)
    }
  }, [currentIndex, initialContent])

  // 특정 인덱스로 이동
  const goToStep = useCallback(
    (index: number) => {
      const targetIndex = Math.max(-1, Math.min(index, sortedLogs.length - 1))
      setCurrentIndex(targetIndex)
      if (targetIndex >= -1 && targetIndex < contentHistoryRef.current.length - 1) {
        setReplayContent(
          targetIndex >= 0
            ? contentHistoryRef.current[targetIndex + 1]
            : initialContent
        )
      }
    },
    [sortedLogs.length, initialContent]
  )

  // 재생 속도 변경
  const changeSpeed = useCallback((newSpeed: ReplaySpeed) => {
    setSpeed(newSpeed)
  }, [])

  // 자동 재생 로직
  useEffect(() => {
    if (!isReplaying || currentIndex >= sortedLogs.length - 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (currentIndex >= sortedLogs.length - 1) {
        setIsReplaying(false)
      }
      return
    }

    // 재생 속도에 따라 간격 조정 (기본 1초, 속도에 따라 나눔)
    const interval = 1000 / speed

    intervalRef.current = setInterval(() => {
      nextStep()
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isReplaying, currentIndex, sortedLogs.length, speed, nextStep])

  // 현재 재생 중인 로그 정보
  const currentLog = currentIndex >= 0 ? sortedLogs[currentIndex] : null

  return {
    isReplaying,
    currentIndex,
    replayContent,
    speed,
    totalSteps: sortedLogs.length,
    currentLog,
    startReplay,
    stopReplay,
    togglePlayPause,
    nextStep,
    prevStep,
    goToStep,
    changeSpeed
  }
}

