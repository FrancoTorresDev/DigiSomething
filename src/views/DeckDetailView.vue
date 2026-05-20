<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useDeckStore } from '@/stores/deckStore'
import { getDeckById } from '@/services/deckService'
import { incrementVote, hasUserVoted, recordUserVote } from '@/services/deckService'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import type { Deck } from '@/models/Deck'
import type { DigimonCard } from '@/models/Card'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const deckStore = useDeckStore()

const deck = ref<Deck | null>(null)
const loading = ref(true)
const notFound = ref(false)

type Tab = 'deck' | 'guide' | 'matchups' | 'matches'
const activeTab = ref<Tab>('deck')
const tabs: { key: Tab; label: string }[] = [
  { key: 'deck', label: 'Deck' },
  { key: 'guide', label: 'Guide' },
  { key: 'matchups', label: 'Matchups' },
  { key: 'matches', label: 'Matches' },
]

// Card detail modal
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)

// Voting
const voted = ref(false)
const votingLoading = ref(false)

onMounted(async () => {
  const id = route.params.id as string
  try {
    const result = await getDeckById(id)
    if (!result) { notFound.value = true; return }
    deck.value = result
    if (auth.user) {
      voted.value = await hasUserVoted(auth.user.uid, id)
    }
  } finally {
    loading.value = false
  }
})

// ── Computed helpers ────────────────────────────────────────────────────────

const eggCards = computed(() =>
  (deck.value?.cards ?? []).filter((c) => c.card.type === 'Digi-Egg')
)

const mainCards = computed(() =>
  (deck.value?.cards ?? []).filter((c) => c.card.type !== 'Digi-Egg')
)

const totalMainCount = computed(() =>
  mainCards.value.reduce((s, c) => s + c.quantity, 0)
)

const totalEggCount = computed(() =>
  eggCards.value.reduce((s, c) => s + c.quantity, 0)
)

// Cards grouped by type for display
const mainCardsByType = computed(() => {
  const order = ['Digimon', 'Tamer', 'Option']
  const groups: Record<string, typeof mainCards.value> = {}
  for (const dc of mainCards.value) {
    const type = dc.card.type ?? 'Other'
    if (!groups[type]) groups[type] = []
    groups[type].push(dc)
  }
  const result: { type: string; cards: typeof mainCards.value }[] = []
  for (const t of order) {
    if (groups[t]?.length) result.push({ type: t, cards: groups[t] })
  }
  for (const [t, cards] of Object.entries(groups)) {
    if (!order.includes(t)) result.push({ type: t, cards })
  }
  return result
})

// ── Stats ───────────────────────────────────────────────────────────────────

const avgLevel = computed(() => {
  const items = mainCards.value.filter((c) => c.card.level != null && c.card.level > 0)
  if (!items.length) return 0
  const total = items.reduce((s, c) => s + (c.card.level ?? 0) * c.quantity, 0)
  const count = items.reduce((s, c) => s + c.quantity, 0)
  return +(total / count).toFixed(1)
})

const avgDP = computed(() => {
  const items = mainCards.value.filter((c) => c.card.dp != null && c.card.dp > 0)
  if (!items.length) return 0
  const total = items.reduce((s, c) => s + (c.card.dp ?? 0) * c.quantity, 0)
  const count = items.reduce((s, c) => s + c.quantity, 0)
  return +(total / count / 1000).toFixed(1)
})

// Level curve: levels 2–7+
const levelCurve = computed(() => {
  const buckets: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
  for (const dc of mainCards.value) {
    const lv = dc.card.level
    if (!lv) continue
    const key = lv <= 7 ? lv : 7
    buckets[key] = (buckets[key] ?? 0) + dc.quantity
  }
  return Object.entries(buckets).map(([lv, count]) => ({ lv: Number(lv), count }))
})

const maxLevelCount = computed(() => Math.max(...levelCurve.value.map((b) => b.count), 1))

