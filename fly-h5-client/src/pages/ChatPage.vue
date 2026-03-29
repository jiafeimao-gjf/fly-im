<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <header class="bg-white shadow">
      <div class="flex items-center px-4 py-3">
        <div>
          <div class="font-bold">{{ contact?.display_name || contact?.username }}</div>
          <div class="text-sm text-gray-500">
            @{{ contact?.username }}
            <span v-if="contact?.online" class="text-green-500 ml-1">Online</span>
          </div>
        </div>
      </div>
    </header>

    <main ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div v-if="loadingMessages" class="text-center text-gray-500 py-4">Loading...</div>
      <div v-else-if="currentMessages.length === 0" class="text-center text-gray-500 py-8">
        No messages yet. Say hi!
      </div>
      <template v-else>
        <div
          v-for="msg in currentMessages"
          :key="msg.id"
          :class="[
            'max-w-[80%] rounded-lg px-4 py-2',
            msg.from_user_id === authStore.user?.id
              ? 'bg-blue-500 text-white ml-auto'
              : 'bg-white'
          ]"
        >
          <div>{{ msg.content }}</div>
          <div
            :class="[
              'text-xs mt-1',
              msg.from_user_id === authStore.user?.id ? 'text-blue-100' : 'text-gray-400'
            ]"
          >
            {{ formatTime(msg.timestamp) }}
          </div>
        </div>
      </template>
      <div
        v-if="isTyping"
        :class="[
          'max-w-[80%] rounded-lg px-4 py-2 bg-gray-200',
        ]"
      >
        <span class="text-gray-500 text-sm">{{ contact?.username }} is typing...</span>
      </div>
    </main>

    <footer class="bg-white border-t border-gray-200 p-3">
      <form @submit.prevent="handleSend" class="flex gap-2">
        <input
          v-model="messageText"
          type="text"
          placeholder="Type a message..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          @input="handleTyping"
        />
        <button
          type="submit"
          :disabled="!messageText.trim() || !wsManager"
          class="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { getWsManager, createWsManager, type WsManager } from '@/services/wsManager'
import type { WSMessage } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const messagesContainer = ref<HTMLElement | null>(null)
const messageText = ref('')
const loadingMessages = ref(false)
const isTyping = ref(false)
const wsManager = ref<WsManager | null>(null)
const pendingAcks = ref<Set<string>>(new Set())

const contact = computed(() => {
  const userId = route.params.userId as string
  return chatStore.contacts.find((c) => c.id === userId)
})

const currentMessages = computed(() => {
  const userId = authStore.user?.id
  const contactId = route.params.userId as string
  if (!userId || !contactId) return []
  return chatStore.messages[`${userId}-${contactId}`] || []
})

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function handleTyping() {
  if (wsManager.value && contact.value) {
    wsManager.value.sendTyping(contact.value.id)
  }
}

async function handleSend() {
  if (!messageText.value.trim() || !wsManager.value || !contact.value) return

  const id = crypto.randomUUID()
  chatStore.addMessage({
    id,
    from_user_id: authStore.user.id,
    to_user_id: contact.value.id,
    content: messageText.value,
    timestamp: Date.now(),
  })
  pendingAcks.value.add(id)
  wsManager.value.sendMessage(contact.value.id, messageText.value, id)
  messageText.value = ''
  scrollToBottom()
}

onMounted(async () => {
  if (!authStore.user) {
    router.push('/login')
    return
  }

  const userId = authStore.user.id
  const contactId = route.params.userId as string

  // Load message history
  loadingMessages.value = true
  try {
    await chatStore.loadMessages(userId, contactId)
    scrollToBottom()
  } finally {
    loadingMessages.value = false
  }

  // Use global WebSocket Manager
  let manager = getWsManager()

  if (!manager || manager.getStatus() !== 'connected') {
    const wsUrl = chatStore.currentWsUrl || `ws://${window.location.host}/ws`
    manager = createWsManager(
      { url: wsUrl, token: authStore.token! },
      {
        onMessage: (msg: WSMessage) => {
          if (msg.type === 'message' && msg.from === contactId) {
            chatStore.addMessage({
              id: msg.id!,
              from_user_id: msg.from!,
              to_user_id: userId,
              content: msg.content!,
              timestamp: msg.timestamp!,
            })
            scrollToBottom()
          }
        },
        onAuthAck: (result) => {
          if (!result.ok) {
            console.error('Auth failed:', result.error)
          }
        },
        onAck: (messageId) => {
          pendingAcks.value.delete(messageId)
        },
        onTyping: (from) => {
          if (from === contactId) {
            isTyping.value = true
            setTimeout(() => {
              isTyping.value = false
            }, 3000)
          }
        },
        onPresence: (userId, online) => {
          chatStore.updateContactPresence(userId, online)
        },
      }
    )
    manager.connect()
  }

  wsManager.value = manager
})

onUnmounted(() => {
  // Don't disconnect - other pages may be using it
  wsManager.value = null
})
</script>
