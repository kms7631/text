'use client'

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import { useDocumentSync } from '@/lib/hooks/useDocumentSync'
import { useTimeline } from '@/lib/hooks/useTimeline'
import type { Socket } from 'socket.io-client'

export interface DocumentEditorRef {
  createLog: () => void
}

interface DocumentEditorProps {
  documentId: string
  initialContent: string
  userName: string
  socket: Socket | null
  onContentChange?: (content: string) => void
  scrollToLine?: number | null
  readOnly?: boolean
  autoLog?: boolean // 자동 변경 이력 생성 여부
  onCreateLog?: () => void // 수동으로 변경 이력 생성하는 함수
}

const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({
  documentId,
  initialContent,
  userName,
  socket,
  onContentChange,
  scrollToLine,
  readOnly = false,
  autoLog = false,
  onCreateLog
}, ref) => {
  const [content, setContent] = useState(initialContent)
  const prevContentRef = useRef<string>(initialContent) // 이전 내용 저장
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastEditLogTimeRef = useRef<number>(0)
  const lastEditLogLineRef = useRef<number>(1)

  const { updateDocument } = useDocumentSync({
    documentId,
    socket,
    onContentUpdate: (newContent) => {
      setContent(newContent)
      if (onContentChange) {
        onContentChange(newContent)
      }
    }
  })

  const { createEditLog } = useTimeline({
    documentId,
    socket,
    enabled: true
  })

  // 초기 내용 설정
  useEffect(() => {
    setContent(initialContent)
    prevContentRef.current = initialContent
  }, [initialContent])

  // 줄 번호 계산
  const getLineNumber = useCallback((position: number): number => {
    if (!textareaRef.current) return 1
    const textBeforeCursor = content.substring(0, position)
    return textBeforeCursor.split('\n').length
  }, [content])

  // 변경 내용 감지 및 요약 생성
  const getSummary = useCallback((position: number, lineNumber: number, prevContent: string, currentContent: string): { summary: string; isDeletion: boolean; lineNumber: number } => {
    const prevLines = prevContent.split('\n')
    const currentLines = currentContent.split('\n')
    
    // 삭제 감지: 이전 줄 수가 현재 줄 수보다 많으면 삭제
    if (prevLines.length > currentLines.length) {
      // 삭제된 줄 찾기
      for (let i = 0; i < prevLines.length; i++) {
        if (i >= currentLines.length || prevLines[i] !== currentLines[i]) {
          // 삭제된 줄 발견
          const deletedLine = prevLines[i]?.trim() || ''
          const nextLine = i < currentLines.length ? currentLines[i]?.trim() : ''
          
          if (deletedLine) {
            // 기존 내용과 삭제 후 내용을 구분자로 구분하여 저장
            // 형식: "기존내용|||삭제후내용"
            const summary = nextLine 
              ? `${deletedLine.substring(0, 100)}|||${nextLine.substring(0, 100)}`
              : `${deletedLine.substring(0, 100)}|||`
            
            return {
              summary,
              isDeletion: true,
              lineNumber: i + 1
            }
          }
        }
      }
    }
    
    // 추가 또는 수정 감지
    const targetLineIndex = lineNumber - 1
    
    if (targetLineIndex >= 0 && targetLineIndex < currentLines.length) {
      const targetLine = currentLines[targetLineIndex].trim()
      if (targetLine) {
        return {
          summary: targetLine.substring(0, 100),
          isDeletion: false,
          lineNumber: lineNumber
        }
      }
    }
    
    // 기본값: 커서 위치 주변 텍스트
    const start = Math.max(0, position - 30)
    const end = Math.min(currentContent.length, position + 30)
    return {
      summary: currentContent.substring(start, end).replace(/\n/g, ' ').trim().substring(0, 100),
      isDeletion: false,
      lineNumber: lineNumber
    }
  }, [])

  // 편집 로그 생성 (디바운스)
  const handleEditLog = useCallback((position: number, force: boolean = false) => {
    // autoLog가 false이고 강제 생성이 아니면 무시
    if (!autoLog && !force) {
      return
    }

    const now = Date.now()
    const prevContent = prevContentRef.current
    const currentContent = content
    
    // 내용이 변경되지 않았으면 무시
    if (prevContent === currentContent && !force) {
      return
    }

    const lineNumber = getLineNumber(position)
    const changeInfo = getSummary(position, lineNumber, prevContent, currentContent)

    // 같은 줄에서 짧은 시간 내 여러 수정이 있으면 무시 (삭제나 강제 생성은 항상 기록)
    if (
      !changeInfo.isDeletion &&
      !force &&
      now - lastEditLogTimeRef.current < 3000 &&
      lineNumber === lastEditLogLineRef.current
    ) {
      return
    }

    lastEditLogTimeRef.current = now
    lastEditLogLineRef.current = changeInfo.lineNumber

    if (changeInfo.summary) {
      createEditLog(userName, changeInfo.lineNumber, changeInfo.summary)
      // 이전 내용 업데이트
      prevContentRef.current = currentContent
    }
  }, [getLineNumber, getSummary, createEditLog, userName, content, autoLog])

  // 외부에서 호출할 수 있는 수동 로그 생성 함수
  useEffect(() => {
    if (onCreateLog) {
      // onCreateLog가 변경될 때마다 함수를 업데이트
      // 실제로는 ref를 통해 전달하는 것이 더 나을 수 있지만,
      // 간단하게 처리하기 위해 이 방식 사용
    }
  }, [onCreateLog])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return
    
    const newContent = e.target.value
    const prevContent = prevContentRef.current
    
    // autoLog가 활성화된 경우에만 삭제 감지
    if (autoLog && newContent.length < prevContent.length) {
      const textarea = e.target
      const position = textarea.selectionStart
      
      // 삭제된 내용이 있으면 로그 생성
      setTimeout(() => {
        handleEditLog(position)
      }, 100)
    }
    
    setContent(newContent)
    prevContentRef.current = newContent
    updateDocument(newContent)

    if (onContentChange) {
      onContentChange(newContent)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return

    // autoLog가 활성화된 경우에만 자동 로그 생성
    if (autoLog && (e.key === 'Enter' || e.key === '.' || e.key === '。')) {
      setTimeout(() => {
        handleEditLog(textarea.selectionStart)
      }, 100)
    }
  }

  const handleBlur = () => {
    // autoLog가 비활성화되어 있으면 blur 시 로그 생성하지 않음
    // if (autoLog) {
    //   const textarea = textareaRef.current
    //   if (!textarea) return
    //   handleEditLog(textarea.selectionStart)
    // }
  }

  // 외부에서 호출할 수 있는 수동 로그 생성 함수를 ref로 노출
  const createLogManually = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    handleEditLog(textarea.selectionStart, true) // force = true
  }, [handleEditLog])

  // ref를 통해 부모 컴포넌트에 함수 노출
  useImperativeHandle(ref, () => ({
    createLog: createLogManually
  }), [createLogManually])

  // 타임라인 클릭 시 해당 줄로 스크롤
  useEffect(() => {
    if (scrollToLine !== null && scrollToLine !== undefined && textareaRef.current) {
      const textarea = textareaRef.current
      const lines = content.split('\n')
      const targetLineIndex = Math.max(0, scrollToLine - 1)
      
      // 해당 줄의 시작 위치 계산
      let position = 0
      for (let i = 0; i < targetLineIndex && i < lines.length; i++) {
        position += lines[i].length + 1 // +1은 줄바꿈 문자
      }

      // 스크롤 및 포커스
      textarea.focus()
      textarea.setSelectionRange(position, position)
      
      // 스크롤 위치 계산 (간단한 근사치)
      const lineHeight = 20 // 대략적인 줄 높이
      textarea.scrollTop = targetLineIndex * lineHeight

      // 하이라이트 효과
      const originalBg = textarea.style.backgroundColor
      textarea.style.backgroundColor = '#fef3c7'
      setTimeout(() => {
        textarea.style.backgroundColor = originalBg
      }, 2000)
    }
  }, [scrollToLine, content])

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      readOnly={readOnly}
      className={`w-full h-full p-6 text-gray-900 bg-white resize-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed ${
        readOnly ? 'cursor-default bg-gray-50' : ''
      }`}
      placeholder={readOnly ? '리플레이 모드 (읽기 전용)' : '문서 내용을 입력하세요...'}
    />
  )
})

DocumentEditor.displayName = 'DocumentEditor'

export default DocumentEditor

