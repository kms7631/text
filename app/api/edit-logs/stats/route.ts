import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 유저별 기여도 통계 API
 * 특정 문서의 EditLog를 사용자별로 집계하여 반환합니다.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get('documentId')
    const period = searchParams.get('period') || 'all' // all, today, week

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 기간 필터 설정
    let dateFilter: { gte?: Date } | {} = {}
    if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      dateFilter = { gte: today }
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)
      dateFilter = { gte: weekAgo }
    }

    // EditLog 조회 및 사용자별 집계
    const editLogs = await prisma.editLog.findMany({
      where: {
        documentId,
        ...(Object.keys(dateFilter).length > 0 && {
          createdAt: dateFilter
        })
      },
      select: {
        userName: true
      }
    })

    // 사용자별 개수 집계
    const userStats = editLogs.reduce(
      (acc, log) => {
        if (!acc[log.userName]) {
          acc[log.userName] = 0
        }
        acc[log.userName]++
        return acc
      },
      {} as Record<string, number>
    )

    // 배열로 변환 및 정렬
    const stats = Object.entries(userStats)
      .map(([userName, count]) => ({
        userName,
        count
      }))
      .sort((a, b) => b.count - a.count)

    // 전체 개수 계산
    const totalCount = editLogs.length

    // 비율 계산
    const statsWithRatio = stats.map((stat) => ({
      ...stat,
      ratio: totalCount > 0 ? (stat.count / totalCount) * 100 : 0
    }))

    return NextResponse.json({
      stats: statsWithRatio,
      totalCount,
      period
    })
  } catch (error) {
    console.error('기여도 통계 조회 실패:', error)
    return NextResponse.json(
      { error: '기여도 통계를 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}

