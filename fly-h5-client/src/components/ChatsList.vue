<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-xl font-bold">Chats</h1>
        <button @click="handleLogout" class="text-sm text-gray-500 hover:text-gray-700">Logout</button>
      </div>
    </header>

    <div class="bg-white rounded-lg shadow mx-4 mt-4">
      <div v-if="conversations.length === 0" class="p-8 text-center text-gray-500">
        No conversations yet. Start chatting with a contact or join a room!
      </div>
      <div v-else>
        <ConversationItem
          v-for="conv in conversations"
          :key="conv.key"
          :type="conv.type"
          :id="conv.id"
          :title="conv.title"
          :subtitle="conv.subtitle"
          :avatarText="conv.avatarText"
          :lastMessageTime="conv.lastMessageTime"
          :online="conv.online"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import ConversationItem from './ConversationItem.vue'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

interface Conversation {
  key: string
  type: 'user' | 'room'
  id: string
  title: string
  subtitle: string
  avatarText: string
  lastMessageTime?: number
  online?: boolean
}

const conversations = computed<Conversation[]>(() => {
  const userId = authStore.user?.id
  if (!userId) return []

  const convs: Conversation[] = []

  // Add 1-on-1 conversations
  for (const contact of chatStore.contacts) {
    const msgs = chatStore.messages[`${userId}-${contact.id}`]
    const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined
    const lastAct = chatStore.lastActivity[contact.id]
    convs.push({
      key: `user-${contact.id}`,
      type: 'user',
      id: contact.id,
      title: contact.display_name || contact.username,
      subtitle: lastMsg?.content || 'No messages yet',
      avatarText: contact.display_name?.[0] || contact.username[0],
      lastMessageTime: lastAct || lastMsg?.timestamp,
      online: contact.online,
    })
  }

  // Add room conversations
  for (const room of chatStore.rooms) {
    const msgs = chatStore.roomMessages[room.id]
    const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined
    const lastAct = chatStore.lastActivity[`room-${room.id}`]
    convs.push({
      key: `room-${room.id}`,
      type: 'room',
      id: room.id,
      title: room.name,
      subtitle: lastMsg?.content || 'No messages yet',
      avatarText: room.name[0],
      lastMessageTime: lastAct || lastMsg?.timestamp,
    })
  }

  // Sort by last message time, most recent first
  convs.sort((a, b) => {
    const timeA = a.lastMessageTime || 0
    const timeB = b.lastMessageTime || 0
    return timeB - timeA
  })

  return convs
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>
