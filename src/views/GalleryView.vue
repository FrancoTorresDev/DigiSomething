<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useCardStore } from '@/stores/cardStore'
import CardGrid from '@/components/cards/CardGrid.vue'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import FilterBar from '@/components/filters/FilterBar.vue'
import type { DigimonCard } from '@/models/Card'

const cardStore = useCardStore()
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)

onMounted(() => {
  if (cardStore.allCards.length === 0) cardStore.fetchCards(1)
})

function onCardClick(card: DigimonCard): void {
  selectedCard.value = card
  showModal.value = true
}

function loadMore(): void {
  cardStore.fetchCards(cardStore.currentPage + 1)
}
</script>

<template>
  <div class="max-w-screen-2xl mx-auto px-4 py-10">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-white mb-1">Card Library</h1>
      <p class="text-gray-400">Browse and discover all Digimon cards</p>
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <FilterBar />
    </div>

    <!-- Initial loading -->
    <div v-if="cardStore.loading && cardStore.allCards.length === 0" class="flex justify-center py-28">
      <div class="w-12 h-12 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error state -->
    <div v-else-if="cardStore.error" class="text-center py-28">
      <p class="text-gray-400 mb-4">{{ cardStore.error }}</p>
      <button
        @click="cardStore.fetchCards(1)"
        class="text-sm text-blue-400 hover:underline"
      >
        Retry
      </button>
    </div>

    <template v-else>
      <p class="text-sm text-gray-500 mb-4">
        Showing {{ cardStore.filteredCards.length }}
        card{{ cardStore.filteredCards.length !== 1 ? 's' : '' }}
        of {{ cardStore.allCards.length }} loaded
      </p>

      <CardGrid :cards="cardStore.filteredCards" @card-click="onCardClick" />

      <!-- Load more -->
      <div v-if="cardStore.hasMore" class="flex justify-center mt-12">
        <button
          @click="loadMore"
          :disabled="cardStore.loading"
          class="bg-gray-800 hover:bg-gray-700 text-white text-sm px-10 py-3 rounded-xl border border-gray-700 transition-colors disabled:opacity-50"
        >
          {{ cardStore.loading ? 'Loading…' : 'Load More' }}
        </button>
      </div>
    </template>

    <CardDetailModal
      :card="selectedCard"
      :visible="showModal"
      @close="showModal = false"
      @add-to-deck="showModal = false"
    />
  </div>
</template>
