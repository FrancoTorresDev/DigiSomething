<script setup lang="ts">
import { useDeckStore } from '@/stores/deckStore'
import { useDeckValidator } from '@/composables/useDeckValidator'
import { useAuthStore } from '@/stores/authStore'
import DeckSlot from './DeckSlot.vue'

const deck = useDeckStore()
const auth = useAuthStore()
const { isValid, validationMessages, totalCards } = useDeckValidator()
</script>

<template>
  <div class="bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-gray-800 shrink-0">
      <input
        v-model="deck.activeDeck.name"
        class="w-full bg-transparent text-white font-semibold text-base border-b border-transparent hover:border-gray-700 focus:border-blue-500 outline-none transition-colors pb-0.5"
        placeholder="Deck name..."
      />
      <p
        class="text-sm mt-1.5 tabular-nums transition-colors"
        :class="totalCards === 50 ? 'text-green-400' : 'text-gray-400'"
      >
        {{ totalCards }} / 50 cards
        <span v-if="isValid" class="ml-1">✓</span>
      </p>
    </div>

    <!-- Card slots -->
    <div class="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
      <DeckSlot
        v-for="entry in deck.activeDeck.cards"
        :key="entry.card.cardnumber"
        :entry="entry"
        @increment="deck.addCard(entry.card)"
        @decrement="deck.removeCard(entry.card.cardnumber)"
      />
      <p
        v-if="deck.activeDeck.cards.length === 0"
        class="text-center text-gray-600 text-sm py-10"
      >
        Click cards to add them
      </p>
    </div>

    <!-- Validation messages -->
    <ul v-if="validationMessages.length" class="px-4 pb-2 space-y-1 shrink-0">
      <li v-for="msg in validationMessages" :key="msg" class="text-xs text-yellow-500">
        ⚠ {{ msg }}
      </li>
    </ul>

    <!-- Actions -->
    <div class="p-4 border-t border-gray-800 space-y-3 shrink-0">
      <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer w-fit">
        <input v-model="deck.activeDeck.isPublic" type="checkbox" class="accent-blue-500" />
        Make Public
      </label>
      <div class="flex gap-2">
        <button
          @click="deck.saveDeck()"
          :disabled="!auth.isLoggedIn || deck.loading"
          class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
        >
          {{ deck.loading ? 'Saving…' : 'Save Deck' }}
        </button>
        <button
          @click="deck.clearDeck()"
          class="px-3 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
      <p v-if="!auth.isLoggedIn" class="text-xs text-yellow-500 text-center">
        Sign in to save decks
      </p>
    </div>
  </div>
</template>
