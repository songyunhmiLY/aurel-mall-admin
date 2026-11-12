import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { login as requestLogin, type LoginPayload } from '@/api/auth'
import { clearSession, readSession, writeSession } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const stored = readSession()
  const token = ref(stored.token)
  const username = ref(stored.username)
  const isAuthenticated = computed(() => token.value.length > 0)

  async function signIn(payload: LoginPayload): Promise<void> {
    const result = await requestLogin(payload)
    token.value = result.token
    username.value = result.username
    writeSession(result.token, result.username)
  }

  function signOut(): void {
    token.value = ''
    username.value = ''
    clearSession()
  }

  return {
    token,
    username,
    isAuthenticated,
    signIn,
    signOut,
  }
})
