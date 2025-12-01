import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 문서 목록 조회
export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        updatedAt: doc.updatedAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('문서 목록 조회 실패:', error)
    return NextResponse.json(
      { error: '문서 목록을 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}

// 새 문서 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body

    const document = await prisma.document.create({
      data: {
        title: title || `새 문서 ${new Date().toLocaleString('ko-KR')}`,
        content: ''
      }
    })

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        updatedAt: document.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('문서 생성 실패:', error)
    return NextResponse.json(
      { error: '문서를 생성할 수 없습니다.' },
      { status: 500 }
    )
  }
}

