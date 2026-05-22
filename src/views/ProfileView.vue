<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useDeckStore } from '@/stores/deckStore'
import DeckCard from '@/components/deck/DeckCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { Deck } from '@/models/Deck'

const deckStore = useDeckStore()
onMounted(() => deckStore.loadUserDecks())

const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) { openMenuId.value = openMenuId.value === id ? null : id }
function closeMenu() { openMenuId.value = null }

// ── filter state ──────────────────────────────────────────────
const searchQuery    = ref('')
const selectedColors = ref<string[]>([])
const selectedStatuses = ref<string[]>([])
const sortBy         = ref<'newest' | 'oldest' | 'votes' | 'name'>('newest')
const showSortMenu   = ref(false)
const showStatusMenu = ref(false)

const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Black', 'Purple', 'White']

const SORT_LABELS: Record<string, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  votes:  'Most Votes',
  name:   'Name (A–Z)',
}

const COLOR_STYLE: Record<string, string> = {
  Red:    'bg-red-500    border-red-400',
  Blue:   'bg-blue-500   border-blue-400',
  Yellow: 'bg-yellow-400 border-yellow-300',
  Green:  'bg-green-500  border-green-400',
  Black:  'bg-gray-600   border-gray-500',
  Purple: 'bg-purple-500 border-purple-400',
  White:  'bg-gray-200   border-gray-300',
}

function getDeckColors(deck: Deck): string[] {
  const seen = new Set<string>()
  for (const entry of deck.cards) {
    if (entry.card.color) {
      for (const c of entry.card.color.split('/')) {
        const t = c.trim(); if (t) seen.add(t)
      }
    }
  }
  return [...seen]
}

const filteredDecks = computed(() => {
  let decks = [...deckStore.userDecks]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    decks = decks.filter(d =>
      d.name.toLowerCase().includes(q) || d.ownerName?.toLowerCase().includes(q)
    )
  }

  if (selectedColors.value.length) {
    decks = decks.filter(d => {
      const dc = getDeckColors(d)
      return selectedColors.value.every(c => dc.includes(c))
    })
  }

  if (selectedStatuses.value.length) {
    decks = decks.filter(d => {
      const status = d.isPublic ? 'Public' : 'Private'
      return selectedStatuses.value.includes(status)
    })
  }

  if (sortBy.value === 'oldest') decks = decks.reverse()
  else if (sortBy.value === 'votes') decks = decks.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
  else if (sortBy.value === 'name')  decks = decks.sort((a, b) => a.name.localeCompare(b.name))

  return decks
})

const activeFilterCount = computed(() =>
  selectedColors.value.length + selectedStatuses.value.length + (searchQuery.value.trim() ? 1 : 0)
)

function toggleColor(c: string) {
  const i = selectedColors.value.indexOf(c)
  if (i >= 0) selectedColors.value.splice(i, 1); else selectedColors.value.push(c)
}

function toggleStatus(s: string) {
  const i = selectedStatuses.value.indexOf(s)
  if (i >= 0) selectedStatuses.value.splice(i, 1); else selectedStatuses.value.push(s)
}

function clearFilters() {
  searchQuery.value = ''; selectedColors.value = []; selectedStatuses.value = []; sortBy.value = 'newest'
}
</script>

