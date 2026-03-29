<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-4 w-80">
      <h3 class="font-bold mb-3">Create Room</h3>
      <input
        v-model="roomName"
        type="text"
        placeholder="Room name"
        class="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
        @keyup.enter="handleCreate"
      />
      <div class="flex gap-2">
        <button
          @click="handleCreate"
          :disabled="creating || !roomName.trim()"
          class="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
        >
          {{ creating ? '...' : 'Create' }}
        </button>
        <button
          @click="$emit('close')"
          class="flex-1 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const chatStore = useChatStore()

const roomName = ref('')
const creating = ref(false)

async function handleCreate() {
  if (!roomName.value.trim() || creating.value) return
  creating.value = true
  try {
    const room = await chatStore.createRoom(roomName.value.trim())
    roomName.value = ''
    emit('close')
    router.push({ name: 'room-chat', params: { roomId: room.id } })
  } catch (e) {
    console.error('Failed to create room:', e)
  } finally {
    creating.value = false
  }
}
</script>
