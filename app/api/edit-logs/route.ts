import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 편집 로그 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const documentId = searchParams.get('documentId')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId가 필요합니다.' },
        { status: 400 }
      )
    }

    const editLogs = await prisma.editLog.findMany({
      where: {
        documentId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return NextResponse.json({
      editLogs: editLogs.map((log) => ({
        id: log.id,
        documentId: log.documentId,
        userName: log.userName,
        lineNumber: log.lineNumber,
        summary: log.summary,
        createdAt: log.createdAt
      }))
    })
  } catch (error) {
    console.error('편집 로그 조회 실패:', error)
    return NextResponse.json(
      { error: '편집 로그를 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}

