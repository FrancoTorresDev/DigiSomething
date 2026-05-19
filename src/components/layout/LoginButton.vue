<script setup lang="ts">
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
</script>

<template>
  <div class="flex items-center gap-3">
    <template v-if="auth.isLoggedIn">
      <img
        v-if="auth.photoURL"
        :src="auth.photoURL"
        :alt="auth.displayName"
        referrerpolicy="no-referrer"
        class="w-8 h-8 rounded-full border border-gray-600"
      />
      <span class="hidden sm:block text-sm text-gray-300 max-w-28 truncate">
        {{ auth.displayName }}
      </span>
      <button
        @click="auth.logout()"
        class="text-sm text-gray-400 hover:text-white px-3 py-1.5 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors"
      >
        Sign Out
      </button>
    </template>

    <button
      v-else
      @click="auth.login()"
      class="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
    >
      <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 0 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"
        />
      </svg>
      Sign in with Google
    </button>
  </div>
</template>
