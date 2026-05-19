<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useMetaStore } from '@/stores/metaStore'
import { useAuthStore } from '@/stores/authStore'
import { updateDeck } from '@/services/deckService'
import type { Deck } from '@/models/Deck'

const meta = useMetaStore()
const auth = useAuthStore()
const voting = ref(new Set<string>())

onMounted(() => meta.fetchMeta())

async function vote(deck: Deck): Promise<void> {
  if (!auth.isLoggedIn || !deck.id || voting.value.has(deck.id)) return
  voting.value.add(deck.id)
  try {
    await updateDeck(deck.id, { votes: (deck.votes || 0) + 1 })
    await meta.fetchMeta()
  } finally {
    voting.value.delete(deck.id)
  }
}

const COLOR_BADGE: Record<string, string> = {
  Red: 'bg-red-950 text-red-300 border border-red-800',
  Blue: 'bg-blue-950 text-blue-300 border border-blue-800',
  Yellow: 'bg-yellow-950 text-yellow-300 border border-yellow-800',
  Green: 'bg-green-950 text-green-300 border border-green-800',
  Black: 'bg-gray-800 text-gray-300 border border-gray-700',
  Purple: 'bg-purple-950 text-purple-300 border border-purple-800',
  White: 'bg-gray-700 text-white border border-gray-600'
}
</script>

<template>
  <div class="max-w-screen-xl mx-auto px-4 py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-1">Meta Decks</h1>
      <p class="text-gray-400">Top community-voted public decks</p>
    </div>

    <!-- Loading -->
    <div v-if="meta.loading" class="flex justify-center py-28">
      <div class="w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="meta.error" class="text-center py-28 text-gray-500">
      <p>{{ meta.error }}</p>
      <button @click="meta.fetchMeta()" class="mt-3 text-sm text-blue-400 hover:underline">
        Retry
      </button>
    </div>

    <!-- Empty -->
    <div v-else-if="meta.topDecks.length === 0" class="text-center py-28">
      <p class="text-gray-500 mb-2">No public decks yet.</p>
      <p class="text-sm text-gray-600">
        Build a deck in the
        <RouterLink to="/deck-builder" class="text-blue-400 hover:underline">Deck Builder</RouterLink>
        and make it public!
      </p>
    </div>

    <!-- Deck grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <div
        v-for="(deck, i) in meta.topDecks"
        :key="deck.id"
        class="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors"
      >
        <div class="flex items-start justify-between mb-3">
          <span class="text-2xl font-black text-gray-700 leading-none">#{{ i + 1 }}</span>
          <button
            @click="vote(deck)"
            :disabled="!auth.isLoggedIn || voting.has(deck.id)"
            class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :title="!auth.isLoggedIn ? 'Sign in to vote' : 'Upvote'"
          >
            ▲ {{ deck.votes || 0 }}
          </button>
        </div>

        <h3 class="text-white font-semibold text-lg truncate mb-0.5">{{ deck.name }}</h3>
        <p v-if="deck.ownerName" class="text-sm text-gray-500 mb-3">by {{ deck.ownerName }}</p>

        <div class="flex flex-wrap gap-1 mb-4">
          <span
            v-for="entry in deck.cards.slice(0, 5)"
            :key="entry.card.cardnumber"
            class="text-[11px] px-2 py-0.5 rounded-full"
            :class="COLOR_BADGE[entry.card.color] ?? 'bg-gray-800 text-gray-300 border border-gray-700'"
          >
            {{ entry.card.name }}
          </span>
          <span v-if="deck.cards.length > 5" class="text-[11px] text-gray-600 self-center">
            +{{ deck.cards.length - 5 }} more
          </span>
        </div>

        <p class="text-xs text-gray-600">
          {{ deck.cards.reduce((s, c) => s + c.quantity, 0) }} cards
        </p>
      </div>
    </div>
  </div>
</template>
