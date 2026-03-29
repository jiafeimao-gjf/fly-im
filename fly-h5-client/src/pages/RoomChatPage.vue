<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <header class="bg-white shadow">
      <div class="flex items-center px-4 py-3">
        <div>
          <div class="font-bold">{{ room?.name }}</div>
          <div class="text-sm text-gray-500">
            {{ memberCount }} members
          </div>
        </div>
        <button
          @click="showMembers = !showMembers"
          class="ml-auto px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Members
        </button>
      </div>
    </header>

    <!-- Members sidebar -->
    <div
      v-if="showMembers"
      class="absolute right-0 top-0 h-full w-64 bg-white shadow-lg z-10 overflow-y-auto"
    >
      <div class="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 class="font-bold">Members</h2>
        <button @click="showMembers = false" class="text-gray-500">&times;</button>
      </div>
      <div class="p-2">
        <div
          v-for="member in members"
          :key="member.user_id"
          class="flex items-center px-3 py-2 hover:bg-gray-50"
        >
          <div class="relative">
            <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
              {{ member.user?.display_name?.[0] || member.user?.username?.[0] }}
            </div>
            <span
              v-if="member.online"
              class="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white"
            />
          </div>
          <div class="ml-2 flex-1">
            <div class="text-sm font-medium">
              {{ member.user?.display_name || member.user?.username }}
            </div>
            <div class="text-xs text-gray-500">{{ member.role }}</div>
          </div>
          <button
            v-if="canRemoveMember(member)"
            @click="handleRemoveMember(member.user_id)"
            class="text-red-500 text-sm hover:text-red-700"
          >
            Remove
          </button>
        </div>
        <button
          @click="showAddMember = true"
          class="w-full mt-2 px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
        >
          Add Member
        </button>
      </div>
    </div>

    <!-- Add member modal -->
    <div v-if="showAddMember" class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div class="bg-white rounded-lg p-4 w-80">
        <h3 class="font-bold mb-3">Add Member</h3>
        <input
          v-model="newMemberUsername"
          type="text"
          placeholder="Username"
          class="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div class="flex gap-2">
          <button
            @click="handleAddMember"
            class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add
          </button>
          <button
            @click="showAddMember = false"
            class="flex-1 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <main ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
      <div v-if="loadingMessages" class="text-center text-gray-500 py-4">Loading...</div>
      <div v-else-if="currentMessages.length === 0" class="text-center text-gray-500 py-8">
        No messages yet. Start the conversation!
      </div>
      <template v-else>
        <div
          v-for="msg in currentMessages"
          :key="msg.id"
          class="flex"
          :class="msg.from_user_id === authStore.user?.id ? 'justify-end' : 'justify-start'"
        >
          <div
            :class="[
              'max-w-[80%] rounded-lg px-4 py-2',
              msg.from_user_id === authStore.user?.id
                ? 'bg-purple-500 text-white'
                : 'bg-white'
            ]"
          >
            <div v-if="msg.from_user_id !== authStore.user?.id" class="text-xs text-blue-500 mb-1">
              {{ getMemberName(msg.from_user_id) }}
            </div>
            <div>{{ msg.content }}</div>
            <div
              :class="[
                'text-xs mt-1',
                msg.from_user_id === authStore.user?.id ? 'text-purple-200' : 'text-gray-400'
              ]"
            >
              {{ formatTime(msg.timestamp) }}
            </div>
          </div>
        </div>
      </template>
    </main>

    <footer class="bg-white border-t border-gray-200 p-3">
      <form @submit.prevent="handleSend" class="flex gap-2">
        <input
          v-model="messageText"
          type="text"
          placeholder="Type a message..."
          class="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
          @input="handleTyping"
        />
        <button
          type="submit"
          :disabled="!messageText.trim() || !wsManager"
          class="px-6 py-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 disabled:opacity-50"
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
const showMembers = ref(false)
const showAddMember = ref(false)
const newMemberUsername = ref('')
const wsManager = ref<WsManager | null>(null)
const pendingAcks = ref<Set<string>>(new Set())

