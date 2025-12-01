import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '실시간 협업 문서 편집기',
  description: 'Notion 스타일의 실시간 협업 문서 편집기',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

