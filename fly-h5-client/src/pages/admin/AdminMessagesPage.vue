<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-medium">Recent Messages ({{ messages.length }})</h2>
      <button
        @click="loadMessages"
        :disabled="loading"
        class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
      >Refresh</button>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Type</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">From</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">To / Room</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500 w-full">Content</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Time</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="msg in messages" :key="msg.id" class="hover:bg-gray-50">
            <td class="px-4 py-2 text-sm">
              <span
                :class="[
                  'text-xs px-2 py-0.5 rounded',
                  msg.room_id ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                ]"
              >
                {{ msg.room_id ? 'Room' : 'Private' }}
              </span>
            </td>
            <td class="px-4 py-2 text-sm text-gray-600">{{ msg.from_user_id }}</td>
            <td class="px-4 py-2 text-sm text-gray-600">{{ msg.room_id || msg.to_user_id || '-' }}</td>
            <td class="px-4 py-2 text-sm truncate max-w-xs">{{ msg.content }}</td>
            <td class="px-4 py-2 text-sm text-gray-500 whitespace-nowrap">{{ formatTime(msg.timestamp) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="p-4 text-center text-gray-500">Loading...</div>
      <div v-else-if="messages.length === 0" class="p-4 text-center text-gray-500">No messages found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type MessageSummary } from '@/services/adminApi'

const messages = ref<MessageSummary[]>([])
const loading = ref(false)

async function loadMessages() {
  loading.value = true
  try {
    const data = await adminApi.getRecentMessages(50)
    messages.value = data.messages
  } catch (e) {
    console.error('Failed to load messages:', e)
  } finally {
    loading.value = false
  }
}

function formatTime(ts: number): string {
  if (!ts) return '-'
  return new Date(ts / 1000).toLocaleString()
}

onMounted(loadMessages)
</script>
