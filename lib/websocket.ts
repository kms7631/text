import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import type { Collaborator } from './types'

// 문서별 방(room) 관리
const documentRooms = new Map<string, Map<string, Collaborator>>()

// 사용자별 색상 생성 (간단한 해시 기반)
function getUserColor(userName: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e'
  ]
  let hash = 0
  for (let i = 0; i < userName.length; i++) {
    hash = userName.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Socket.IO 서버 초기화
export function initializeSocketIO(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log('클라이언트 연결:', socket.id)

    // 문서에 참여
    socket.on('join_document', async ({ documentId, userName }: { documentId: string; userName: string }) => {
      socket.join(documentId)

      // 방에 사용자 추가
      if (!documentRooms.has(documentId)) {
        documentRooms.set(documentId, new Map())
      }
      const room = documentRooms.get(documentId)!

      const collaborator: Collaborator = {
        id: socket.id,
        name: userName,
        color: getUserColor(userName),
        isEditing: false
      }

      room.set(socket.id, collaborator)

      // 모든 클라이언트에 참여 알림
      io.to(documentId).emit('collaborator_joined', {
        type: 'collaborator_joined',
        collaborator,
        collaborators: Array.from(room.values())
      })

      console.log(`${userName}이(가) 문서 ${documentId}에 참여했습니다.`)
    })

    // 문서에서 나가기
    socket.on('leave_document', ({ documentId }: { documentId: string }) => {
      socket.leave(documentId)

      const room = documentRooms.get(documentId)
      if (room) {
        const collaborator = room.get(socket.id)
        room.delete(socket.id)

        if (collaborator) {
          io.to(documentId).emit('collaborator_left', {
            type: 'collaborator_left',
            collaboratorId: socket.id,
            collaborators: Array.from(room.values())
          })
        }

        // 방이 비면 삭제
        if (room.size === 0) {
          documentRooms.delete(documentId)
        }
      }
    })

    // 편집 시작
    socket.on('start_editing', ({ documentId }: { documentId: string }) => {
      const room = documentRooms.get(documentId)
      if (room) {
        const collaborator = room.get(socket.id)
        if (collaborator) {
          collaborator.isEditing = true
          io.to(documentId).emit('collaborator_editing', {
            type: 'collaborator_editing',
            collaboratorId: socket.id,
            isEditing: true
          })
        }
      }
    })

    // 편집 중지
    socket.on('stop_editing', ({ documentId }: { documentId: string }) => {
      const room = documentRooms.get(documentId)
      if (room) {
        const collaborator = room.get(socket.id)
        if (collaborator) {
          collaborator.isEditing = false
          io.to(documentId).emit('collaborator_editing', {
            type: 'collaborator_editing',
            collaboratorId: socket.id,
            isEditing: false
          })
        }
      }
    })

    // 문서 업데이트
    socket.on('update_document', ({ documentId, content }: { documentId: string; content: string }) => {
      // 같은 방의 다른 클라이언트들에게만 브로드캐스트
      socket.to(documentId).emit('document_updated', {
        type: 'document_updated',
        documentId,
        content,
        updatedBy: documentRooms.get(documentId)?.get(socket.id)?.name || '알 수 없음'
      })
    })

    // 편집 로그 생성
    socket.on('create_edit_log', async ({ documentId, userName, lineNumber, summary }: {
      documentId: string
      userName: string
      lineNumber: number
      summary: string
    }) => {
      const { prisma } = await import('./prisma')
      
      try {
        const editLog = await prisma.editLog.create({
          data: {
            documentId,
            userName,
            lineNumber,
            summary
          }
        })

        // 같은 방의 모든 클라이언트에게 브로드캐스트
        io.to(documentId).emit('edit_log_created', {
          type: 'edit_log_created',
          editLog: {
            id: editLog.id,
            documentId: editLog.documentId,
            userName: editLog.userName,
            lineNumber: editLog.lineNumber,
            summary: editLog.summary,
            createdAt: editLog.createdAt
          }
        })
      } catch (error) {
        console.error('편집 로그 생성 실패:', error)
      }
    })

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('클라이언트 연결 해제:', socket.id)

      // 모든 방에서 사용자 제거
      for (const [documentId, room] of documentRooms.entries()) {
        if (room.has(socket.id)) {
          room.delete(socket.id)
          io.to(documentId).emit('collaborator_left', {
            type: 'collaborator_left',
            collaboratorId: socket.id,
            collaborators: Array.from(room.values())
          })

          if (room.size === 0) {
            documentRooms.delete(documentId)
          }
        }
      }
    })
  })

  return io
}