<template>
  <div class="w-full px-6 pt-6 pb-10">

    <!-- ── Filter block ─────────────────────────────────────── -->
    <div class="bg-ds-navy/80 border border-ds-neon/20 rounded-xl mb-6">

      <!-- Row 1: search + sort -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-ds-neon/20">
        <!-- search -->
        <div class="flex-1 flex items-center gap-2 bg-ds-midnight rounded-lg px-3 py-2">
          <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search decks by name..."
            class="flex-1 bg-transparent text-sm text-ds-soft-white placeholder-ds-slate/60 outline-none"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="text-ds-slate/50 hover:text-ds-slate transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- sort -->
        <div class="relative" @mouseleave="showSortMenu = false">
          <button
            @click="showSortMenu = !showSortMenu"
            class="flex items-center gap-1.5 text-sm text-ds-slate hover:text-ds-soft-white border border-ds-neon/30 hover:border-ds-neon/60 rounded-lg px-3 py-2 transition-colors whitespace-nowrap"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
            {{ SORT_LABELS[sortBy] }}
            <svg class="w-3 h-3 transition-transform" :class="showSortMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div
            v-if="showSortMenu"
            class="absolute right-0 top-full mt-1 z-20 w-44 bg-ds-navy border border-ds-neon/30 rounded-xl shadow-2xl overflow-hidden"
            @mouseleave="showSortMenu = false"
          >
            <button
              v-for="(label, key) in SORT_LABELS"
              :key="key"
              @click="sortBy = key as typeof sortBy; showSortMenu = false"
              class="w-full text-left px-4 py-2.5 text-sm transition-colors"
              :class="sortBy === key ? 'text-ds-gold bg-ds-midnight' : 'text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight'"
            >{{ label }}</button>
          </div>
        </div>
      </div>

      <!-- Row 2: color pips + status dropdown -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-ds-neon/20 flex-wrap">
        <!-- color circles -->
        <div class="flex items-center gap-2">
          <button
            v-for="color in COLORS"
            :key="color"
            @click="toggleColor(color)"
            :title="color"
            class="w-7 h-7 rounded-full border-2 transition-all duration-150 shrink-0 hover:scale-110"
            :class="[
              COLOR_STYLE[color],
              selectedColors.includes(color)
                ? 'ring-2 ring-ds-soft-white ring-offset-2 ring-offset-ds-navy scale-110 opacity-100'
                : 'opacity-40 hover:opacity-80'
            ]"
          />
        </div>

        <div class="w-px h-5 bg-ds-neon/20 shrink-0 mx-1" />

        <!-- status dropdown -->
        <div class="relative" @mouseleave="showStatusMenu = false">
          <button
            @click="showStatusMenu = !showStatusMenu"
            class="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
            :class="selectedStatuses.length
              ? 'text-ds-gold border-ds-gold/50 bg-ds-gold/10'
              : 'text-ds-slate hover:text-ds-soft-white border-ds-neon/30 hover:border-ds-neon/60'"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>
            All Statuses
            <svg class="w-3 h-3 transition-transform" :class="showStatusMenu ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div
            v-if="showStatusMenu"
            class="absolute left-0 top-full mt-1 z-20 w-40 bg-ds-navy border border-ds-neon/30 rounded-xl shadow-2xl overflow-hidden"
          >
            <button
              v-for="s in ['Private', 'Public']"
              :key="s"
              @click="toggleStatus(s)"
              class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-ds-midnight"
              :class="selectedStatuses.includes(s) ? 'text-ds-gold' : 'text-ds-slate hover:text-ds-soft-white'"
            >
              <span
                class="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors"
                :class="selectedStatuses.includes(s) ? 'bg-ds-gold border-ds-gold' : 'border-ds-neon/40'"
              >
                <svg v-if="selectedStatuses.includes(s)" class="w-2.5 h-2.5 text-ds-midnight" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </span>
              {{ s }}
            </button>
          </div>
        </div>
      </div>

      <!-- Row 3: active filters + deck count -->
      <div class="flex items-center justify-between px-4 py-2 text-xs text-ds-slate/60 flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span>Active:</span>
          <span v-if="activeFilterCount === 0">No filters applied</span>
          <template v-else>
            <span v-if="searchQuery.trim()" class="flex items-center gap-1 bg-ds-midnight border border-ds-neon/30 rounded-full px-2 py-0.5 text-ds-soft-white">
              "{{ searchQuery }}"
              <button @click="searchQuery = ''" class="hover:text-white ml-0.5">×</button>
            </span>
            <span
              v-for="c in selectedColors" :key="c"
              class="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 text-gray-300"
            >
              {{ c }}<button @click="toggleColor(c)" class="hover:text-white ml-0.5">×</button>
            </span>
            <span
              v-for="s in selectedStatuses" :key="s"
              class="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5 text-gray-300"
            >
              {{ s }}<button @click="toggleStatus(s)" class="hover:text-white ml-0.5">×</button>
            </span>
      <button @click="clearFilters()" class="text-ds-gold hover:text-ds-cyan">Clear all</button>
          </template>
        </div>
        <span class="tabular-nums shrink-0">{{ filteredDecks.length }} deck{{ filteredDecks.length !== 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="deckStore.loading" class="flex justify-center py-16">
      <div class="w-8 h-8 border-2 border-ds-royal border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- No decks at all -->
    <div v-else-if="deckStore.userDecks.length === 0" class="text-center py-16">
      <p class="text-ds-slate mb-3">No saved decks yet</p>
      <RouterLink to="/deck-builder" class="text-sm text-ds-cyan hover:text-ds-royal transition-colors">
        Go build one →
      </RouterLink>
    </div>

    <!-- Filters returned nothing -->
    <div v-else-if="filteredDecks.length === 0" class="text-center py-16">
      <p class="text-ds-slate mb-2">No decks match your filters.</p>
      <BaseButton variant="accent" size="sm" @click="clearFilters()">Clear filters</BaseButton>
    </div>

    <!-- Deck grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      <div
        v-for="deck in filteredDecks"
        :key="deck.id"
        class="relative group"
        @mouseleave="closeMenu()"
      >
        <!-- Card tile as link -->
        <RouterLink :to="{ name: 'deck-detail', params: { id: deck.id } }">
          <DeckCard :deck="deck" />
        </RouterLink>

        <!-- 3-dot menu button (top-right corner) -->
        <div class="absolute top-2 right-2 z-10">
          <button
            @click.prevent="toggleMenu(deck.id)"
            class="w-6 h-6 flex items-center justify-center rounded-md bg-ds-navy/80 text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight transition-colors opacity-0 group-hover:opacity-100"
            title="Options"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>

          <!-- Dropdown -->
          <div
            v-if="openMenuId === deck.id"
            class="absolute right-0 top-full mt-1 w-36 bg-ds-navy border border-ds-neon/30 rounded-xl shadow-2xl overflow-hidden z-20"
          >
            <button
              @click="deckStore.deleteDeck(deck.id); closeMenu()"
              class="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-ds-midnight transition-colors"
            >
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>


