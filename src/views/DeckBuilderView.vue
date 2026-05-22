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
  displayCount.value += LOAD_MORE_STEP
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
  <div class="flex h-[calc(100vh-4rem)] overflow-hidden">

    <!-- Left: card library (60%) -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

      <!-- Tab bar -->
      <div class="px-5 pt-4 pb-0 shrink-0 flex items-center gap-2 border-b border-ds-neon/20 bg-ds-midnight">
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
      <div class="px-5 pt-3 pb-3 border-b border-ds-neon/20 shrink-0 bg-ds-navy">
        <FilterBar />
        <p class="text-xs text-ds-slate/50 mt-2">
          {{ tabCards.length }} cards
          <span v-if="cardStore.loading" class="ml-2 text-ds-gold/60">Loading…</span>
        </p>
      </div>

      <!-- Scrollable card grid -->
      <div ref="scrollContainer" class="flex-1 overflow-y-auto px-5 py-4 bg-ds-midnight">
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
          grid-class="grid grid-cols-6 gap-3"
          @card-click="onCardClick"
        />

        <!-- Sentinel: triggers load-more when scrolled into view -->
        <div ref="sentinel" class="h-1" />

        <!-- Skeleton cards while loading more -->
        <div
          v-if="cardStore.loading && cardStore.allCards.length > 0"
          class="grid grid-cols-6 gap-3 mt-1 pb-4"
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
    <div class="w-2/5 shrink-0 border-l border-ds-neon/20 overflow-hidden flex flex-col">
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
