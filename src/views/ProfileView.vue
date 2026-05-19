<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useDeckStore } from '@/stores/deckStore'
import { useAuthStore } from '@/stores/authStore'
import { updateDeck } from '@/services/deckService'

const deckStore = useDeckStore()
const auth = useAuthStore()

onMounted(() => deckStore.loadUserDecks())

async function togglePublic(deckId: string, current: boolean): Promise<void> {
  await updateDeck(deckId, { isPublic: !current })
  await deckStore.loadUserDecks()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-10">
    <!-- User header -->
    <div class="flex items-center gap-4 mb-10">
      <img
        v-if="auth.photoURL"
        :src="auth.photoURL"
        :alt="auth.displayName"
        referrerpolicy="no-referrer"
        class="w-16 h-16 rounded-full border-2 border-gray-700"
      />
      <div>
        <h1 class="text-2xl font-bold text-white">{{ auth.displayName }}</h1>
        <p class="text-sm text-gray-400">My Saved Decks</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="deckStore.loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty state -->
    <div v-else-if="deckStore.userDecks.length === 0" class="text-center py-16">
      <p class="text-gray-500 mb-3">No saved decks yet</p>
      <RouterLink
        to="/deck-builder"
        class="text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        Go build one →
      </RouterLink>
    </div>

    <!-- Deck list -->
    <div v-else class="space-y-3">
      <div
        v-for="deck in deckStore.userDecks"
        :key="deck.id"
        class="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-gray-700 transition-colors"
      >
        <div class="min-w-0">
          <h3 class="text-white font-semibold truncate">{{ deck.name }}</h3>
          <p class="text-sm text-gray-500 mt-0.5">
            {{ deck.cards.reduce((s, c) => s + c.quantity, 0) }} cards ·
            <span :class="deck.isPublic ? 'text-green-400' : 'text-gray-500'">
              {{ deck.isPublic ? '🌐 Public' : '🔒 Private' }}
            </span>
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            @click="togglePublic(deck.id, deck.isPublic)"
            class="text-xs px-3 py-1.5 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            {{ deck.isPublic ? 'Make Private' : 'Make Public' }}
          </button>
          <RouterLink
            to="/deck-builder"
            class="text-xs px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-400 border border-blue-900 rounded-lg transition-colors"
            @click="deckStore.loadDeck(deck)"
          >
            Edit
          </RouterLink>
          <button
            @click="deckStore.deleteDeck(deck.id)"
            class="text-xs px-3 py-1.5 text-red-400 hover:text-red-300 border border-gray-700 hover:border-red-900 rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
