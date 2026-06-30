<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useCardStore } from '@/stores/cardStore'
import { useDeckStore } from '@/stores/deckStore'
import CardGrid from '@/components/cards/CardGrid.vue'
import FilterBar from '@/components/filters/FilterBar.vue'
import DeckList from '@/components/deck/DeckList.vue'
import type { DigimonCard } from '@/models/Card'

const cardStore = useCardStore()
const deckStore = useDeckStore()

const INITIAL_DISPLAY = 30
const LOAD_MORE_STEP = 24
const displayCount = ref(INITIAL_DISPLAY)

type Tab = 'all' | 'eggs' | 'main'
const activeTab = ref<Tab>('all')
type MobilePanel = 'cards' | 'deck'
const mobilePanel = ref<MobilePanel>('cards')

const tabs: { key: Tab; label: string }[] = [
  { key: 'all',  label: 'All'       },
  { key: 'eggs', label: 'Eggs'      },
  { key: 'main', label: 'Main Deck' },
]

const tabCards = computed(() => {
  const base = cardStore.filteredCards
  if (activeTab.value === 'eggs') return base.filter((c) => c.type === 'Digi-Egg')
  if (activeTab.value === 'main') return base.filter((c) => c.type !== 'Digi-Egg')
  return base
})

const visibleCards = computed(() => tabCards.value.slice(0, displayCount.value))
const hasMoreVisible = computed(() => displayCount.value < tabCards.value.length || cardStore.hasMore)

// Reset display count when filters or tab change
watch(tabCards, () => { displayCount.value = INITIAL_DISPLAY })

function loadMore(): void {
  displayCount.value = Math.min(displayCount.value + LOAD_MORE_STEP, tabCards.value.length)
  // Fetch next API batch if we're running low on loaded cards
  if (displayCount.value >= tabCards.value.length - LOAD_MORE_STEP && cardStore.hasMore && !cardStore.loading) {
    cardStore.fetchCards(cardStore.currentPage + 1)
  }
}

const scrollContainer = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (cardStore.allCards.length === 0) cardStore.fetchCards(1)

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMoreVisible.value && !cardStore.loading) {
        loadMore()
      }
    },
    { root: scrollContainer.value, threshold: 0.1 }
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onUnmounted(() => {
  observer?.disconnect()
})

function onCardClick(card: DigimonCard): void {
  deckStore.addCard(card)
}
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-[calc(100svh-4rem)] md:h-[calc(100vh-4rem)] overflow-hidden">

    <!-- Mobile panel switcher (phones only) -->
    <div class="md:hidden flex shrink-0 border-b border-ds-neon/20 bg-ds-midnight">
      <button
        @click="mobilePanel = 'cards'"
        class="flex-1 py-3 text-sm font-medium transition-colors"
        :class="mobilePanel === 'cards' ? 'text-ds-gold border-b-2 border-ds-gold' : 'text-ds-slate'"
      >Card Library</button>
      <button
        @click="mobilePanel = 'deck'"
        class="flex-1 py-3 text-sm font-medium transition-colors relative"
        :class="mobilePanel === 'deck' ? 'text-ds-gold border-b-2 border-ds-gold' : 'text-ds-slate'"
      >
        My Deck
        <span v-if="deckStore.activeDeck.cards.length > 0" class="ml-1 text-xs text-ds-gold/60">({{ deckStore.activeDeck.cards.reduce((s, c) => s + c.quantity, 0) }})</span>
      </button>
    </div>

    <!-- Left: card library (60%) -->
    <div
      class="flex-1 flex flex-col min-w-0 overflow-hidden"
      :class="mobilePanel !== 'cards' ? 'hidden md:flex' : 'flex'"
    >

      <!-- Tab bar -->
      <div class="px-3 sm:px-5 pt-3 sm:pt-4 pb-0 shrink-0 flex items-center gap-2 border-b border-ds-neon/20 bg-ds-midnight overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 text-sm font-display font-medium rounded-t-lg transition-colors -mb-px border-b-2"
          :class="activeTab === tab.key
            ? 'text-ds-gold border-ds-gold bg-ds-navy'
            : 'text-ds-slate border-transparent hover:text-ds-soft-white'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Filter bar + count -->
      <div class="px-3 sm:px-5 pt-3 pb-3 border-b border-ds-neon/20 shrink-0 bg-ds-navy">
        <FilterBar />
        <p class="text-xs text-ds-slate/50 mt-2">
          Showing {{ visibleCards.length }} of {{ tabCards.length }} cards
          <span v-if="cardStore.loading" class="ml-2 text-ds-gold/60">Loading…</span>
        </p>
      </div>

      <!-- Scrollable card grid -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-ds-midnight">
        <div
          v-if="cardStore.loading && cardStore.allCards.length === 0"
          class="flex justify-center py-28"
        >
          <div class="w-12 h-12 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
        </div>

        <CardGrid
          v-else
          :cards="visibleCards"
          :selectable="true"
          grid-class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
          @card-click="onCardClick"
        />

        <div v-if="hasMoreVisible && !cardStore.loading" class="flex justify-center mt-4 mb-2">
          <button
            @click="loadMore"
            class="bg-ds-midnight hover:bg-ds-navy text-ds-soft-white text-xs px-4 py-2 rounded-lg border border-ds-neon/30 transition-colors"
          >
            Load More Cards
          </button>
        </div>

        <!-- Sentinel: triggers load-more when scrolled into view -->
        <div ref="sentinel" class="h-1" />

        <!-- Skeleton cards while loading more -->
        <div
          v-if="cardStore.loading && cardStore.allCards.length > 0"
          class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-1 pb-4"
        >
          <div
            v-for="n in 12"
            :key="n"
            class="aspect-[2/3] rounded-lg bg-ds-navy overflow-hidden relative"
          >
            <div class="shimmer" />
          </div>
        </div>
      </div>
    </div>

    <!-- Right: deck builder panel (40%) -->
    <div
      class="w-full md:w-2/5 shrink-0 border-t md:border-t-0 md:border-l border-ds-neon/20 overflow-hidden flex flex-col"
      :class="mobilePanel !== 'deck' ? 'hidden md:flex' : 'flex'"
    >
      <DeckList />
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.06) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
</style>