const roomId = computed(() => route.params.roomId as string)
const room = computed(() => chatStore.rooms.find((r) => r.id === roomId.value))
const members = computed(() => chatStore.roomMembers[roomId.value] || [])
const memberCount = computed(() => members.value.length)
const currentMessages = computed(() => chatStore.roomMessages[roomId.value] || [])

const isOwner = computed(() => room.value?.created_by === authStore.user?.id)
const canRemove = computed(() => isOwner.value)

function getMemberName(userId: string): string {
  const member = members.value.find((m) => m.user_id === userId)
  return member?.user?.display_name || member?.user?.username || 'Unknown'
}

function canRemoveMember(member: { user_id: string; role: string }): boolean {
  if (!canRemove.value) return false
  if (member.role === 'owner') return false
  return true
}

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
  if (wsManager.value) {
    wsManager.value.sendTyping('', roomId.value)
  }
}

async function handleSend() {
  if (!messageText.value.trim() || !wsManager.value) return

  const id = crypto.randomUUID()
  pendingAcks.value.add(id)
  wsManager.value.sendRoomMessage(roomId.value, messageText.value, id)
  messageText.value = ''
  scrollToBottom()
}

async function handleAddMember() {
  if (!newMemberUsername.value.trim()) return
  try {
    await chatStore.addRoomMember(roomId.value, newMemberUsername.value.trim())
    newMemberUsername.value = ''
    showAddMember.value = false
  } catch (e) {
    console.error('Failed to add member:', e)
  }
}

async function handleRemoveMember(userId: string) {
  if (!confirm('Remove this member?')) return
  try {
    await chatStore.removeRoomMember(roomId.value, userId)
  } catch (e) {
    console.error('Failed to remove member:', e)
  }
}

onMounted(async () => {
  if (!authStore.user) {
    router.push('/login')
    return
  }

  loadingMessages.value = true
  try {
    await chatStore.loadRooms()
    if (!chatStore.rooms.find((r) => r.id === roomId.value)) {
      router.push('/rooms')
      return
    }
    await chatStore.loadRoomMembers(roomId.value)
    await chatStore.loadRoomMessages(roomId.value)
    scrollToBottom()
  } finally {
    loadingMessages.value = false
  }

  let manager = getWsManager()

  if (!manager || manager.getStatus() !== 'connected') {
    const wsUrl = chatStore.currentWsUrl || `ws://${window.location.host}/ws`
    manager = createWsManager(
      { url: wsUrl, token: authStore.token! },
      {
        onAuthAck: (result) => {
          if (result.ok) {
            manager?.joinRoom(roomId.value)
          }
        },
        onRoomMessage: (msg: WSMessage) => {
          if (msg.room_id === roomId.value && msg.from && msg.content) {
            chatStore.addRoomMessage({
              id: msg.id!,
              from_user_id: msg.from,
              to_user_id: '',
              room_id: msg.room_id!,
              content: msg.content,
              timestamp: msg.timestamp!,
            })
            scrollToBottom()
          }
        },
        onRoomMemberJoined: (rid: string, userId: string) => {
          if (rid === roomId.value) {
            chatStore.loadRoomMembers(rid)
          }
        },
        onRoomMemberLeft: (rid: string, userId: string) => {
          if (rid === roomId.value) {
            chatStore.updateRoomMemberPresence(rid, userId, false)
          }
        },
        onAck: (messageId) => {
          pendingAcks.value.delete(messageId)
        },
      }
    )
    manager.connect()
  } else {
    manager.joinRoom(roomId.value)
  }

  wsManager.value = manager
})

onUnmounted(() => {
  if (wsManager.value) {
    wsManager.value.leaveRoom(roomId.value)
  }
})
</script>
