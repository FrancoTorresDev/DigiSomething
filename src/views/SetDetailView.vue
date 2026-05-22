<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DIGIMON_SETS, TYPE_BADGE } from '@/services/digimonSets'
import { searchCards } from '@/services/digimonApi'
import CardGrid from '@/components/cards/CardGrid.vue'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import { useDeckStore } from '@/stores/deckStore'
import type { DigimonCard } from '@/models/Card'

const route  = useRoute()
const router = useRouter()
const deckStore = useDeckStore()

const set       = computed(() => DIGIMON_SETS.find(s => s.code === route.params.code) ?? null)
const cards     = ref<DigimonCard[]>([])
const loading   = ref(false)
const error     = ref<string | null>(null)
const search    = ref('')

const selectedCard = ref<DigimonCard | null>(null)
const showModal    = ref(false)

const filteredCards = computed(() => {
  if (!search.value.trim()) return cards.value
  const q = search.value.toLowerCase()
  return cards.value.filter(c => c.name.toLowerCase().includes(q))
})

onMounted(async () => {
  if (!set.value) { error.value = 'Set not found.'; return }
  loading.value = true
  error.value   = null
  try {
    // Fetch all cards and filter client-side by set_name matching the set code.
    // The API always returns the full dataset; filtering via set_name is the only reliable method.
    const allCards = await searchCards({})
    const code = set.value.code // e.g. "BT-01"
    const seen = new Set<string>()
    cards.value = allCards
      .filter(c => c.set_name?.startsWith(code + ':'))
      .filter(c => {
        if (seen.has(c.cardnumber)) return false
        seen.add(c.cardnumber)
        return true
      })
  } catch {
    error.value = 'Failed to load cards. Please try again.'
  } finally {
    loading.value = false
  }
})

function onCardClick(card: DigimonCard) {
  selectedCard.value = card
  showModal.value = true
}
</script>

<template>
  <div class="max-w-screen-2xl mx-auto px-6 py-8">

    <!-- Back + header -->
    <div class="mb-6">
      <button
        @click="router.push({ name: 'sets' })"
        class="flex items-center gap-1.5 text-sm text-ds-slate hover:text-ds-soft-white transition-colors mb-4"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        All Sets
      </button>

      <template v-if="set">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-3xl font-bold text-ds-soft-white">{{ set.name }}</h1>
          <span class="text-lg font-mono text-ds-slate">{{ set.code }}</span>
          <span
            class="text-xs font-bold px-2 py-1 rounded leading-none"
            :class="TYPE_BADGE[set.type]"
          >{{ set.type }}</span>
        </div>
        <p class="text-ds-slate text-sm mt-1">
          Released {{ set.releaseDate.replace('-', '/') }}
          <span v-if="!loading" class="ml-2 text-ds-slate/50">· {{ filteredCards.length }} card{{ filteredCards.length !== 1 ? 's' : '' }}</span>
        </p>
      </template>
        <p v-else class="text-ds-slate">Set not found</p>
    </div>

    <!-- Search bar -->
    <div v-if="set && !loading && cards.length" class="mb-6">
      <div class="flex items-center gap-2 bg-ds-navy border border-ds-neon/20 rounded-lg px-3 py-2 w-full sm:w-80 focus-within:border-ds-cyan transition-colors">
        <svg class="w-4 h-4 text-ds-slate shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search cards in this set..."
          class="flex-1 bg-transparent text-sm text-ds-soft-white placeholder-ds-slate/60 outline-none"
        />
        <button v-if="search" @click="search = ''" class="text-ds-slate/50 hover:text-ds-slate">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-28">
      <div class="w-12 h-12 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-28">
      <p class="text-ds-slate mb-4">{{ error }}</p>
      <button @click="router.push({ name: 'sets' })" class="text-sm text-ds-gold hover:underline">
        Back to sets
      </button>
    </div>

    <!-- No cards (set name mismatch with API) -->
    <div v-else-if="!loading && cards.length === 0 && set" class="text-center py-28">
      <p class="text-ds-slate mb-2">No cards found for this set.</p>
      <p class="text-xs text-ds-slate/40">The set data may not be available in the API yet.</p>
    </div>

    <!-- No search results -->
    <div v-else-if="filteredCards.length === 0 && search" class="text-center py-16">
      <p class="text-ds-slate">No cards match "{{ search }}"</p>
      <button @click="search = ''" class="mt-2 text-sm text-ds-gold hover:text-ds-cyan">Clear search</button>
    </div>

    <!-- Card grid -->
    <CardGrid
      v-else
      :cards="filteredCards"
      :selectable="true"
      grid-class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3"
      @card-click="onCardClick"
    />

  </div>

  <CardDetailModal
    :card="selectedCard"
    :visible="showModal"
    :allow-add="true"
    @close="showModal = false"
    @add-to-deck="deckStore.addCard($event); showModal = false"
  />
</template>
