import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Contact, Message, Room, RoomMember } from '@/types'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'

export const useChatStore = defineStore('chat', () => {
  // Auth store for user context
  const authStore = useAuthStore()

  // Existing state
  const contacts = ref<Contact[]>([])
  const messages = ref<Record<string, Message[]>>({})
  const currentWsUrl = ref<string>('')
  const typingUsers = ref<Set<string>>(new Set())

  // Room state
  const rooms = ref<Room[]>([])
  const roomMembers = ref<Record<string, RoomMember[]>>({})
  const currentRoomId = ref<string | null>(null)
  const roomMessages = ref<Record<string, Message[]>>({})

  // Last activity for conversations (userId -> timestamp)
  const lastActivity = ref<Record<string, number>>({})

  // Contact methods
  async function loadContacts(userId: string): Promise<void> {
    contacts.value = await api.getContacts(userId)
  }

  async function addContact(userId: string, contactUsername: string): Promise<void> {
    await api.addContact(userId, contactUsername)
    await loadContacts(userId)
  }

  // Message methods
  async function loadMessages(userId: string, withUser: string): Promise<Message[]> {
    const msgs = await api.getMessages(userId, withUser)
    messages.value[`${userId}-${withUser}`] = msgs
    messages.value[`${withUser}-${userId}`] = msgs
    return msgs
  }

  function addMessage(msg: Message): void {
    const key = `${msg.from_user_id}-${msg.to_user_id}`
    if (!messages.value[key]) {
      messages.value[key] = []
    }
    if (!messages.value[key].find((m) => m.id === msg.id)) {
      messages.value[key].push(msg)
    }
    const reverseKey = `${msg.to_user_id}-${msg.from_user_id}`
    if (!messages.value[reverseKey]) {
      messages.value[reverseKey] = []
    }
    if (!messages.value[reverseKey].find((m) => m.id === msg.id)) {
      messages.value[reverseKey].push(msg)
    }
    // Update last activity
    if (msg.timestamp) {
      const contactId = msg.from_user_id === authStore.user?.id ? msg.to_user_id : msg.from_user_id
      if (contactId) {
        lastActivity.value[contactId] = msg.timestamp
      }
    }
  }

  function setTyping(userId: string): void {
    typingUsers.value.add(userId)
    setTimeout(() => {
      typingUsers.value.delete(userId)
    }, 3000)
  }

  function updateContactPresence(userId: string, online: boolean): void {
    const contact = contacts.value.find((c) => c.id === userId)
    if (contact) {
      contact.online = online
    }
  }

  // Room methods
  async function loadRooms(): Promise<void> {
    rooms.value = await api.getMyRooms()
  }

  async function createRoom(name: string): Promise<Room> {
    const room = await api.createRoom(name)
    rooms.value.push(room)
    return room
  }

  async function loadRoomMembers(roomId: string): Promise<RoomMember[]> {
    const members = await api.getRoomMembers(roomId)
    roomMembers.value[roomId] = members
    return members
  }

  async function addRoomMember(roomId: string, username: string): Promise<void> {
    await api.addRoomMember(roomId, username)
    await loadRoomMembers(roomId)
  }

  async function removeRoomMember(roomId: string, userId: string): Promise<void> {
    await api.removeRoomMember(roomId, userId)
    if (roomMembers.value[roomId]) {
      roomMembers.value[roomId] = roomMembers.value[roomId].filter(
        (m) => m.user_id !== userId
      )
    }
  }

  async function deleteRoom(roomId: string): Promise<void> {
    await api.deleteRoom(roomId)
    rooms.value = rooms.value.filter((r) => r.id !== roomId)
    delete roomMembers.value[roomId]
    delete roomMessages.value[roomId]
  }

  async function loadRoomMessages(roomId: string): Promise<Message[]> {
    const msgs = await api.getRoomMessages(roomId)
    roomMessages.value[roomId] = msgs
    return msgs
  }

  function addRoomMessage(msg: Message): void {
    if (!msg.room_id) return
    if (!roomMessages.value[msg.room_id]) {
      roomMessages.value[msg.room_id] = []
    }
    if (!roomMessages.value[msg.room_id].find((m) => m.id === msg.id)) {
      roomMessages.value[msg.room_id].push(msg)
    }
    // Update last activity for room
    if (msg.timestamp && msg.room_id) {
      lastActivity.value[`room-${msg.room_id}`] = msg.timestamp
    }
  }

  function updateRoomMemberPresence(roomId: string, userId: string, online: boolean): void {
    const members = roomMembers.value[roomId]
    if (members) {
      const member = members.find((m) => m.user_id === userId)
      if (member) {
        member.online = online
      }
    }
  }

  function setCurrentRoom(roomId: string | null): void {
    currentRoomId.value = roomId
  }

  return {
    // Existing
    contacts,
    messages,
    currentWsUrl,
    typingUsers,
    loadContacts,
    addContact,
    loadMessages,
    addMessage,
    setTyping,
    updateContactPresence,
    // Room
    rooms,
    roomMembers,
    currentRoomId,
    roomMessages,
    lastActivity,
    loadRooms,
    createRoom,
    loadRoomMembers,
    addRoomMember,
    removeRoomMember,
    deleteRoom,
    loadRoomMessages,
    addRoomMessage,
    updateRoomMemberPresence,
    setCurrentRoom,
  }
})
