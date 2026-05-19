<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCardStore } from '@/stores/cardStore'
import { useDeckStore } from '@/stores/deckStore'
import CardGrid from '@/components/cards/CardGrid.vue'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import FilterBar from '@/components/filters/FilterBar.vue'
import DeckList from '@/components/deck/DeckList.vue'
import type { DigimonCard } from '@/models/Card'

const cardStore = useCardStore()
const deckStore = useDeckStore()
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)

onMounted(() => {
  if (cardStore.allCards.length === 0) cardStore.fetchCards(1)
})

function onCardClick(card: DigimonCard): void {
  selectedCard.value = card
  showModal.value = true
}

function addToDeck(card: DigimonCard): void {
  deckStore.addCard(card)
  showModal.value = false
}
</script>

<template>
  <div class="max-w-screen-2xl mx-auto px-4 py-10">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-white mb-1">Deck Builder</h1>
      <p class="text-gray-400">Click a card to view it, then add it to your deck</p>
    </div>

    <div class="flex gap-6 items-start">
      <!-- Left: card browser -->
      <div class="flex-1 min-w-0">
        <div class="mb-4">
          <FilterBar />
        </div>

        <div
          v-if="cardStore.loading && cardStore.allCards.length === 0"
          class="flex justify-center py-28"
        >
          <div
            class="w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"
          />
        </div>

        <CardGrid
          v-else
          :cards="cardStore.filteredCards"
          :selectable="true"
          @card-click="onCardClick"
        />

        <div v-if="cardStore.hasMore" class="flex justify-center mt-10">
          <button
            @click="cardStore.fetchCards(cardStore.currentPage + 1)"
            :disabled="cardStore.loading"
            class="bg-gray-800 hover:bg-gray-700 text-white text-sm px-10 py-3 rounded-xl border border-gray-700 transition-colors disabled:opacity-50"
          >
            {{ cardStore.loading ? 'Loading…' : 'Load More' }}
          </button>
        </div>
      </div>

      <!-- Right: deck panel -->
      <div class="w-72 shrink-0 sticky top-20" style="height: calc(100vh - 5.5rem)">
        <DeckList />
      </div>
    </div>

    <CardDetailModal
      :card="selectedCard"
      :visible="showModal"
      @close="showModal = false"
      @add-to-deck="addToDeck"
    />
  </div>
</template>
