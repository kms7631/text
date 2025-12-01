'use client'

import type { Collaborator } from '@/lib/types'

interface UserListProps {
  collaborators: Collaborator[]
  currentUserName: string
}

export default function UserList({ collaborators, currentUserName }: UserListProps) {
  const editingUsers = collaborators.filter((c) => c.isEditing && c.name !== currentUserName)

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">접속 중:</span>
        <div className="flex items-center gap-2">
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border"
              style={{ borderColor: collaborator.color }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: collaborator.color }}
              />
              <span className="text-sm text-gray-700">{collaborator.name}</span>
              {collaborator.name === currentUserName && (
                <span className="text-xs text-gray-500">(나)</span>
              )}
            </div>
          ))}
        </div>
      </div>
      {editingUsers.length > 0 && (
        <div className="text-sm text-gray-600">
          {editingUsers.map((user, idx) => (
            <span key={user.id}>
              {idx > 0 && ', '}
              <span className="font-medium" style={{ color: user.color }}>
                {user.name}
              </span>
            </span>
          ))}
          님이 편집 중...
        </div>
      )}
    </div>
  )
}