// Play cost curve (for non-digimon cards)
const costCurve = computed(() => {
  const buckets: Record<number, number> = {}
  for (const dc of mainCards.value) {
    if (dc.card.type === 'Digimon') continue
    const cost = dc.card.playCost ?? dc.card.useCost ?? 0
    buckets[cost] = (buckets[cost] ?? 0) + dc.quantity
  }
  const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b)
  return keys.map((k) => ({ cost: k, count: buckets[k] }))
})

const maxCostCount = computed(() => Math.max(...costCurve.value.map((b) => b.count), 1))

// Color distribution
const colorMap = computed(() => {
  const map: Record<string, number> = {}
  for (const dc of mainCards.value) {
    const col = dc.card.color ?? 'Unknown'
    // handle multi-color like "Red/Blue"
    for (const c of col.split('/')) {
      const key = c.trim()
      map[key] = (map[key] ?? 0) + dc.quantity
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([color, count]) => ({ color, count }))
})

const totalColorCount = computed(() => colorMap.value.reduce((s, c) => s + c.count, 0))

const COLOR_CLASS: Record<string, { bar: string; dot: string }> = {
  Red:    { bar: 'bg-red-500',    dot: 'bg-red-500' },
  Blue:   { bar: 'bg-blue-500',   dot: 'bg-blue-500' },
  Yellow: { bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
  Green:  { bar: 'bg-green-500',  dot: 'bg-green-500' },
  Black:  { bar: 'bg-gray-500',   dot: 'bg-gray-500' },
  Purple: { bar: 'bg-purple-500', dot: 'bg-purple-500' },
  White:  { bar: 'bg-gray-200',   dot: 'bg-gray-200' },
}

const CARD_COLOR_BORDER: Record<string, string> = {
  Red: 'border-red-500', Blue: 'border-blue-500', Yellow: 'border-yellow-400',
  Green: 'border-green-500', Black: 'border-gray-500', Purple: 'border-purple-500', White: 'border-gray-200',
}

function cardBorder(color: string): string {
  return CARD_COLOR_BORDER[color] ?? 'border-gray-700'
}

function colorBarClass(color: string): string {
  return COLOR_CLASS[color]?.bar ?? 'bg-gray-400'
}
function colorDotClass(color: string): string {
  return COLOR_CLASS[color]?.dot ?? 'bg-gray-400'
}

// ── Status ──────────────────────────────────────────────────────────────────

const statusLabel = computed(() => {
  if (!deck.value) return 'DRAFT'
  if (deck.value.isPublic) return 'PUBLIC'
  return 'PRIVATE'
})

const statusClass = computed(() => {
  if (!deck.value) return 'bg-gray-700 text-gray-300'
  if (deck.value.isPublic) return 'bg-green-900/60 text-green-400 border border-green-700'
  return 'bg-gray-800 text-gray-400 border border-gray-700'
})

const isOwner = computed(() => auth.user?.uid === deck.value?.ownerId)

// ── Actions ─────────────────────────────────────────────────────────────────

function editDeck() {
  if (!deck.value) return
  deckStore.loadDeck(deck.value)
  router.push({ name: 'deck-builder' })
}

function exportDeck() {
  if (!deck.value) return
  const ids = deck.value.cards.flatMap((dc) => Array(dc.quantity).fill(dc.card.cardnumber))
  const json = JSON.stringify(ids, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${deck.value.name.replace(/\s+/g, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function vote() {
  if (!deck.value || voted.value || votingLoading.value || !auth.user) return
  votingLoading.value = true
  try {
    await incrementVote(deck.value.id)
    await recordUserVote(auth.user.uid, deck.value.id)
    deck.value.votes = (deck.value.votes ?? 0) + 1
    voted.value = true
  } finally {
    votingLoading.value = false
  }
}

function openCard(card: DigimonCard) {
  selectedCard.value = card
  showModal.value = true
}
</script>

<template>
  <div class="min-h-screen bg-gray-950 text-white">

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center h-64 gap-4">
      <p class="text-gray-400 text-lg">Deck not found.</p>
      <RouterLink to="/gallery" class="text-yellow-400 hover:text-yellow-300 text-sm">← Back to Gallery</RouterLink>
    </div>

    <template v-else-if="deck">
      <!-- ── Hero Header ───────────────────────────────────────────────────── -->
      <div class="border-b border-gray-800 bg-gray-900/60 px-6 py-5">
        <div class="max-w-[1400px] mx-auto">
          <!-- Top row -->
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-3xl font-bold text-white">{{ deck.name }}</h1>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider" :class="statusClass">
                {{ statusLabel }}
              </span>
            </div>
            <!-- Right actions -->
            <div class="flex items-center gap-2">
              <button
                v-if="isOwner"
                @click="editDeck"
                class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-yellow-400 border border-yellow-700 bg-yellow-950/40 hover:bg-yellow-900/50 rounded-lg transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Build
              </button>
              <button
                @click="exportDeck"
                class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-300 border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Export
              </button>
            </div>
          </div>

          <!-- Owner + meta row -->
          <div class="flex items-center gap-4 mt-3 flex-wrap">
            <div class="flex items-center gap-2">
              <img
                v-if="deck.ownerPhoto"
                :src="deck.ownerPhoto"
                :alt="deck.ownerName"
                referrerpolicy="no-referrer"
                class="w-6 h-6 rounded-full border border-gray-700"
              />
              <div v-else class="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                {{ (deck.ownerName ?? '?')[0] }}
              </div>
              <span class="text-sm text-gray-300">{{ deck.ownerName }}</span>
            </div>

            <!-- Vote button -->
            <button
              @click="vote"
              :disabled="voted || !auth.isLoggedIn || votingLoading"
              class="flex items-center gap-1 text-sm transition-colors"
              :class="voted ? 'text-pink-400 cursor-default' : 'text-gray-500 hover:text-pink-400'"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              {{ deck.votes ?? 0 }}
            </button>

            <span class="text-gray-600 text-xs">
              {{ totalMainCount }} main cards · {{ totalEggCount }} eggs
            </span>
          </div>

          <!-- Tabs -->
          <div class="flex items-center gap-1 mt-5 border-b border-gray-800 -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
              :class="activeTab === tab.key
                ? 'text-yellow-400 border-yellow-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'"
            >
              {{ tab.label }}
              <span v-if="tab.key === 'deck'" class="ml-1 text-xs text-gray-600">
                {{ totalMainCount + totalEggCount }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Content ───────────────────────────────────────────────────────── -->
      <div class="max-w-[1400px] mx-auto px-6 py-6">

        <!-- ── DECK TAB ─────────────────────────────────────────────────────── -->
        <div v-if="activeTab === 'deck'" class="flex gap-6">

          <!-- Left: card sections -->
          <div class="flex-1 min-w-0 space-y-8">

            <!-- Digi-Egg Deck -->
            <section v-if="eggCards.length > 0">
              <div class="flex items-center gap-3 mb-4">
                <h2 class="text-xs font-bold uppercase tracking-widest text-yellow-500">Digi-Egg Deck</h2>
                <span class="text-xs font-mono text-gray-500">{{ totalEggCount }}/5</span>
              </div>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="dc in eggCards"
                  :key="dc.card.cardnumber"
                  class="relative cursor-pointer group"
                  @click="openCard(dc.card)"
                >
                  <div
                    class="w-28 rounded-lg overflow-hidden border-2 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-black/60"
                    :class="cardBorder(dc.card.color)"
                  >
                    <div class="aspect-[2/3] bg-gray-800">
                      <img
                        v-if="dc.card.imgurl"
                        :src="dc.card.imgurl"
                        :alt="dc.card.name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <div
                    v-if="dc.quantity > 1"
                    class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center shadow"
                  >x{{ dc.quantity }}</div>
                </div>
              </div>
            </section>

            <!-- Main Deck by type -->
            <section v-for="group in mainCardsByType" :key="group.type">
              <div class="flex items-center gap-3 mb-4">
                <h2 class="text-xs font-bold uppercase tracking-widest text-gray-300">{{ group.type }}</h2>
                <span class="text-xs font-mono text-gray-600">
                  {{ group.cards.reduce((s, c) => s + c.quantity, 0) }}
                </span>
              </div>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="dc in group.cards"
                  :key="dc.card.cardnumber"
                  class="relative cursor-pointer group"
                  @click="openCard(dc.card)"
                >
                  <div
                    class="w-28 rounded-lg overflow-hidden border-2 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-black/60"
                    :class="cardBorder(dc.card.color)"
                  >
                    <div class="aspect-[2/3] bg-gray-800">
                      <img
                        v-if="dc.card.imgurl"
                        :src="dc.card.imgurl"
                        :alt="dc.card.name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-gray-500 text-[10px] text-center p-1">
                        {{ dc.card.name }}
                      </div>
                    </div>
                    <!-- Card name bar -->
                    <div class="bg-gray-900/90 px-1.5 py-0.5">
                      <p class="text-[9px] text-gray-300 truncate">{{ dc.card.name }}</p>
                    </div>
                  </div>
                  <!-- Quantity badge -->
                  <div
                    v-if="dc.quantity > 1"
                    class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center shadow"
                  >x{{ dc.quantity }}</div>
                  <!-- Single qty indicator -->
                  <div
                    v-else
                    class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-700 text-gray-400 text-[10px] font-bold flex items-center justify-center"
                  >1</div>
                </div>
              </div>
            </section>

            <!-- Empty deck -->
            <div v-if="eggCards.length === 0 && mainCards.length === 0" class="text-center py-20 text-gray-600">
              This deck has no cards.
            </div>
          </div>

          <!-- Right: stats panel -->
          <div class="w-96 shrink-0">
            <div class="sticky top-20 space-y-5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6">

              <!-- Key metrics -->
              <div class="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div class="text-4xl font-bold text-white">{{ totalMainCount }}</div>
                  <div class="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Cards</div>
                </div>
                <div>
                  <div class="text-4xl font-bold text-white">{{ avgLevel }}</div>
                  <div class="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Avg Lv</div>
                </div>
                <div>
                  <div class="text-4xl font-bold text-white">{{ avgDP }}k</div>
                  <div class="text-[11px] text-gray-500 uppercase tracking-wider mt-1">Avg DP</div>
                </div>
              </div>

              <div class="border-t border-gray-800" />

              <!-- Level curve -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    Level curve
                  </span>
                  <span class="text-[10px] text-gray-600">AVG {{ avgLevel }}</span>
                </div>
                <div v-if="levelCurve.some(b => b.count > 0)" class="space-y-0">
                  <!-- Numbers above bars -->
                  <div class="flex items-end gap-1 h-28">
                    <div
                      v-for="bucket in levelCurve"
                      :key="bucket.lv"
                      class="flex-1 flex flex-col items-center justify-end gap-0.5"
                    >
                      <span v-if="bucket.count > 0" class="text-[10px] text-gray-400">{{ bucket.count }}</span>
                      <div
                        class="w-full rounded-t-sm bg-yellow-500 transition-all"
                        :style="{ height: bucket.count ? `${(bucket.count / maxLevelCount) * 80}px` : '2px', opacity: bucket.count ? 1 : 0.15 }"
                      />
                    </div>
                  </div>
                  <!-- X axis labels -->
                  <div class="flex gap-1">
                    <div
                      v-for="bucket in levelCurve"
                      :key="bucket.lv"
                      class="flex-1 text-center text-[10px] text-gray-600 pt-1"
                    >{{ bucket.lv }}</div>
                  </div>
                </div>
                <p v-else class="text-xs text-gray-600">No level data</p>
              </div>

              <!-- Play cost curve (Tamers + Options) -->
              <div v-if="costCurve.length > 0">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Cost curve
                  </span>
                </div>
                <div class="flex items-end gap-1 h-28">
                  <div
                    v-for="bucket in costCurve"
                    :key="bucket.cost"
                    class="flex-1 flex flex-col items-center justify-end gap-0.5"
                  >
                    <span v-if="bucket.count > 0" class="text-[10px] text-gray-400">{{ bucket.count }}</span>
                    <div
                      class="w-full rounded-t-sm bg-blue-500 transition-all"
                      :style="{ height: bucket.count ? `${(bucket.count / maxCostCount) * 80}px` : '2px', opacity: bucket.count ? 1 : 0.15 }"
                    />
                  </div>
                </div>
                <div class="flex gap-1 mt-0.5">
                  <div
                    v-for="bucket in costCurve"
                    :key="bucket.cost"
                    class="flex-1 text-center text-[10px] text-gray-600"
                  >{{ bucket.cost }}</div>
                </div>
              </div>

              <div class="border-t border-gray-800" />

              <!-- Color distribution -->
              <div v-if="colorMap.length > 0">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 2a10 10 0 010 20"/></svg>
                    Colors
                  </span>
                  <span class="text-[10px] text-gray-600">{{ colorMap.length }} ACTIVE</span>
                </div>
                <!-- Stacked bar -->
                <div class="flex h-3 rounded-full overflow-hidden gap-px">
                  <div
                    v-for="item in colorMap"
                    :key="item.color"
                    class="transition-all"
                    :class="colorBarClass(item.color)"
                    :style="{ width: `${(item.count / totalColorCount) * 100}%` }"
                  />
                </div>
                <!-- Legend -->
                <div class="mt-2 space-y-1">
                  <div v-for="item in colorMap" :key="item.color" class="flex items-center justify-between">
                    <div class="flex items-center gap-1.5">
                      <div class="w-2.5 h-2.5 rounded-full" :class="colorDotClass(item.color)" />
                      <span class="text-xs text-gray-400">{{ item.color }}</span>
                    </div>
                    <span class="text-xs font-mono text-gray-500">{{ item.count }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description / video -->
            <div v-if="deck.description || deck.videoUrl" class="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              <p v-if="deck.description" class="text-sm text-gray-300 leading-relaxed">{{ deck.description }}</p>
              <div v-if="deck.videoUrl" class="aspect-video rounded-lg overflow-hidden bg-gray-800">
                <iframe
                  v-if="deck.videoUrl.includes('youtube') || deck.videoUrl.includes('youtu.be')"
                  :src="deck.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')"
                  class="w-full h-full"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                />
              </div>
            </div>
            </div><!-- end sticky -->
          </div>
        </div>

        <!-- ── GUIDE TAB ─────────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'guide'">
          <section class="mb-10">
            <h2 class="text-xs font-bold uppercase tracking-widest text-white mb-4">Guide</h2>
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <svg class="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <p class="text-gray-400 font-medium">No guide yet</p>
              <p class="text-sm text-gray-600">Share how to pilot this deck with the community.</p>
              <button v-if="isOwner" class="mt-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm font-semibold rounded-lg transition-colors">
                Write a guide
              </button>
            </div>
          </section>
        </div>

        <!-- ── MATCHUPS TAB ──────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'matchups'">
          <section class="mb-10">
            <h2 class="text-xs font-bold uppercase tracking-widest text-white mb-4">Matchups</h2>
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <svg class="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <p class="text-gray-400 font-medium">No matchup notes yet</p>
              <p class="text-sm text-gray-600">Document your experience against other decks to help readers.</p>
              <button v-if="isOwner" class="mt-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm font-semibold rounded-lg transition-colors">
                Add matchup
              </button>
            </div>
          </section>
        </div>

        <!-- ── MATCHES TAB ───────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'matches'">
          <section class="mb-10">
            <h2 class="text-xs font-bold uppercase tracking-widest text-white mb-4">Matches</h2>
            <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <svg class="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-gray-400 font-medium">No matches recorded yet</p>
              <p class="text-sm text-gray-600">Track your game results to see your win rate and performance against different matchups.</p>
              <button v-if="isOwner" class="mt-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm font-semibold rounded-lg transition-colors">
                Record match
              </button>
            </div>
          </section>
        </div>

      </div>
    </template>

    <!-- Card detail modal -->
    <CardDetailModal
      v-if="showModal && selectedCard"
      :card="selectedCard"
      @close="showModal = false"
    />
  </div>
</template>
