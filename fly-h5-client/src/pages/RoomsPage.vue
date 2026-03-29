<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center">
          <button @click="goBack" class="mr-3 text-gray-500 hover:text-gray-700">
            &larr;
          </button>
          <h1 class="text-xl font-bold">Rooms</h1>
        </div>
        <button
          @click="goToCreateRoom"
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Create Room
        </button>
      </div>
    </header>

    <main class="p-4">
      <div class="bg-white rounded-lg shadow">
        <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>
        <div v-else-if="rooms.length === 0" class="p-8 text-center text-gray-500">
          No rooms yet. Create one to start chatting!
        </div>
        <div v-else>
          <div
            v-for="room in rooms"
            :key="room.id"
            @click="goToRoom(room.id)"
            class="flex items-center px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
          >
            <div class="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
              {{ room.name[0] }}
            </div>
            <div class="ml-3 flex-1">
              <div class="font-medium">{{ room.name }}</div>
              <div class="text-sm text-gray-500">
                {{ getMemberCount(room.id) }} members
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const chatStore = useChatStore()
const loading = ref(true)

const rooms = computed(() => chatStore.rooms)

function getMemberCount(roomId: string): number {
  return chatStore.roomMembers[roomId]?.length || 0
}

function goBack() {
  router.push('/')
}

function goToCreateRoom() {
  router.push('/room/create')
}

function goToRoom(roomId: string) {
  router.push(`/room/${roomId}`)
}

onMounted(async () => {
  try {
    await chatStore.loadRooms()
    for (const room of chatStore.rooms) {
      await chatStore.loadRoomMembers(room.id)
    }
  } finally {
    loading.value = false
  }
})
</script>
