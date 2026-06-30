<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCardStore } from '@/stores/cardStore'
import CardGrid from '@/components/cards/CardGrid.vue'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import FilterBar from '@/components/filters/FilterBar.vue'
import AdSlot from '@/components/ads/AdSlot.vue'
import type { DigimonCard } from '@/models/Card'

const cardStore = useCardStore()
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)
const INITIAL_DISPLAY = 36
const LOAD_MORE_STEP = 36
const displayCount = ref(INITIAL_DISPLAY)
const topAdSlot = import.meta.env.VITE_ADSENSE_SLOT_GALLERY_TOP ?? ''
const inlineAdSlot = import.meta.env.VITE_ADSENSE_SLOT_GALLERY_INLINE ?? ''

const visibleCards = computed(() => cardStore.filteredCards.slice(0, displayCount.value))
const hasLocalMore = computed(() => displayCount.value < cardStore.filteredCards.length)

watch(() => cardStore.filteredCards, () => {
  displayCount.value = INITIAL_DISPLAY
})

onMounted(() => {
  if (cardStore.allCards.length === 0) cardStore.fetchCards(1)
})

function onCardClick(card: DigimonCard): void {
  selectedCard.value = card
  showModal.value = true
}

function loadMore(): void {
  displayCount.value += LOAD_MORE_STEP
  if (displayCount.value >= cardStore.filteredCards.length - LOAD_MORE_STEP && cardStore.hasMore && !cardStore.loading) {
    cardStore.fetchCards(cardStore.currentPage + 1)
  }
}
</script>

<template>
  <div class="max-w-screen-2xl mx-auto px-3 sm:px-4 py-4 sm:py-10">
    <!-- Page header -->
    <div class="mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-ds-soft-white mb-1">Card Library</h1>
      <p class="text-sm sm:text-base text-ds-slate">Browse and discover all Digimon cards</p>
    </div>

    <!-- Filters -->
    <div class="mb-6">
      <FilterBar />
    </div>

    <div v-if="topAdSlot" class="mb-6">
      <AdSlot :slot="topAdSlot" />
    </div>

    <!-- Initial loading -->
    <div v-if="cardStore.loading && cardStore.allCards.length === 0" class="flex justify-center py-28">
      <div class="w-12 h-12 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error state -->
    <div v-else-if="cardStore.error" class="text-center py-28">
      <p class="text-ds-slate mb-4">{{ cardStore.error }}</p>
      <button
        @click="cardStore.fetchCards(1)"
        class="text-sm text-ds-cyan hover:underline"
      >
        Retry
      </button>
    </div>

    <template v-else>
      <p class="text-sm text-ds-slate/60 mb-4">
        Showing {{ visibleCards.length }}
        card{{ cardStore.filteredCards.length !== 1 ? 's' : '' }}
        of {{ cardStore.filteredCards.length }} matching filters
      </p>

      <CardGrid :cards="visibleCards" @card-click="onCardClick" />

      <div v-if="inlineAdSlot" class="mt-8">
        <AdSlot :slot="inlineAdSlot" />
      </div>

      <!-- Load more -->
      <div v-if="hasLocalMore || cardStore.hasMore" class="flex justify-center mt-10 sm:mt-12">
        <button
          @click="loadMore"
          :disabled="cardStore.loading"
          class="w-full sm:w-auto bg-ds-midnight hover:bg-ds-navy text-ds-soft-white text-sm px-6 sm:px-10 py-3 rounded-xl border border-ds-neon/30 transition-colors disabled:opacity-50"
        >
          {{ cardStore.loading ? 'Loading…' : 'Load More Cards' }}
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
