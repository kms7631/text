'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Document {
  id: string
  title: string
  content: string
  updatedAt: string
}

export default function DocsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedNickname = localStorage.getItem('nickname')
    if (!savedNickname) {
      router.push('/')
      return
    }
    setNickname(savedNickname)
    loadDocuments()
  }, [router])

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('문서 목록 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDocument = async () => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `새 문서 ${new Date().toLocaleString('ko-KR')}`
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/docs/${data.document.id}`)
      }
    } catch (error) {
      console.error('문서 생성 실패:', error)
    }
  }

  const handleDeleteMode = () => {
    setIsDeleteMode(true)
  }

  const handleCancelDelete = () => {
    setIsDeleteMode(false)
  }

  const handleDeleteDocument = async (documentId: string, documentTitle: string) => {
    if (!confirm(`"${documentTitle}" 문서를 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // 문서 목록에서 제거
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
        setIsDeleteMode(false)
        alert('문서가 삭제되었습니다.')
      } else {
        alert('문서 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('문서 삭제 실패:', error)
      alert('문서 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleLogout = () => {
    if (confirm('로그아웃하시겠습니까? 새로운 이름으로 접속할 수 있습니다.')) {
      localStorage.removeItem('nickname')
      router.push('/')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">문서 목록</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {nickname && <span className="font-medium">{nickname}</span>}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="로그아웃"
            >
              로그아웃
            </button>
            {!isDeleteMode ? (
              <>
                <button
                  onClick={handleDeleteMode}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
                <button
                  onClick={handleCreateDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  새 문서 만들기
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
                <span className="text-sm text-red-600 font-medium">
                  삭제할 문서를 클릭하세요
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center text-gray-500 py-12">로딩 중...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">문서가 없습니다.</p>
            <button
              onClick={handleCreateDocument}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              첫 문서 만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  if (isDeleteMode) {
                    handleDeleteDocument(doc.id, doc.title)
                  } else {
                    router.push(`/docs/${doc.id}`)
                  }
                }}
                className={`block p-6 bg-white rounded-lg shadow transition-all border cursor-pointer ${
                  isDeleteMode
                    ? 'border-red-300 hover:border-red-500 hover:bg-red-50'
                    : 'border-gray-200 hover:shadow-md'
                }`}
              >
                <h2 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                  {doc.title}
                </h2>
                <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                  {doc.content || '내용이 없습니다.'}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(doc.updatedAt)}
                </p>
                {isDeleteMode && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <span className="text-sm text-red-600 font-medium">
                      클릭하여 삭제
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

