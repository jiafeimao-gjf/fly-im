<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="flex items-center px-4 py-3">
        <button @click="goBack" class="mr-3 text-gray-500 hover:text-gray-700">
          &larr;
        </button>
        <h1 class="text-xl font-bold">Create Room</h1>
      </div>
    </header>

    <main class="p-4">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
          <input
            v-model="roomName"
            type="text"
            placeholder="Enter room name"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Add Members (optional)
          </label>
          <div class="flex gap-2">
            <input
              v-model="newMemberUsername"
              type="text"
              placeholder="Username to add"
              class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="addMember"
              :disabled="!newMemberUsername.trim()"
              class="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <div v-if="selectedMembers.length > 0" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="member in selectedMembers"
              :key="member"
              class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              @{{ member }}
              <button @click="removeMember(member)" class="ml-1 hover:text-blue-900">&times;</button>
            </span>
          </div>
        </div>

        <p v-if="error" class="mb-4 text-sm text-red-500">{{ error }}</p>

        <button
          @click="handleCreate"
          :disabled="!roomName.trim() || creating"
          class="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {{ creating ? 'Creating...' : 'Create Room' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const chatStore = useChatStore()

const roomName = ref('')
const newMemberUsername = ref('')
const selectedMembers = ref<string[]>([])
const creating = ref(false)
const error = ref('')

function goBack() {
  router.back()
}

function addMember() {
  const username = newMemberUsername.value.trim()
  if (username && !selectedMembers.value.includes(username)) {
    selectedMembers.value.push(username)
  }
  newMemberUsername.value = ''
}

function removeMember(username: string) {
  selectedMembers.value = selectedMembers.value.filter((u) => u !== username)
}

async function handleCreate() {
  if (!roomName.value.trim()) return

  creating.value = true
  error.value = ''

  try {
    const room = await chatStore.createRoom(roomName.value.trim())

    for (const username of selectedMembers.value) {
      try {
        await chatStore.addRoomMember(room.id, username)
      } catch {
        // Ignore failed member additions
      }
    }

    router.push(`/room/${room.id}`)
  } catch (e) {
    error.value = 'Failed to create room'
  } finally {
    creating.value = false
  }
}
</script>
