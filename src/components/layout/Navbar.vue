<script setup lang="ts">
import { RouterLink } from 'vue-router'
import LoginButton from './LoginButton.vue'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
</script>

<template>
  <nav
    class="fixed top-0 inset-x-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 h-16 flex items-center px-6 gap-8"
  >
    <RouterLink to="/" class="text-xl font-bold text-yellow-400 shrink-0">
      DigiSomething
    </RouterLink>

    <div class="flex items-center gap-6 flex-1 overflow-x-auto">
      <RouterLink
        to="/"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
        :end="true"
      >
        News
      </RouterLink>
      <RouterLink
        to="/gallery"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
      >
        Card Gallery
      </RouterLink>
      <RouterLink
        to="/deck-builder"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
      >
        Deck Builder
      </RouterLink>
      <RouterLink
        to="/meta"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
      >
        Meta
      </RouterLink>
      <RouterLink
        v-if="auth.isLoggedIn"
        to="/profile"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
      >
        My Decks
      </RouterLink>
    </div>

    <LoginButton class="shrink-0" />
  </nav>
</template>
