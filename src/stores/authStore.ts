import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from 'firebase/auth'
import { signInWithGoogle, signOut, onAuthChange } from '@/services/authService'
import type { UserProfile } from '@/models/User'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(true)

  const isLoggedIn = computed(() => user.value !== null)
  const displayName = computed(() => user.value?.displayName ?? '')
  const photoURL = computed(() => user.value?.photoURL ?? '')

  const profile = computed<UserProfile | null>(() => {
    if (!user.value) return null
    return {
      uid: user.value.uid,
      displayName: user.value.displayName ?? '',
      photoURL: user.value.photoURL ?? '',
      email: user.value.email ?? ''
    }
  })

  function init(): () => void {
    const unsubscribe = onAuthChange((firebaseUser) => {
      user.value = firebaseUser
      loading.value = false
    })
    return unsubscribe
  }

  async function login(): Promise<void> {
    const firebaseUser = await signInWithGoogle()
    user.value = firebaseUser
  }

  async function logout(): Promise<void> {
    await signOut()
    user.value = null
  }

  return { user, loading, isLoggedIn, displayName, photoURL, profile, init, login, logout }
})
