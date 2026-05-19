import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import { signInWithGoogle, signOut, onAuthChange } from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => user.value !== null)
  const displayName = computed(() => user.value?.displayName ?? '')
  const photoURL = computed(() => user.value?.photoURL ?? '')

  function init(): () => void {
    const unsubscribe = onAuthChange((firebaseUser) => {
      user.value = firebaseUser
      loading.value = false
    })
    return unsubscribe
  }

  async function login(): Promise<void> {
    await signInWithGoogle()
  }

  async function logout(): Promise<void> {
    await signOut()
    user.value = null
  }

  return { user, loading, isLoggedIn, displayName, photoURL, init, login, logout }
})
