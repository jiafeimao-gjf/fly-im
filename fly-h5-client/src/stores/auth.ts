import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('fly_token'))

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function login(username: string, password: string): Promise<void> {
    const response = await api.login(username, password)
    token.value = response.access_token
    user.value = response.user
    localStorage.setItem('fly_token', response.access_token)
    localStorage.setItem('fly_user', JSON.stringify(response.user))
  }

  async function register(username: string, password: string, displayName?: string): Promise<void> {
    const response = await api.register(username, password, displayName)
    token.value = response.access_token
    user.value = response.user
    localStorage.setItem('fly_token', response.access_token)
    localStorage.setItem('fly_user', JSON.stringify(response.user))
  }

  function logout(): void {
    token.value = null
    user.value = null
    localStorage.removeItem('fly_token')
    localStorage.removeItem('fly_user')
  }

  function initFromStorage(): void {
    const storedToken = localStorage.getItem('fly_token')
    const storedUser = localStorage.getItem('fly_user')
    if (storedToken && storedUser) {
      token.value = storedToken
      try {
        user.value = JSON.parse(storedUser)
      } catch {
        logout()
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    register,
    logout,
    initFromStorage,
  }
})
