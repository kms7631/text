// Socket.IO API 라우트는 커스텀 서버에서 처리됩니다.
// 이 파일은 Next.js App Router와의 호환성을 위한 플레이스홀더입니다.

export async function GET() {
  return new Response('Socket.IO는 커스텀 서버에서 처리됩니다.', { status: 200 })
}

