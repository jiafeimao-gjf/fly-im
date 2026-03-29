<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-xl font-bold">Admin Dashboard</h1>
        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-500">{{ adminStore.username }}</span>
          <button @click="handleLogout" class="text-sm text-gray-500 hover:text-gray-700">Logout</button>
        </div>
      </div>
    </header>

    <nav class="bg-white border-b border-gray-200">
      <div class="flex px-4">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          @click="currentTab = tab.name"
          :class="[
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px',
            currentTab === tab.name
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
        >
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <main class="p-4">
      <!-- Stats Cards -->
      <div v-if="currentTab === 'dashboard'" class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-2xl font-bold text-blue-500">{{ stats.users }}</div>
          <div class="text-sm text-gray-500">Users</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-2xl font-bold text-purple-500">{{ stats.rooms }}</div>
          <div class="text-sm text-gray-500">Rooms</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-2xl font-bold text-green-500">{{ stats.messages }}</div>
          <div class="text-sm text-gray-500">Messages</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-2xl font-bold text-orange-500">{{ stats.contacts }}</div>
          <div class="text-sm text-gray-500">Contacts</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-2xl font-bold text-teal-500">{{ stats.room_members }}</div>
          <div class="text-sm text-gray-500">Room Members</div>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-2xl font-bold text-red-500">{{ stats.online_users }}</div>
          <div class="text-sm text-gray-500">Online Now</div>
        </div>
      </div>

      <!-- Users Tab -->
      <div v-else-if="currentTab === 'users'">
        <UsersPanel />
      </div>

      <!-- Rooms Tab -->
      <div v-else-if="currentTab === 'rooms'">
        <RoomsPanel />
      </div>

      <!-- Messages Tab -->
      <div v-else-if="currentTab === 'messages'">
        <MessagesPanel />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin'
import type { AdminStats } from '@/services/adminApi'

const router = useRouter()
const adminStore = useAdminStore()

const UsersPanel = defineAsyncComponent(() => import('./AdminUsersPage.vue'))
const RoomsPanel = defineAsyncComponent(() => import('./AdminRoomsPage.vue'))
const MessagesPanel = defineAsyncComponent(() => import('./AdminMessagesPage.vue'))

const currentTab = ref('dashboard')

const tabs = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'users', label: 'Users' },
  { name: 'rooms', label: 'Rooms' },
  { name: 'messages', label: 'Messages' },
]

const stats = ref<AdminStats>({
  users: 0,
  rooms: 0,
  messages: 0,
  contacts: 0,
  room_members: 0,
  online_users: 0,
})

function handleLogout() {
  adminStore.logout()
  router.push('/admin/login')
}

onMounted(async () => {
  if (!adminStore.isLoggedIn) {
    router.push('/admin/login')
    return
  }
  try {
    const { adminApi } = await import('@/services/adminApi')
    stats.value = await adminApi.getStats()
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
})
</script>
