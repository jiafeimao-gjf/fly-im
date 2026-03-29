<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <main class="flex-1 pb-14">
      <router-view />
    </main>
    <TabBar v-show="showTabBar" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import TabBar from './TabBar.vue'

const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

const tabRouteNames = ['chats', 'contacts', 'rooms']

const showTabBar = computed(() => {
  return tabRouteNames.includes(route.name as string)
})

onMounted(async () => {
  if (authStore.user) {
    await chatStore.loadContacts(authStore.user.id)
    await chatStore.loadRooms()
    // Load messages for all contacts and rooms
    await Promise.all(
      chatStore.contacts.map((c) => chatStore.loadMessages(authStore.user!.id, c.id))
    )
    await Promise.all(
      chatStore.rooms.map((r) => chatStore.loadRoomMessages(r.id))
    )
  }
})
</script>
