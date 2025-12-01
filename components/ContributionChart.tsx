'use client'

import type { ContributionStat, PeriodFilter } from '@/lib/hooks/useContributionStats'

interface ContributionChartProps {
  stats: ContributionStat[]
  totalCount: number
  isLoading: boolean
  period: PeriodFilter
  onPeriodChange: (period: PeriodFilter) => void
}

/**
 * 유저별 기여도 차트 컴포넌트
 * 막대 그래프 형태로 사용자별 편집 횟수를 시각화합니다.
 */
export default function ContributionChart({
  stats,
  totalCount,
  isLoading,
  period,
  onPeriodChange
}: ContributionChartProps) {
  const maxCount = stats.length > 0 ? Math.max(...stats.map((s) => s.count)) : 1

  const periodLabels: Record<PeriodFilter, string> = {
    all: '전체',
    today: '오늘',
    week: '최근 7일'
  }

  if (isLoading) {
    return (
      <div className="p-4 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">유저별 기여도</h3>
        <div className="text-center text-gray-500 text-sm py-4">로딩 중...</div>
      </div>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="p-4 border-b bg-white">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">유저별 기여도</h3>
        <div className="text-center text-gray-500 text-sm py-4">
          기여 데이터가 없습니다.
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border-b bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">유저별 기여도</h3>
        <div className="flex gap-1">
          {(['all', 'today', 'week'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-2 py-1 text-xs rounded ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {stats.map((stat) => {
          const widthPercent = maxCount > 0 ? (stat.count / maxCount) * 100 : 0

          return (
            <div key={stat.userName} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{stat.userName}</span>
                <span className="text-gray-600">
                  {stat.count}회 ({stat.ratio.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full flex items-center justify-end pr-1"
                  style={{ width: `${widthPercent}%` }}
                >
                  {widthPercent > 20 && (
                    <span className="text-xs text-white font-medium">
                      {stat.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            총 {totalCount}건의 변경 이력
          </div>
        </div>
      )}
    </div>
  )
}

