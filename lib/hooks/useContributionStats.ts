import { useEffect, useState } from 'react'

/**
 * 유저별 기여도 통계 훅
 * 특정 문서의 EditLog를 사용자별로 집계하여 기여도를 계산합니다.
 */
export interface ContributionStat {
  userName: string
  count: number
  ratio: number
}

export type PeriodFilter = 'all' | 'today' | 'week'

interface UseContributionStatsOptions {
  documentId: string
  period?: PeriodFilter
  enabled?: boolean
}

export function useContributionStats({
  documentId,
  period = 'all',
  enabled = true
}: UseContributionStatsOptions) {
  const [stats, setStats] = useState<ContributionStat[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!enabled || !documentId) {
      setIsLoading(false)
      return
    }

    const loadStats = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/edit-logs/stats?documentId=${documentId}&period=${period}`
        )
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats || [])
          setTotalCount(data.totalCount || 0)
        }
      } catch (error) {
        console.error('기여도 통계 로드 실패:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [documentId, period, enabled])

  return {
    stats,
    totalCount,
    isLoading
  }
}

