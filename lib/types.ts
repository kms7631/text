// WebSocket 이벤트 타입 정의

export interface Collaborator {
  id: string
  name: string
  color: string
  isEditing: boolean
}

export interface CollaboratorJoinedEvent {
  type: 'collaborator_joined'
  collaborator: Collaborator
  collaborators: Collaborator[]
}

export interface CollaboratorLeftEvent {
  type: 'collaborator_left'
  collaboratorId: string
  collaborators: Collaborator[]
}

export interface CollaboratorEditingEvent {
  type: 'collaborator_editing'
  collaboratorId: string
  isEditing: boolean
}

export interface DocumentUpdatedEvent {
  type: 'document_updated'
  documentId: string
  content: string
  updatedBy: string
}

export interface EditLogCreatedEvent {
  type: 'edit_log_created'
  editLog: {
    id: string
    documentId: string
    userName: string
    lineNumber: number
    summary: string
    createdAt: Date
  }
}

export type SocketEvent =
  | CollaboratorJoinedEvent
  | CollaboratorLeftEvent
  | CollaboratorEditingEvent
  | DocumentUpdatedEvent
  | EditLogCreatedEvent

export interface ClientToServerEvents {
  join_document: (data: { documentId: string; userName: string }) => void
  leave_document: (data: { documentId: string }) => void
  start_editing: (data: { documentId: string }) => void
  stop_editing: (data: { documentId: string }) => void
  update_document: (data: { documentId: string; content: string }) => void
  create_edit_log: (data: {
    documentId: string
    userName: string
    lineNumber: number
    summary: string
  }) => void
}

export interface ServerToClientEvents {
  collaborator_joined: (event: CollaboratorJoinedEvent) => void
  collaborator_left: (event: CollaboratorLeftEvent) => void
  collaborator_editing: (event: CollaboratorEditingEvent) => void
  document_updated: (event: DocumentUpdatedEvent) => void
  edit_log_created: (event: EditLogCreatedEvent) => void
}

