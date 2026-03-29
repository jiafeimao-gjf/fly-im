<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
    <div class="flex justify-around items-center h-14">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        @click="navigate(tab.name)"
        :class="[
          'flex flex-col items-center justify-center flex-1 h-full transition-colors',
          isActive(tab.name) ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
        ]"
      >
        <component :is="tab.icon" class="w-5 h-5 mb-0.5" />
        <span class="text-xs">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Inline SVG icons — defined before tabs to avoid TDZ
const ChatIcon = {
  render() {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
      'stroke-width': 2,
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      }),
    ])
  },
}

const ContactsIcon = {
  render() {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
      'stroke-width': 2,
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      }),
    ])
  },
}

const RoomsIcon = {
  render() {
    return h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
      'stroke-width': 2,
    }, [
      h('path', {
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        d: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
      }),
    ])
  },
}

const tabs = [
  {
    name: 'chats',
    label: 'Chats',
    icon: ChatIcon,
  },
  {
    name: 'contacts',
    label: 'Contacts',
    icon: ContactsIcon,
  },
  {
    name: 'rooms',
    label: 'Rooms',
    icon: RoomsIcon,
  },
]

function isActive(name: string): boolean {
  return route.name === name
}

function navigate(name: string) {
  router.push({ name })
}
</script>
