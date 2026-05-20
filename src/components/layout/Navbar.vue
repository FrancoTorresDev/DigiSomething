<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LoginButton from './LoginButton.vue'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
const route = useRoute()
const deckOpen = ref(false)

const deckRoutes = ['/deck-builder', '/profile']
const deckActive = () => deckRoutes.some(r => route.path.startsWith(r))
</script>

<template>
  <nav
    class="fixed top-0 inset-x-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800 h-16 flex items-center px-6 gap-8"
  >
    <RouterLink to="/gallery" class="text-xl font-bold text-yellow-400 shrink-0">
      DigiSomething
    </RouterLink>

    <div class="flex items-center gap-6 flex-1">
      <RouterLink
        to="/news"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
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

      <!-- Decks dropdown -->
      <div class="relative" @mouseenter="deckOpen = true" @mouseleave="deckOpen = false">
        <button
          class="flex items-center gap-1 text-sm transition-colors whitespace-nowrap"
          :class="deckActive() ? 'text-white' : 'text-gray-400 hover:text-white'"
        >
          Decks
          <svg class="w-3 h-3 transition-transform" :class="deckOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition name="dropdown">
          <div
            v-if="deckOpen"
            class="absolute left-0 top-full mt-1 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <RouterLink
              to="/deck-builder"
              class="flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors group"
              @click="deckOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-white">Deck Builder</p>
                <p class="text-xs text-gray-500">Build and edit your decks.</p>
              </div>
            </RouterLink>

            <RouterLink
              v-if="auth.isLoggedIn"
              to="/profile"
              class="flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors group"
              @click="deckOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-white">My Decks</p>
                <p class="text-xs text-gray-500">View your personal decks.</p>
              </div>
            </RouterLink>
          </div>
        </Transition>
      </div>

      <RouterLink
        to="/meta"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
      >
        Meta
      </RouterLink>
      <RouterLink
        to="/tournament"
        class="text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
        active-class="text-white"
      >
        Tournament
      </RouterLink>
    </div>

    <LoginButton class="shrink-0" />
  </nav>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
