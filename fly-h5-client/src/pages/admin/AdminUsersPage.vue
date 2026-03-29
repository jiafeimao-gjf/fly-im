<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-medium">Users ({{ total }})</h2>
      <div class="flex gap-2">
        <button
          @click="prevPage"
          :disabled="offset === 0"
          class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >Prev</button>
        <span class="text-sm text-gray-500 self-center">Showing {{ offset + 1 }}-{{ Math.min(offset + limit, total) }}</span>
        <button
          @click="nextPage"
          :disabled="offset + limit >= total"
          class="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >Next</button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Username</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Display Name</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-500">Created</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
            <td class="px-4 py-2 text-sm">{{ user.username }}</td>
            <td class="px-4 py-2 text-sm">{{ user.display_name || '-' }}</td>
            <td class="px-4 py-2 text-sm text-gray-500">{{ formatDate(user.created_at) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="loading" class="p-4 text-center text-gray-500">Loading...</div>
      <div v-else-if="users.length === 0" class="p-4 text-center text-gray-500">No users found</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type UserSummary } from '@/services/adminApi'

const users = ref<UserSummary[]>([])
const total = ref(0)
const limit = 50
const offset = ref(0)
const loading = ref(false)

async function loadUsers() {
  loading.value = true
  try {
    const data = await adminApi.getUsers(limit, offset.value)
    users.value = data.users
    total.value = data.total
  } catch (e) {
    console.error('Failed to load users:', e)
  } finally {
    loading.value = false
  }
}

function prevPage() {
  offset.value = Math.max(0, offset.value - limit)
  loadUsers()
}

function nextPage() {
  offset.value += limit
  loadUsers()
}

function formatDate(ts: number): string {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString()
}

onMounted(loadUsers)
</script>
