<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="px-4 py-3">
        <h1 class="text-xl font-bold">Contacts</h1>
      </div>
    </header>

    <div class="p-4">
      <!-- Add Contact Form -->
      <div class="mb-4 bg-white rounded-lg shadow p-4">
        <div class="flex gap-2">
          <input
            v-model="newContactUsername"
            type="text"
            placeholder="Username to add"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            @click="handleAddContact"
            :disabled="addingContact"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {{ addingContact ? '...' : 'Add' }}
          </button>
        </div>
        <p v-if="addContactError" class="mt-2 text-sm text-red-500">{{ addContactError }}</p>
      </div>

      <!-- Contacts List -->
      <div class="bg-white rounded-lg shadow">
        <div v-if="contacts.length === 0" class="p-8 text-center text-gray-500">
          No contacts yet. Add someone to start chatting!
        </div>
        <div v-else>
          <div
            v-for="contact in contacts"
            :key="contact.id"
            @click="goToChat(contact.id)"
            class="flex items-center px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
          >
            <div class="relative">
              <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
                {{ contact.display_name?.[0] || contact.username[0] }}
              </div>
              <span
                v-if="contact.online"
                class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
              />
            </div>
            <div class="ml-3 flex-1">
              <div class="font-medium">{{ contact.display_name || contact.username }}</div>
              <div class="text-sm text-gray-500">@{{ contact.username }}</div>
            </div>
            <span
              :class="[
                'text-xs px-2 py-1 rounded',
                contact.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              ]"
            >
              {{ contact.online ? 'Online' : 'Offline' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()

const newContactUsername = ref('')
const addingContact = ref(false)
const addContactError = ref('')

const contacts = computed(() => chatStore.contacts)

function goToChat(userId: string) {
  router.push({ name: 'chat', params: { userId } })
}

async function handleAddContact() {
  if (!authStore.user || !newContactUsername.value.trim()) return
  addingContact.value = true
  addContactError.value = ''
  try {
    await chatStore.addContact(authStore.user.id, newContactUsername.value.trim())
    newContactUsername.value = ''
  } catch (e) {
    addContactError.value = 'Failed to add contact'
  } finally {
    addingContact.value = false
  }
}
</script>
