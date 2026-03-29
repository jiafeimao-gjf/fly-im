import axios from 'axios'
import type { User, Contact, Message, TokenResponse, Room, RoomMember } from '@/types'

const API_BASE = '/api'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fly_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const api = {
  async register(username: string, password: string, displayName?: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/register', {
      username,
      password,
      display_name: displayName,
    })
    return response.data
  },

  async login(username: string, password: string): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/login', {
      username,
      password,
    })
    return response.data
  },

  async getUser(userId: string): Promise<User> {
    const response = await apiClient.get<User>(`/users/${userId}`)
    return response.data
  },

  async getContacts(userId: string): Promise<Contact[]> {
    const response = await apiClient.get<Contact[]>(`/users/${userId}/contacts`)
    return response.data
  },

  async addContact(userId: string, contactUsername: string): Promise<void> {
    await apiClient.post(`/users/${userId}/contacts`, {
      contact_username: contactUsername,
    })
  },

  async getMessages(userId: string, withUser: string, limit = 50, before?: number): Promise<Message[]> {
    const params = new URLSearchParams({ with: withUser, limit: String(limit) })
    if (before) {
      params.append('before', String(before))
    }
    const response = await apiClient.get<Message[]>(`/messages/${userId}?${params}`)
    return response.data
  },

  // Room APIs
  async getMyRooms(): Promise<Room[]> {
    const response = await apiClient.get<Room[]>('/rooms')
    return response.data
  },

  async createRoom(name: string): Promise<Room> {
    const response = await apiClient.post<Room>('/rooms', { name })
    return response.data
  },

  async getRoom(roomId: string): Promise<Room> {
    const response = await apiClient.get<Room>(`/rooms/${roomId}`)
    return response.data
  },

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const response = await apiClient.get<RoomMember[]>(`/rooms/${roomId}/members`)
    return response.data
  },

  async addRoomMember(roomId: string, username: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/members`, {
      contact_username: username,
    })
  },

  async removeRoomMember(roomId: string, userId: string): Promise<void> {
    await apiClient.delete(`/rooms/${roomId}/members/${userId}`)
  },

  async deleteRoom(roomId: string): Promise<void> {
    await apiClient.delete(`/rooms/${roomId}`)
  },

  async getRoomMessages(roomId: string, limit = 50, before?: number): Promise<Message[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (before) {
      params.append('before', String(before))
    }
    const response = await apiClient.get<Message[]>(`/rooms/${roomId}/messages?${params}`)
    return response.data
  },
}

export default api
