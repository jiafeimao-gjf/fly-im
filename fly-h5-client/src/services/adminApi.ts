import axios from 'axios'

const API_BASE = '/api'

const adminApiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fly_admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface AdminStats {
  users: number
  rooms: number
  messages: number
  contacts: number
  room_members: number
  online_users: number
}

export interface UserSummary {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  created_at: number
}

export interface RoomSummary {
  id: string
  name: string
  avatar_url: string | null
  created_by: string
  created_at: number
  member_count: number
}

export interface MessageSummary {
  id: string
  from_user_id: string
  to_user_id: string | null
  room_id: string | null
  content: string
  timestamp: number
}

export interface PaginatedUsers {
  total: number
  users: UserSummary[]
}

export interface PaginatedRooms {
  total: number
  rooms: RoomSummary[]
}

export interface PaginatedMessages {
  messages: MessageSummary[]
}

export const adminApi = {
  async login(username: string, password: string): Promise<{ access_token: string; username: string }> {
    const params = new URLSearchParams({ username, password })
    const response = await adminApiClient.post<{ access_token: string; token_type: string; username: string }>(
      `/admin/login?${params}`
    )
    return response.data
  },

  async getStats(): Promise<AdminStats> {
    const response = await adminApiClient.get<AdminStats>('/admin/stats')
    return response.data
  },

  async getUsers(limit = 50, offset = 0): Promise<PaginatedUsers> {
    const response = await adminApiClient.get<PaginatedUsers>('/admin/users', {
      params: { limit, offset },
    })
    return response.data
  },

  async getRooms(limit = 50, offset = 0): Promise<PaginatedRooms> {
    const response = await adminApiClient.get<PaginatedRooms>('/admin/rooms', {
      params: { limit, offset },
    })
    return response.data
  },

  async getRecentMessages(limit = 50): Promise<PaginatedMessages> {
    const response = await adminApiClient.get<PaginatedMessages>('/admin/messages/recent', {
      params: { limit },
    })
    return response.data
  },
}

export default adminApi
