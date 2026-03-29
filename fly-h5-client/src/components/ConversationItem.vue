<template>
  <div
    class="flex items-center px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
    @click="navigate"
  >
    <div class="relative">
      <div
        :class="[
          'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white',
          type === 'room' ? 'bg-purple-500' : 'bg-blue-500'
        ]"
      >
        {{ avatarText[0] }}
      </div>
      <span
        v-if="showOnlineIndicator"
        class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
      />
    </div>
    <div class="ml-3 flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5">
          <span class="font-medium truncate">{{ title }}</span>
          <span
            v-if="type === 'room'"
            class="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 flex-shrink-0"
          >群</span>
          <span
            v-else
            class="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 flex-shrink-0"
          >私</span>
        </div>
        <div class="text-xs text-gray-400 ml-2 flex-shrink-0">{{ formattedTime }}</div>
      </div>
      <div class="text-sm text-gray-500 truncate">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  type: 'user' | 'room'
  id: string
  title: string
  subtitle: string
  avatarText: string
  lastMessageTime?: number
  online?: boolean
}>()

const router = useRouter()

const showOnlineIndicator = computed(() => {
  return props.type === 'user' && props.online
})

const formattedTime = computed(() => {
  if (!props.lastMessageTime) return ''
  const date = new Date(props.lastMessageTime)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
})

function navigate() {
  if (props.type === 'room') {
    router.push({ name: 'room-chat', params: { roomId: props.id } })
  } else {
    router.push({ name: 'chat', params: { userId: props.id } })
  }
}
</script>
