import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 편집 로그 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.editLog.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('편집 로그 삭제 실패:', error)
    return NextResponse.json(
      { error: '편집 로그를 삭제할 수 없습니다.' },
      { status: 500 }
    )
  }
}

