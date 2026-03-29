import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import adminApi from '@/services/adminApi'

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string | null>(localStorage.getItem('fly_admin_token'))
  const username = ref<string | null>(localStorage.getItem('fly_admin_username'))

  const isLoggedIn = computed(() => !!token.value)

  async function login(user: string, pass: string): Promise<void> {
    const result = await adminApi.login(user, pass)
    token.value = result.access_token
    username.value = result.username
    localStorage.setItem('fly_admin_token', result.access_token)
    localStorage.setItem('fly_admin_username', result.username)
  }

  function logout(): void {
    token.value = null
    username.value = null
    localStorage.removeItem('fly_admin_token')
    localStorage.removeItem('fly_admin_username')
  }

  return {
    token,
    username,
    isLoggedIn,
    login,
    logout,
  }
})
