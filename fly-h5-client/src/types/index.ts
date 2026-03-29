export interface User {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
}

export interface Contact extends User {
  online: boolean
}

export interface Message {
  id: string
  from_user_id: string
  to_user_id?: string
  room_id?: string
  content: string
  timestamp: number
  delivered_at?: number
  read_at?: number
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface WSMessage {
  type: string
  id?: string
  token?: string
  from?: string
  to?: string
  room_id?: string
  content?: string
  timestamp?: number
  ok?: boolean
  error?: string
  userId?: string
  online?: boolean
  metadata?: Record<string, unknown>
}

export interface Room {
  id: string
  name: string
  avatar_url?: string
  created_by: string
  created_at: number
}

export interface RoomMember {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: number
  user?: User
  online?: boolean
}
