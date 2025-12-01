import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 문서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await prisma.document.findUnique({
      where: {
        id: params.id
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        updatedAt: document.updatedAt.toISOString()
      }
    })
  } catch (error) {
    console.error('문서 조회 실패:', error)
    return NextResponse.json(
      { error: '문서를 불러올 수 없습니다.' },
      { status: 500 }
    )
  }
}

// 문서 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, content } = body

    const updateData: { title?: string; content?: string } = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content

    const document = await prisma.document.update({
      where: {
        id: params.id
      },
      data: updateData
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
    console.error('문서 업데이트 실패:', error)
    return NextResponse.json(
      { error: '문서를 업데이트할 수 없습니다.' },
      { status: 500 }
    )
  }
}

// 문서 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.document.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('문서 삭제 실패:', error)
    return NextResponse.json(
      { error: '문서를 삭제할 수 없습니다.' },
      { status: 500 }
    )
  }
}

