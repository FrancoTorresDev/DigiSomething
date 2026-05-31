<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useDeckStore } from '@/stores/deckStore'
import { getDeckById } from '@/services/deckService'
import { incrementVote, hasUserVoted, recordUserVote, saveGuide, saveMatch, getMatches, deleteMatch, saveMatchup, getMatchups, deleteMatchup, updateDeck as updateDeckService } from '@/services/deckService'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import ExportImageModal from '@/components/deck/ExportImageModal.vue'
import ExportProxiesModal from '@/components/deck/ExportProxiesModal.vue'
import DeckVersionsTab from '@/components/deck/DeckVersionsTab.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { Deck, DeckMatch, DeckMatchup, DeckArchetypeTag } from '@/models/Deck'
import type { DigimonCard } from '@/models/Card'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const deckStore = useDeckStore()

const deck = ref<Deck | null>(null)
const loading = ref(true)
const notFound = ref(false)

type Tab = 'deck' | 'guide' | 'matchups' | 'matches' | 'versions'
const activeTab = ref<Tab>('deck')
const tabs: { key: Tab; label: string }[] = [
  { key: 'deck', label: 'Deck' },
  { key: 'guide', label: 'Guide' },
  { key: 'matchups', label: 'Matchups' },
  { key: 'matches', label: 'Matches' },
  { key: 'versions', label: 'Versions' },
]

// Card detail modal
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)
const expandedView = ref(false)

// Voting
const voted = ref(false)
const votingLoading = ref(false)

// Export
const showExportMenu = ref(false)
const showExportImageModal = ref(false)
const showExportProxiesModal = ref(false)
const exportMenuRef = ref<HTMLElement | null>(null)

function onExportClickOutside(e: MouseEvent) {
  if (exportMenuRef.value && !exportMenuRef.value.contains(e.target as Node)) {
    showExportMenu.value = false
  }
}
onMounted(() => document.addEventListener('mousedown', onExportClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', onExportClickOutside))

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

watch(activeTab, (tab) => {
  if (tab === 'matches' && matches.value.length === 0 && !matchesLoading.value) {
    loadMatches()
  }
  if (tab === 'matchups' && matchups.value.length === 0 && !matchupsLoading.value) {
    loadMatchups()
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

const displayEggs = computed(() =>
  expandedView.value
    ? eggCards.value.flatMap((dc, ci) =>
        Array.from({ length: dc.quantity }, (_, i) => ({
          card: dc.card, qty: 1, key: `${dc.card.cardnumber}-${ci}-${i}`,
        }))
      )
    : eggCards.value.map(dc => ({ card: dc.card, qty: dc.quantity, key: dc.card.cardnumber }))
)

const displayMainByType = computed(() =>
  mainCardsByType.value.map(group => ({
    type: group.type,
    totalCount: group.cards.reduce((s, c) => s + c.quantity, 0),
    cards: expandedView.value
      ? group.cards.flatMap((dc, ci) =>
          Array.from({ length: dc.quantity }, (_, i) => ({
            card: dc.card, qty: 1, key: `${dc.card.cardnumber}-${ci}-${i}`,
          }))
        )
      : group.cards.map(dc => ({ card: dc.card, qty: dc.quantity, key: dc.card.cardnumber })),
  }))
)

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

// Pricing labels are optional in this view. Keep a safe no-op helper so
// the deck page still renders if pricing integration is unavailable.
function cardPriceLabel(_cardnumber: string, _qty: number): string {
  return ''
}

const statusLabel = computed(() => {
  if (!deck.value) return 'DRAFT'
  if (deck.value.isPublic) return 'PUBLIC'
  return 'PRIVATE'
})

const statusClass = computed(() => {
  if (!deck.value) return 'bg-ds-navy text-ds-slate'
  if (deck.value.isPublic) return 'bg-green-900/60 text-green-400 border border-green-700'
  return 'bg-ds-midnight text-ds-slate border border-ds-neon/20'
})

const isOwner = computed(() => auth.user?.uid === deck.value?.ownerId)
const archetypeSaving = ref(false)
const archetypeOptions: Array<{
  value: DeckArchetypeTag
  label: string
  activeClass: string
}> = [
  {
    value: 'MIDRANGE_YELLOW',
    label: 'MIDRANGE',
    activeClass: 'text-yellow-300 border-yellow-400/70 bg-yellow-500/15'
  },
  {
    value: 'CONTROL_BLUE',
    label: 'CONTROL',
    activeClass: 'text-blue-300 border-blue-400/70 bg-blue-500/15'
  },
  {
    value: 'AGGRO_RED',
    label: 'AGGRO',
    activeClass: 'text-red-300 border-red-400/70 bg-red-500/15'
  }
]

function normalizeArchetypeTag(tag?: DeckArchetypeTag): DeckArchetypeTag | undefined {
  if (!tag) return undefined
  if (tag === 'MIDRANGE') return 'MIDRANGE_YELLOW'
  if (tag === 'CONTROL') return 'CONTROL_BLUE'
  if (tag === 'AGGRO') return 'AGGRO_RED'
  return tag
}

const selectedArchetypeTag = computed(() => normalizeArchetypeTag(deck.value?.archetypeTag))

function archetypeLabel(tag?: DeckArchetypeTag): string {
  const normalized = normalizeArchetypeTag(tag)
  if (normalized === 'MIDRANGE_YELLOW') return 'MIDRANGE'
  if (normalized === 'CONTROL_BLUE') return 'CONTROL'
  if (normalized === 'AGGRO_RED') return 'AGGRO'
  return ''
}

function archetypeActiveClass(tag?: DeckArchetypeTag): string {
  const normalized = normalizeArchetypeTag(tag)
  if (normalized === 'MIDRANGE_YELLOW') return 'text-yellow-300 border-yellow-400/70 bg-yellow-500/15'
  if (normalized === 'CONTROL_BLUE') return 'text-blue-300 border-blue-400/70 bg-blue-500/15'
  if (normalized === 'AGGRO_RED') return 'text-red-300 border-red-400/70 bg-red-500/15'
  return 'text-ds-cyan border-ds-cyan/60 bg-ds-cyan/10'
}

async function setArchetypeTag(tag: DeckArchetypeTag): Promise<void> {
  if (!deck.value || !isOwner.value || !deck.value.isPublic || archetypeSaving.value) return
  if (selectedArchetypeTag.value === tag) return

  archetypeSaving.value = true
  try {
    await updateDeckService(deck.value.id, { archetypeTag: tag })
    deck.value.archetypeTag = tag
  } finally {
    archetypeSaving.value = false
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

function editDeck() {
  if (!deck.value) return
  deckStore.loadDeck(deck.value)
  router.push({ name: 'deck-builder' })
}

function copyToBuilder() {
  if (!deck.value) return

  const source = deck.value
  const copied: Deck = {
    ...source,
    id: '',
    ownerId: auth.user?.uid ?? '',
    name: `Copy of ${source.name}`,
    isPublic: false,
    votes: 0,
    ownerName: auth.displayName ?? undefined,
    ownerPhoto: auth.photoURL ?? undefined,
    qrCodeUrl: undefined,
    currentVersion: undefined,
    createdAt: undefined,
    cards: source.cards.map((entry) => ({
      quantity: entry.quantity,
      card: { ...entry.card },
    })),
  }

  deckStore.loadDeck(copied)
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

// ── Guide ───────────────────────────────────────────────────────────────────

const guideEditing = ref(false)
const guideDraft = ref('')
const guideSaving = ref(false)

function startEditGuide() {
  guideDraft.value = deck.value?.guide ?? ''
  guideEditing.value = true
}

function cancelEditGuide() {
  guideEditing.value = false
  guideDraft.value = ''
}

async function handleSaveGuide() {
  if (!deck.value) return
  guideSaving.value = true
  try {
    await saveGuide(deck.value.id, guideDraft.value.trim())
    deck.value.guide = guideDraft.value.trim()
    guideEditing.value = false
  } finally {
    guideSaving.value = false
  }
}

// ── Matches ─────────────────────────────────────────────────────────────────

const DIGIMON_COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Black', 'Purple', 'White']
const COLOR_DOT: Record<string, string> = {
  Red: 'bg-red-500', Blue: 'bg-blue-500', Yellow: 'bg-yellow-400',
  Green: 'bg-green-500', Black: 'bg-gray-500', Purple: 'bg-purple-500', White: 'bg-gray-200',
}

const matches = ref<DeckMatch[]>([])
const matchesLoading = ref(false)
const showAddMatchModal = ref(false)
const addMatchSaving = ref(false)
const addMatchError = ref('')

// Form state
const matchOpponentColors = ref<string[]>([])
const matchOpponentDeckName = ref('')
const matchOpponentName = ref('')
const matchWonGames = ref(0)
const matchLostGames = ref(0)
const matchIsDraw = ref(false)
const matchWonDice = ref(false)
const matchNotes = ref('')

async function loadMatches() {
  if (!deck.value) return
  matchesLoading.value = true
  try {
    matches.value = await getMatches(deck.value.id)
  } finally {
    matchesLoading.value = false
  }
}

function openAddMatch() {
  matchOpponentColors.value = []
  matchOpponentDeckName.value = ''
  matchOpponentName.value = ''
  matchWonGames.value = 0
  matchLostGames.value = 0
  matchIsDraw.value = false
  matchWonDice.value = false
  matchNotes.value = ''
  addMatchError.value = ''
  showAddMatchModal.value = true
}

function toggleMatchColor(color: string) {
  const idx = matchOpponentColors.value.indexOf(color)
  if (idx === -1) {
    if (matchOpponentColors.value.length < 3) matchOpponentColors.value.push(color)
  } else {
    matchOpponentColors.value.splice(idx, 1)
  }
}

function computeResult(): DeckMatch['result'] {
  if (matchIsDraw.value) return 'draw'
  if (matchWonGames.value > matchLostGames.value) return 'win'
  return 'loss'
}

async function handleAddMatch() {
  if (!deck.value) return
  if (!matchOpponentColors.value.length) { addMatchError.value = 'Select at least one opponent deck color.'; return }
  if (!matchIsDraw.value && matchWonGames.value === 0 && matchLostGames.value === 0) {
    addMatchError.value = 'Enter the match score.'
    return
  }
  addMatchSaving.value = true
  addMatchError.value = ''
  try {
    const payload: Omit<DeckMatch, 'id'> = {
      opponentColors: [...matchOpponentColors.value],
      wonGames: matchIsDraw.value ? 0 : matchWonGames.value,
      lostGames: matchIsDraw.value ? 0 : matchLostGames.value,
      result: computeResult(),
      wonDiceRoll: matchWonDice.value,
    }
    if (matchOpponentDeckName.value.trim()) payload.opponentDeckName = matchOpponentDeckName.value.trim()
    if (matchOpponentName.value.trim()) payload.opponentName = matchOpponentName.value.trim()
    if (matchNotes.value.trim()) payload.notes = matchNotes.value.trim()
    const id = await saveMatch(deck.value.id, payload)
    matches.value.unshift({ id, ...payload })
    showAddMatchModal.value = false
  } finally {
    addMatchSaving.value = false
  }
}

async function handleDeleteMatch(matchId: string) {
  if (!deck.value) return
  await deleteMatch(deck.value.id, matchId)
  matches.value = matches.value.filter((m) => m.id !== matchId)
}

const matchStats = computed(() => {
  const total = matches.value.length
  const wins = matches.value.filter((m) => m.result === 'win').length
  const losses = matches.value.filter((m) => m.result === 'loss').length
  const draws = matches.value.filter((m) => m.result === 'draw').length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
  return { total, wins, losses, draws, winRate }
})

// ── Matchups ─────────────────────────────────────────────────────────────────

const matchups = ref<DeckMatchup[]>([])
const matchupsLoading = ref(false)
const showAddMatchupModal = ref(false)
const addMatchupSaving = ref(false)
const addMatchupError = ref('')
const expandedMatchup = ref<string | null>(null)

// Form state
const muTitle = ref('')
const muOpponentColors = ref<string[]>([])
const muOpponentDeckName = ref('')
const muDifficulty = ref<DeckMatchup['difficulty']>('even')
const muNotesFirst = ref('')
const muNotesSecond = ref('')
const muActiveNoteTab = ref<'first' | 'second'>('first')

const DIFFICULTY_OPTIONS: { key: DeckMatchup['difficulty']; label: string }[] = [
  { key: 'favored', label: 'Favored' },
  { key: 'even', label: 'Even' },
  { key: 'unfavored', label: 'Unfavored' },
]

const DIFFICULTY_STYLE: Record<DeckMatchup['difficulty'], string> = {
  favored:   'bg-green-500/20 text-green-400 border-green-600/50',
  even:      'bg-yellow-500/20 text-yellow-400 border-yellow-600/50',
  unfavored: 'bg-red-500/20 text-red-400 border-red-600/50',
}

async function loadMatchups() {
  if (!deck.value) return
  matchupsLoading.value = true
  try {
    matchups.value = await getMatchups(deck.value.id)
  } finally {
    matchupsLoading.value = false
  }
}

function openAddMatchup() {
  muTitle.value = ''
  muOpponentColors.value = []
  muOpponentDeckName.value = ''
  muDifficulty.value = 'even'
  muNotesFirst.value = ''
  muNotesSecond.value = ''
  muActiveNoteTab.value = 'first'
  addMatchupError.value = ''
  showAddMatchupModal.value = true
}

function toggleMatchupColor(color: string) {
  const idx = muOpponentColors.value.indexOf(color)
  if (idx === -1) {
    if (muOpponentColors.value.length < 3) muOpponentColors.value.push(color)
  } else {
    muOpponentColors.value.splice(idx, 1)
  }
}

async function handleAddMatchup() {
  if (!deck.value) return
  if (!muTitle.value.trim() && muOpponentColors.value.length === 0) {
    addMatchupError.value = 'Please provide a title or select at least one color.'
    return
  }
  addMatchupSaving.value = true
  addMatchupError.value = ''
  try {
    const payload: Omit<DeckMatchup, 'id'> = {
      difficulty: muDifficulty.value,
      opponentColors: [...muOpponentColors.value],
    }
    if (muTitle.value.trim()) payload.title = muTitle.value.trim()
    if (muOpponentDeckName.value.trim()) payload.opponentDeckName = muOpponentDeckName.value.trim()
    if (muNotesFirst.value.trim()) payload.notesGoingFirst = muNotesFirst.value.trim()
    if (muNotesSecond.value.trim()) payload.notesGoingSecond = muNotesSecond.value.trim()
    const id = await saveMatchup(deck.value.id, payload)
    matchups.value.unshift({ id, ...payload })
    showAddMatchupModal.value = false
  } finally {
    addMatchupSaving.value = false
  }
}

async function handleDeleteMatchup(matchupId: string) {
  if (!deck.value) return
  await deleteMatchup(deck.value.id, matchupId)
  matchups.value = matchups.value.filter((m) => m.id !== matchupId)
  if (expandedMatchup.value === matchupId) expandedMatchup.value = null
}

function matchupDisplayTitle(mu: DeckMatchup): string {
  if (mu.title) return mu.title
  const parts: string[] = []
  if (mu.opponentColors.length) parts.push(mu.opponentColors.join(' / '))
  if (mu.opponentDeckName) parts.push(mu.opponentDeckName)
  return parts.join(' · ') || 'Untitled Matchup'
}
</script>

<template>
  <div class="min-h-screen bg-ds-midnight text-ds-soft-white">

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center h-64">
      <div class="w-10 h-10 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="flex flex-col items-center justify-center h-64 gap-4">
      <p class="text-ds-slate text-lg">Deck not found.</p>
      <RouterLink to="/gallery" class="text-ds-gold hover:text-ds-cyan text-sm">← Back to Gallery</RouterLink>
    </div>

    <template v-else-if="deck">
      <!-- ── Hero Header ───────────────────────────────────────────────────── -->
      <div class="border-b border-ds-neon/20 bg-ds-navy/60 px-4 sm:px-6 py-4 sm:py-5">
        <div class="max-w-[1400px] mx-auto">
          <!-- Top row -->
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl sm:text-3xl font-bold text-ds-soft-white">{{ deck.name }}</h1>
              <span class="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider" :class="statusClass">
                {{ statusLabel }}
              </span>
            </div>
            <!-- Right actions -->
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-if="isOwner"
                @click="editDeck"
                class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ds-slate border border-ds-neon/30 hover:border-ds-neon rounded-lg transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Build
              </button>

              <button
                v-if="!isOwner"
                @click="copyToBuilder"
                class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ds-slate border border-ds-neon/30 hover:border-ds-cyan/60 hover:text-ds-soft-white rounded-lg transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 10h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Copy
              </button>

              <!-- Export dropdown -->
              <div class="relative" ref="exportMenuRef">
                <button
                  @click="showExportMenu = !showExportMenu"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ds-slate border border-ds-neon/30 hover:border-ds-neon rounded-lg transition-colors"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Export
                  <svg class="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div
                  v-if="showExportMenu"
                  class="absolute right-0 top-full mt-1.5 bg-ds-navy border border-ds-neon/20 rounded-xl shadow-2xl z-20 py-1.5 w-52"
                >
                  <button
                    @click="showExportImageModal = true; showExportMenu = false"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ds-slate hover:bg-ds-midnight hover:text-ds-soft-white transition-colors"
                  >
                    <svg class="w-4 h-4 shrink-0 text-ds-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div class="text-left">
                      <p class="font-medium">Deck Image</p>
                      <p class="text-xs text-ds-slate/60">Shareable visual</p>
                    </div>
                  </button>
                  <button
                    @click="showExportProxiesModal = true; showExportMenu = false"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ds-slate hover:bg-ds-midnight hover:text-ds-soft-white transition-colors"
                  >
                    <svg class="w-4 h-4 shrink-0 text-ds-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    <div class="text-left">
                      <p class="font-medium">Proxy Cards</p>
                      <p class="text-xs text-ds-slate/60">Print-ready proxies</p>
                    </div>
                  </button>
                  <div class="border-t border-ds-neon/20 my-1"></div>
                  <button
                    @click="exportDeck(); showExportMenu = false"
                    class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ds-slate hover:bg-ds-midnight hover:text-ds-soft-white transition-colors"
                  >
                    <svg class="w-4 h-4 shrink-0 text-ds-slate/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <div class="text-left">
                      <p class="font-medium">Export JSON</p>
                      <p class="text-xs text-ds-slate/60">Card list as JSON</p>
                    </div>
                  </button>
                </div>
              </div>
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
                class="w-6 h-6 rounded-full border border-ds-neon/30"
              />
              <div v-else class="w-6 h-6 rounded-full bg-ds-navy flex items-center justify-center text-xs text-ds-slate">
                {{ (deck.ownerName ?? '?')[0] }}
              </div>
              <span class="text-sm text-ds-soft-white">{{ deck.ownerName }}</span>
            </div>

            <div v-if="deck.isPublic" class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] uppercase tracking-wider text-ds-slate/60">Archetype</span>

              <template v-if="isOwner">
                <button
                  v-for="option in archetypeOptions"
                  :key="option.value"
                  @click="setArchetypeTag(option.value)"
                  :disabled="archetypeSaving"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  :class="selectedArchetypeTag === option.value
                    ? option.activeClass
                    : 'text-ds-slate border-ds-neon/25 hover:text-ds-soft-white hover:border-ds-neon/50'"
                >
                  {{ option.label }}
                </button>
              </template>

              <span
                v-else-if="selectedArchetypeTag"
                class="text-[10px] font-semibold px-2 py-0.5 rounded border"
                :class="archetypeActiveClass(selectedArchetypeTag)"
              >
                {{ archetypeLabel(selectedArchetypeTag) }}
              </span>
            </div>

            <!-- Vote button -->
            <button
              @click="vote"
              :disabled="voted || !auth.isLoggedIn || votingLoading"
              class="flex items-center gap-1 text-sm transition-colors"
              :class="voted ? 'text-pink-400 cursor-default' : 'text-ds-slate/50 hover:text-pink-400'"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              {{ deck.votes ?? 0 }}
            </button>

            <span class="text-ds-slate/50 text-xs">
              {{ totalMainCount }} main cards · {{ totalEggCount }} eggs
            </span>

            <!-- QR code (always present once deck is saved) -->
            <a
              v-if="deck.qrCodeUrl"
              :href="deck.qrCodeUrl"
              target="_blank"
              class="ml-auto shrink-0"
              title="Scan to open this deck"
            >
              <img
                :src="`https://api.qrserver.com/v1/create-qr-code/?size=48x48&data=${encodeURIComponent(deck.qrCodeUrl)}&bgcolor=111827&color=EAB308&format=png&margin=1`"
                alt="QR code"
                class="w-10 h-10 rounded opacity-70 hover:opacity-100 transition-opacity"
              />
            </a>
          </div>

          <!-- Tabs -->
          <div class="overflow-x-auto -mx-4 sm:mx-0">
            <div class="flex items-center gap-1 mt-5 border-b border-ds-neon/20 -mb-px min-w-max sm:min-w-0 px-4 sm:px-0">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                @click="activeTab = tab.key"
                class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
                :class="activeTab === tab.key
                  ? 'text-ds-gold border-ds-gold'
                  : 'text-ds-slate border-transparent hover:text-ds-soft-white'"
              >
                {{ tab.label }}
                <span v-if="tab.key === 'deck'" class="ml-1 text-xs text-ds-slate/40">
                  {{ totalMainCount + totalEggCount }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Content ───────────────────────────────────────────────────────── -->
      <div class="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6">

        <!-- ── DECK TAB ─────────────────────────────────────────────────────── -->
        <div v-if="activeTab === 'deck'" class="flex flex-col lg:flex-row gap-6">

          <!-- Left: card sections -->
          <div class="flex-1 min-w-0 space-y-8">

            <!-- View toggle -->
            <div class="flex justify-end">
              <div class="flex items-center bg-ds-navy border border-ds-neon/20 rounded-lg p-0.5 text-xs font-medium">
                <button
                  @click="expandedView = false"
                  class="px-3 py-1.5 rounded-md transition-colors"
                  :class="!expandedView ? 'bg-ds-midnight text-ds-soft-white' : 'text-ds-slate hover:text-ds-soft-white'"
                >Grouped</button>
                <button
                  @click="expandedView = true"
                  class="px-3 py-1.5 rounded-md transition-colors"
                  :class="expandedView ? 'bg-ds-midnight text-ds-soft-white' : 'text-ds-slate hover:text-ds-soft-white'"
                >All copies</button>
              </div>
            </div>

            <!-- Digi-Egg Deck -->
            <section v-if="eggCards.length > 0">
              <div class="flex items-center gap-3 mb-4">
                <h2 class="text-xs font-bold uppercase tracking-widest text-ds-gold">Digi-Egg Deck</h2>
                <span class="text-xs font-mono text-ds-slate/60">{{ totalEggCount }}/5</span>
              </div>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="item in displayEggs"
                  :key="item.key"
                  class="relative cursor-pointer group"
                  @click="openCard(item.card)"
                >
                  <div
                    class="w-20 sm:w-28 rounded-lg overflow-hidden border-2 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-black/60"
                    :class="cardBorder(item.card.color)"
                  >
                    <div class="aspect-[2/3] bg-ds-midnight">
                      <img
                        v-if="item.card.imgurl"
                        :src="item.card.imgurl"
                        :alt="item.card.name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <!-- Quantity badge (top-right) -->
                  <div
                    v-if="item.qty > 1"
                    class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ds-gold text-ds-midnight text-xs font-bold flex items-center justify-center shadow"
                  >x{{ item.qty }}</div>
                  <div
                    v-if="cardPriceLabel(item.card.cardnumber, item.qty)"
                    class="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-ds-gold font-semibold"
                  >
                    {{ cardPriceLabel(item.card.cardnumber, item.qty) }}
                  </div>
                </div>
              </div>
            </section>

            <!-- Main Deck by type -->
            <section v-for="group in displayMainByType" :key="group.type">
              <div class="flex items-center gap-3 mb-4">
                <h2 class="text-xs font-bold uppercase tracking-widest text-ds-slate">{{ group.type }}</h2>
                <span class="text-xs font-mono text-ds-slate/40">{{ group.totalCount }}</span>
              </div>
              <div class="flex flex-wrap gap-3">
                <div
                  v-for="item in group.cards"
                  :key="item.key"
                  class="relative cursor-pointer group"
                  @click="openCard(item.card)"
                >
                  <div
                    class="w-20 sm:w-28 rounded-lg overflow-hidden border-2 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-black/60"
                    :class="cardBorder(item.card.color)"
                  >
                    <div class="aspect-[2/3] bg-ds-midnight">
                      <img
                        v-if="item.card.imgurl"
                        :src="item.card.imgurl"
                        :alt="item.card.name"
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div v-else class="w-full h-full flex items-center justify-center text-ds-slate/50 text-[10px] text-center p-1">
                        {{ item.card.name }}
                      </div>
                    </div>
                    <!-- Card name bar -->
                    <div class="bg-ds-navy/90 px-1.5 py-0.5">
                      <p class="text-[9px] text-ds-soft-white/80 truncate">{{ item.card.name }}</p>
                    </div>
                  </div>
                  <!-- Quantity badge -->
                  <div
                    v-if="item.qty > 1"
                    class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ds-gold text-ds-midnight text-xs font-bold flex items-center justify-center shadow"
                  >x{{ item.qty }}</div>
                  <!-- Single qty indicator (grouped mode only) -->
                  <div
                    v-else-if="!expandedView"
                    class="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-ds-navy text-ds-slate text-[10px] font-bold flex items-center justify-center"
                  >1</div>
                  <div
                    v-if="cardPriceLabel(item.card.cardnumber, item.qty)"
                    class="absolute left-1.5 bottom-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-ds-gold font-semibold"
                  >
                    {{ cardPriceLabel(item.card.cardnumber, item.qty) }}
                  </div>
                </div>
              </div>
            </section>

            <!-- Empty deck -->
            <div v-if="eggCards.length === 0 && mainCards.length === 0" class="text-center py-20 text-ds-slate/40">
              This deck has no cards.
            </div>
          </div>

          <!-- Right: stats panel -->
          <div class="w-full lg:w-96 shrink-0">
            <div class="sticky top-20 space-y-5 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <div class="bg-ds-navy border border-ds-neon/20 rounded-xl p-6 space-y-6">

              <!-- Key metrics -->
              <div class="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div class="text-4xl font-bold text-ds-soft-white">{{ totalMainCount }}</div>
                  <div class="text-[11px] text-ds-slate/60 uppercase tracking-wider mt-1">Cards</div>
                </div>
                <div>
                  <div class="text-4xl font-bold text-ds-soft-white">{{ avgLevel }}</div>
                  <div class="text-[11px] text-ds-slate/60 uppercase tracking-wider mt-1">Avg Lv</div>
                </div>
                <div>
                  <div class="text-4xl font-bold text-ds-soft-white">{{ avgDP }}k</div>
                  <div class="text-[11px] text-ds-slate/60 uppercase tracking-wider mt-1">Avg DP</div>
                </div>
              </div>

              <div class="border-t border-ds-neon/20" />

              <!-- Level curve -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold text-ds-soft-white/80 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-ds-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                    Level curve
                  </span>
                  <span class="text-[10px] text-ds-slate/40">AVG {{ avgLevel }}</span>
                </div>
                <div v-if="levelCurve.some(b => b.count > 0)" class="space-y-0">
                  <!-- Numbers above bars -->
                  <div class="flex items-end gap-1 h-28">
                    <div
                      v-for="bucket in levelCurve"
                      :key="bucket.lv"
                      class="flex-1 flex flex-col items-center justify-end gap-0.5"
                    >
                      <span v-if="bucket.count > 0" class="text-[10px] text-ds-slate/60">{{ bucket.count }}</span>
                      <div
                        class="w-full rounded-t-sm bg-ds-gold transition-all"
                        :style="{ height: bucket.count ? `${(bucket.count / maxLevelCount) * 80}px` : '2px', opacity: bucket.count ? 1 : 0.15 }"
                      />
                    </div>
                  </div>
                  <!-- X axis labels -->
                  <div class="flex gap-1">
                    <div
                      v-for="bucket in levelCurve"
                      :key="bucket.lv"
                      class="flex-1 text-center text-[10px] text-ds-slate/40 pt-1"
                    >{{ bucket.lv }}</div>
                  </div>
                </div>
                <p v-else class="text-xs text-ds-slate/40">No level data</p>
              </div>

              <!-- Play cost curve (Tamers + Options) -->
              <div v-if="costCurve.length > 0">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold text-ds-soft-white/80 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-ds-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Cost curve
                  </span>
                </div>
                <div class="flex items-end gap-1 h-28">
                  <div
                    v-for="bucket in costCurve"
                    :key="bucket.cost"
                    class="flex-1 flex flex-col items-center justify-end gap-0.5"
                  >
                    <span v-if="bucket.count > 0" class="text-[10px] text-ds-slate/60">{{ bucket.count }}</span>
                    <div
                      class="w-full rounded-t-sm bg-ds-royal transition-all"
                      :style="{ height: bucket.count ? `${(bucket.count / maxCostCount) * 80}px` : '2px', opacity: bucket.count ? 1 : 0.15 }"
                    />
                  </div>
                </div>
                <div class="flex gap-1 mt-0.5">
                  <div
                    v-for="bucket in costCurve"
                    :key="bucket.cost"
                    class="flex-1 text-center text-[10px] text-ds-slate/40"
                  >{{ bucket.cost }}</div>
                </div>
              </div>

              <div class="border-t border-ds-neon/20" />

              <!-- Color distribution -->
              <div v-if="colorMap.length > 0">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs font-semibold text-ds-soft-white/80 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-ds-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path stroke-linecap="round" stroke-width="2" d="M12 2a10 10 0 010 20"/></svg>
                    Colors
                  </span>
                  <span class="text-[10px] text-ds-slate/40">{{ colorMap.length }} ACTIVE</span>
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
                      <span class="text-xs text-ds-slate">{{ item.color }}</span>
                    </div>
                    <span class="text-xs font-mono text-ds-slate/50">{{ item.count }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description / video -->
            <div v-if="deck.description || deck.videoUrl" class="bg-ds-navy border border-ds-neon/20 rounded-xl p-5 space-y-3">
              <p v-if="deck.description" class="text-sm text-ds-soft-white/80 leading-relaxed">{{ deck.description }}</p>
              <div v-if="deck.videoUrl" class="aspect-video rounded-lg overflow-hidden bg-ds-midnight">
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
            <!-- Header row -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <h2 class="text-xs font-bold uppercase tracking-widest text-ds-soft-white">Guide</h2>
                <span v-if="guideEditing" class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-600/40 uppercase tracking-wider">Editing</span>
              </div>
              <!-- Edit controls -->
              <div v-if="isOwner" class="flex items-center gap-2">
                <template v-if="guideEditing">
                  <BaseButton variant="secondary" size="sm" @click="cancelEditGuide">
                    <template #icon><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></template>
                    Cancel
                  </BaseButton>
                  <button @click="handleSaveGuide" :disabled="guideSaving" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-ds-gold hover:bg-ds-gold/80 disabled:bg-ds-navy disabled:text-ds-slate text-ds-midnight rounded-lg transition-colors">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    {{ guideSaving ? 'Saving…' : 'Save Guide' }}
                  </button>
                </template>
                <BaseButton v-else variant="accent" size="sm" @click="startEditGuide">
                  <template #icon><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></template>
                  {{ deck.guide ? 'Edit Guide' : 'Write a guide' }}
                </BaseButton>
              </div>
            </div>

            <!-- Editor -->
            <div v-if="guideEditing">
              <textarea
                v-model="guideDraft"
                rows="14"
                placeholder="Start writing your guide…"
                class="w-full bg-ds-navy border border-ds-gold/40 text-ds-soft-white text-sm rounded-xl px-5 py-4 focus:outline-none focus:border-ds-gold resize-none leading-relaxed placeholder:text-ds-slate/40"
              />
            </div>

            <!-- Display -->
            <div v-else-if="deck.guide" class="bg-ds-navy border border-ds-neon/20 rounded-xl px-6 py-5 text-ds-soft-white/80 text-sm leading-relaxed whitespace-pre-wrap">
              {{ deck.guide }}
            </div>

            <!-- Empty state -->
            <div v-else class="bg-ds-navy border border-ds-neon/20 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <svg class="w-10 h-10 text-ds-slate/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <p class="text-ds-slate font-medium">No guide yet</p>
              <p class="text-sm text-ds-slate/40">Share how to pilot this deck with the community.</p>
            </div>
          </section>
        </div>

        <!-- ── MATCHUPS TAB ──────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'matchups'">
          <section class="mb-10 space-y-5">

            <!-- Header -->
            <div class="flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase tracking-widest text-ds-soft-white">Matchup Guide</h2>
              <button v-if="isOwner" @click="openAddMatchup" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-ds-gold hover:bg-ds-gold/80 text-ds-midnight rounded-lg transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                New Matchup
              </button>
            </div>

            <!-- Loading -->
            <div v-if="matchupsLoading" class="flex justify-center py-10">
              <div class="w-8 h-8 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
            </div>

            <!-- Matchup cards -->
            <div v-else-if="matchups.length > 0" class="space-y-2">
              <div
                v-for="mu in matchups"
                :key="mu.id"
                class="bg-ds-navy border border-ds-neon/20 rounded-xl overflow-hidden"
              >
                <!-- Card header (always visible) -->
                <button
                  class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-ds-midnight/60 transition-colors text-left"
                  @click="expandedMatchup = expandedMatchup === mu.id ? null : mu.id"
                >
                  <!-- Color dots -->
                  <div class="flex items-center gap-1 shrink-0">
                    <span
                      v-for="color in mu.opponentColors"
                      :key="color"
                      class="w-3 h-3 rounded-full border border-black/30"
                      :class="COLOR_DOT[color] ?? 'bg-gray-500'"
                    />
                    <span v-if="mu.opponentColors.length === 0" class="w-3 h-3 rounded-full bg-ds-navy" />
                  </div>

                  <!-- Title + archetype -->
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-ds-soft-white truncate">{{ matchupDisplayTitle(mu) }}</p>
                    <p v-if="mu.opponentDeckName && mu.title" class="text-xs text-ds-slate/50 truncate">{{ mu.opponentDeckName }}</p>
                  </div>

                  <!-- Difficulty badge -->
                  <span
                    class="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider"
                    :class="DIFFICULTY_STYLE[mu.difficulty]"
                  >{{ mu.difficulty }}</span>

                  <!-- Note indicators -->
                  <div class="flex items-center gap-1 shrink-0">
                    <span v-if="mu.notesGoingFirst" class="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Has Going First notes" />
                    <span v-if="mu.notesGoingSecond" class="w-1.5 h-1.5 rounded-full bg-blue-400" title="Has Going Second notes" />
                  </div>

                  <!-- Chevron -->
                  <svg
                    class="w-4 h-4 text-ds-slate/40 transition-transform duration-200 shrink-0"
                    :class="expandedMatchup === mu.id ? 'rotate-180' : ''"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  ><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>

                <!-- Expanded notes -->
                <div v-if="expandedMatchup === mu.id" class="border-t border-ds-neon/20 px-4 pb-4 pt-3 space-y-4">
                  <!-- Going First / Second tabs -->
                  <div class="flex items-center gap-0 border-b border-ds-neon/20 -mx-4 px-4">
                    <span class="text-xs font-semibold py-2 pr-4 border-b-2 border-ds-gold text-ds-gold">Going First</span>
                    <span class="text-xs text-ds-slate/40 py-2 px-4 border-b-2 border-transparent">Going Second</span>
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-[10px] uppercase tracking-widest text-ds-gold mb-2 font-semibold">Going First</p>
                      <p v-if="mu.notesGoingFirst" class="text-sm text-ds-soft-white/80 whitespace-pre-wrap leading-relaxed">{{ mu.notesGoingFirst }}</p>
                      <p v-else class="text-sm text-ds-slate/40 italic">No notes yet.</p>
                    </div>
                    <div>
                      <p class="text-[10px] uppercase tracking-widest text-ds-cyan mb-2 font-semibold">Going Second</p>
                      <p v-if="mu.notesGoingSecond" class="text-sm text-ds-soft-white/80 whitespace-pre-wrap leading-relaxed">{{ mu.notesGoingSecond }}</p>
                      <p v-else class="text-sm text-ds-slate/40 italic">No notes yet.</p>
                    </div>
                  </div>
                  <div v-if="isOwner" class="flex justify-end pt-1">
                    <button @click="handleDeleteMatchup(mu.id)" class="text-xs text-ds-slate/40 hover:text-red-400 transition-colors flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="bg-ds-navy border border-ds-neon/20 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <svg class="w-10 h-10 text-ds-slate/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <p class="text-ds-slate font-medium">No matchup notes yet</p>
              <p class="text-sm text-ds-slate/40">Document your experience against different deck colors to help readers.</p>
            </div>
          </section>
        </div>

        <!-- ── MATCHES TAB ───────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'matches'">
          <section class="mb-10 space-y-5">

            <!-- Stats bar -->
            <div v-if="matches.length > 0" class="grid grid-cols-4 gap-3">
              <div class="bg-ds-navy border border-ds-neon/20 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-ds-soft-white">{{ matchStats.total }}</p>
                <p class="text-xs text-ds-slate/50 mt-1 uppercase tracking-widest">Games</p>
              </div>
              <div class="bg-ds-navy border border-ds-neon/20 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-green-400">{{ matchStats.wins }}</p>
                <p class="text-xs text-ds-slate/50 mt-1 uppercase tracking-widest">Wins</p>
              </div>
              <div class="bg-ds-navy border border-ds-neon/20 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold text-red-400">{{ matchStats.losses }}</p>
                <p class="text-xs text-ds-slate/50 mt-1 uppercase tracking-widest">Losses</p>
              </div>
              <div class="bg-ds-navy border border-ds-neon/20 rounded-xl p-4 text-center">
                <p class="text-2xl font-bold" :class="matchStats.winRate >= 50 ? 'text-ds-gold' : 'text-ds-slate'">
                  {{ matchStats.winRate }}%
                </p>
                <p class="text-xs text-ds-slate/50 mt-1 uppercase tracking-widest">Win Rate</p>
              </div>
            </div>

            <!-- Header -->
            <div class="flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase tracking-widest text-ds-soft-white">Match History</h2>
              <button v-if="isOwner" @click="openAddMatch" class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-ds-gold hover:bg-ds-gold/80 text-ds-midnight rounded-lg transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Record match
              </button>
            </div>

            <!-- Loading -->
            <div v-if="matchesLoading" class="flex justify-center py-10">
              <div class="w-8 h-8 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
            </div>

            <!-- Match list -->
            <div v-else-if="matches.length > 0" class="space-y-2">
              <div
                v-for="match in matches"
                :key="match.id"
                class="bg-ds-navy border border-ds-neon/20 rounded-xl px-4 py-3 flex items-center gap-4"
              >
                <!-- Result badge -->
                <span
                  class="shrink-0 w-12 text-center text-xs font-bold py-1 rounded-lg uppercase tracking-wider"
                  :class="{
                    'bg-green-500/20 text-green-400 border border-green-600/50': match.result === 'win',
                    'bg-red-500/20 text-red-400 border border-red-600/50': match.result === 'loss',
                    'bg-ds-midnight text-ds-slate/60 border border-ds-neon/30': match.result === 'draw',
                  }"
                >{{ match.result === 'win' ? 'WIN' : match.result === 'loss' ? 'LOSS' : 'DRAW' }}</span>

                <!-- Color dots + opponent info -->
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="flex items-center gap-0.5 shrink-0">
                    <span
                      v-for="color in match.opponentColors"
                      :key="color"
                      class="w-3 h-3 rounded-full border border-black/30"
                      :class="COLOR_DOT[color] ?? 'bg-gray-500'"
                    />
                    <span v-if="!match.opponentColors?.length" class="w-3 h-3 rounded-full bg-ds-navy" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm text-ds-soft-white font-medium truncate">
                      {{ (match.opponentColors ?? []).join(' / ') || 'Unknown' }}
                      <span v-if="match.opponentDeckName" class="text-ds-slate font-normal"> · {{ match.opponentDeckName }}</span>
                    </p>
                    <p v-if="match.opponentName" class="text-xs text-ds-slate/50 truncate">vs {{ match.opponentName }}</p>
                  </div>
                </div>

                <!-- Score -->
                <div v-if="match.result !== 'draw'" class="shrink-0 text-sm font-mono font-semibold text-ds-soft-white/80">
                  <span class="text-green-400">{{ match.wonGames }}</span>
                  <span class="text-ds-slate/30"> — </span>
                  <span class="text-red-400">{{ match.lostGames }}</span>
                </div>

                <!-- Dice icon -->
                <svg v-if="match.wonDiceRoll" class="shrink-0 w-4 h-4 text-yellow-500" title="Won dice roll" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm2 4a1 1 0 110 2 1 1 0 010-2zm10 0a1 1 0 110 2 1 1 0 010-2zM12 11a1 1 0 110 2 1 1 0 010-2zm-5 4a1 1 0 110 2 1 1 0 010-2zm10 0a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>

                <!-- Delete (owner only) -->
                <button v-if="isOwner" @click="handleDeleteMatch(match.id)" class="shrink-0 text-ds-slate/30 hover:text-red-400 transition-colors" title="Delete match">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="bg-ds-navy border border-ds-neon/20 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
              <svg class="w-10 h-10 text-ds-slate/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-ds-slate font-medium">No matches recorded yet</p>
              <p class="text-sm text-ds-slate/40">Track your game results to see your win rate and performance.</p>
            </div>
          </section>
        </div>

        <!-- ── VERSIONS TAB ──────────────────────────────────────────────────── -->
        <div v-else-if="activeTab === 'versions'">
          <DeckVersionsTab :deck-id="deck.id" :current-version="deck.currentVersion" />
        </div>

      </div>
    </template>

    <!-- Card detail modal -->
    <CardDetailModal
      v-if="showModal && selectedCard"
      :card="selectedCard"
      :visible="showModal"
      @close="showModal = false"
    />

    <!-- Export modals -->
    <ExportImageModal
      v-if="showExportImageModal && deck"
      :deck="deck"
      @close="showExportImageModal = false"
    />
    <ExportProxiesModal
      v-if="showExportProxiesModal && deck"
      :deck="deck"
      @close="showExportProxiesModal = false"
    />

    <!-- ── Add Match Modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showAddMatchModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        @click.self="showAddMatchModal = false"
      >
        <div class="bg-ds-navy border border-ds-neon/30 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">

          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-ds-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.09 6.41H21l-5.47 3.97 2.09 6.41L12 14.82l-5.62 4.07 2.09-6.41L3 8.41h6.91z"/></svg>
              <h2 class="text-ds-soft-white font-semibold text-base">Add Match Result</h2>
            </div>
            <button @click="showAddMatchModal = false" class="text-ds-slate hover:text-ds-soft-white text-xl leading-none">&times;</button>
          </div>
          <p class="text-xs text-ds-slate/50 -mt-3">Record the outcome of your match to track your performance.</p>

          <!-- Opponent color -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-ds-soft-white/80">Opponent Deck Colors <span class="text-ds-gold">*</span> <span class="text-ds-slate/40">(up to 3)</span></label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in DIGIMON_COLORS"
                :key="color"
                @click="toggleMatchColor(color)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                :class="matchOpponentColors.includes(color)
                  ? 'border-ds-gold bg-ds-gold/10 text-ds-soft-white'
                  : 'border-ds-neon/30 text-ds-slate hover:border-ds-neon/60'"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="COLOR_DOT[color]" />
                {{ color }}
              </button>
            </div>
          </div>

          <!-- Deck name (optional) -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ds-soft-white/80">Opponent Deck Archetype <span class="text-ds-slate/40">(optional)</span></label>
            <input v-model="matchOpponentDeckName" type="text" placeholder="e.g. Agumon, BanchoLilimon…" class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-cyan outline-none" />
          </div>

          <!-- Opponent name (optional) -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ds-soft-white/80">
              <span class="inline-flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-ds-slate/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                Opponent Name <span class="text-ds-slate/40">(optional)</span>
              </span>
            </label>
            <input v-model="matchOpponentName" type="text" placeholder="Enter username…" class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-cyan outline-none" />
          </div>

          <!-- Match result -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-ds-soft-white/80">Match Result <span class="text-ds-gold">*</span></label>
            <div class="bg-ds-midnight border border-ds-neon/20 rounded-xl p-4">
              <div class="flex items-center justify-center gap-8 mb-3">
                <!-- WON counter -->
                <div class="flex flex-col items-center gap-2">
                  <span class="text-xs font-semibold text-green-400 uppercase tracking-widest">WON</span>
                  <div class="flex items-center gap-3">
                    <button @click="matchWonGames = Math.max(0, matchWonGames - 1)" :disabled="matchIsDraw" class="text-ds-slate hover:text-ds-soft-white disabled:opacity-30 text-lg leading-none">−</button>
                    <span class="text-3xl font-bold text-green-400 w-8 text-center tabular-nums">{{ matchIsDraw ? '—' : matchWonGames }}</span>
                    <button @click="matchWonGames++" :disabled="matchIsDraw" class="text-ds-slate hover:text-ds-soft-white disabled:opacity-30 text-lg leading-none">+</button>
                  </div>
                </div>
                <span class="text-ds-slate/30 text-xl font-light">—</span>
                <!-- LOST counter -->
                <div class="flex flex-col items-center gap-2">
                  <span class="text-xs font-semibold text-red-400 uppercase tracking-widest">LOST</span>
                  <div class="flex items-center gap-3">
                    <button @click="matchLostGames = Math.max(0, matchLostGames - 1)" :disabled="matchIsDraw" class="text-ds-slate hover:text-ds-soft-white disabled:opacity-30 text-lg leading-none">−</button>
                    <span class="text-3xl font-bold text-red-400 w-8 text-center tabular-nums">{{ matchIsDraw ? '—' : matchLostGames }}</span>
                    <button @click="matchLostGames++" :disabled="matchIsDraw" class="text-ds-slate hover:text-ds-soft-white disabled:opacity-30 text-lg leading-none">+</button>
                  </div>
                </div>
              </div>
              <p v-if="!matchIsDraw" class="text-center text-xs text-ds-slate/40">Enter score</p>
              <!-- Intentional Draw -->
              <button
                @click="matchIsDraw = !matchIsDraw"
                class="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-medium transition-colors"
                :class="matchIsDraw
                  ? 'border-ds-gold/60 bg-ds-gold/10 text-ds-gold'
                  : 'border-ds-neon/30 text-ds-slate hover:border-ds-neon/50 hover:text-ds-soft-white'"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="1.5"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h8"/></svg>
                Intentional Draw
              </button>
            </div>
          </div>

          <!-- Won dice roll -->
          <label class="flex items-center gap-3 bg-ds-midnight border border-ds-neon/20 rounded-xl px-4 py-3 cursor-pointer hover:border-ds-neon/40 transition-colors">
            <input v-model="matchWonDice" type="checkbox" class="w-4 h-4 accent-yellow-500" />
            <div class="flex items-center gap-2 text-sm text-ds-soft-white/80">
              <svg class="w-4 h-4 text-ds-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm2 4a1 1 0 110 2 1 1 0 010-2zm10 0a1 1 0 110 2 1 1 0 010-2zM12 11a1 1 0 110 2 1 1 0 010-2zm-5 4a1 1 0 110 2 1 1 0 010-2zm10 0a1 1 0 110 2 1 1 0 010-2z"/></svg>
              Won the dice roll
            </div>
          </label>

          <!-- Notes -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ds-soft-white/80">Notes <span class="text-ds-slate/40">(optional)</span></label>
            <textarea v-model="matchNotes" rows="2" placeholder="Key plays, observations…" class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-cyan outline-none resize-none" />
          </div>

          <p v-if="addMatchError" class="text-xs text-red-400">{{ addMatchError }}</p>

          <div class="flex gap-2 justify-end pt-1">
            <BaseButton variant="secondary" size="sm" @click="showAddMatchModal = false">Cancel</BaseButton>
            <button @click="handleAddMatch" :disabled="addMatchSaving" class="text-xs font-semibold bg-ds-gold hover:bg-ds-gold/80 disabled:bg-ds-navy disabled:text-ds-slate text-ds-midnight rounded-lg px-5 py-2 transition-colors">
              {{ addMatchSaving ? 'Saving…' : 'Add Match' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Add Matchup Modal ────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showAddMatchupModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        @click.self="showAddMatchupModal = false"
      >
        <div class="bg-ds-navy border border-ds-neon/30 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

          <!-- Header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-ds-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <h2 class="text-ds-soft-white font-semibold text-base">New Matchup</h2>
            </div>
            <button @click="showAddMatchupModal = false" class="text-ds-slate hover:text-ds-soft-white text-xl leading-none">&times;</button>
          </div>
          <p class="text-xs text-ds-slate/50 -mt-3">Document your strategy against a specific deck or color combination.</p>

          <!-- Custom Title (optional) -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ds-soft-white/80">Custom Title <span class="text-ds-slate/40">(optional)</span></label>
            <input v-model="muTitle" type="text" maxlength="60" placeholder="e.g. Agumon Bond, Lilithmon Loop…" class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-cyan outline-none" />
          </div>

          <!-- Opponent Colors (up to 3) -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-ds-soft-white/80">
              Opponent Colors
              <span class="text-ds-slate/40">(up to 3)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in DIGIMON_COLORS"
                :key="color"
                @click="toggleMatchupColor(color)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
                :class="muOpponentColors.includes(color)
                  ? 'border-ds-gold bg-ds-gold/10 text-ds-soft-white'
                  : 'border-ds-neon/30 text-ds-slate hover:border-ds-neon/60'"
              >
                <span class="w-2.5 h-2.5 rounded-full shrink-0" :class="COLOR_DOT[color]" />
                {{ color }}
              </button>
            </div>
          </div>

          <!-- Opponent Deck Archetype (optional) -->
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-ds-soft-white/80">Opponent Deck Archetype <span class="text-ds-slate/40">(optional)</span></label>
            <input v-model="muOpponentDeckName" type="text" placeholder="e.g. Agumon Bond, RustTyranomon…" class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-cyan outline-none" />
          </div>

          <!-- Difficulty -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-ds-soft-white/80">Matchup Difficulty</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in DIFFICULTY_OPTIONS"
                :key="opt.key"
                @click="muDifficulty = opt.key"
                class="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors"
                :class="muDifficulty === opt.key
                  ? DIFFICULTY_STYLE[opt.key]
                  : 'border-ds-neon/30 text-ds-slate hover:border-ds-neon/60'"
              >
                <span v-if="opt.key === 'favored'" class="text-base">▲</span>
                <span v-else-if="opt.key === 'even'" class="text-base">●</span>
                <span v-else class="text-base">▼</span>
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Strategy Notes tabs -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-medium text-ds-soft-white/80">Strategy Notes</label>
            <!-- Tab switcher -->
            <div class="flex border-b border-ds-neon/20 -mx-0 gap-0">
              <button
                @click="muActiveNoteTab = 'first'"
                class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors"
                :class="muActiveNoteTab === 'first' ? 'border-ds-gold text-ds-gold' : 'border-transparent text-ds-slate hover:text-ds-soft-white'"
              >
                Going First
              </button>
              <button
                @click="muActiveNoteTab = 'second'"
                class="px-4 py-2 text-xs font-semibold border-b-2 transition-colors"
                :class="muActiveNoteTab === 'second' ? 'border-ds-cyan text-ds-cyan' : 'border-transparent text-ds-slate hover:text-ds-soft-white'"
              >
                Going Second
              </button>
            </div>
            <div class="relative">
              <textarea
                v-if="muActiveNoteTab === 'first'"
                v-model="muNotesFirst"
                rows="4"
                maxlength="250"
                placeholder="Strategy when going first…"
                class="w-full bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-gold outline-none resize-none"
              />
              <textarea
                v-else
                v-model="muNotesSecond"
                rows="4"
                maxlength="250"
                placeholder="Strategy when going second…"
                class="w-full bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-cyan/30 focus:border-ds-cyan outline-none resize-none"
              />
              <span class="absolute bottom-2 right-3 text-[10px] text-ds-slate/40">
                {{ muActiveNoteTab === 'first' ? muNotesFirst.length : muNotesSecond.length }}/250
              </span>
            </div>
          </div>

          <p v-if="addMatchupError" class="text-xs text-red-400">{{ addMatchupError }}</p>

          <div class="flex gap-2 justify-end pt-1">
            <BaseButton variant="secondary" size="sm" @click="showAddMatchupModal = false">Cancel</BaseButton>
            <button @click="handleAddMatchup" :disabled="addMatchupSaving" class="text-xs font-semibold bg-ds-gold hover:bg-ds-gold/80 disabled:bg-ds-navy disabled:text-ds-slate text-ds-midnight rounded-lg px-5 py-2 transition-colors">
              {{ addMatchupSaving ? 'Saving…' : 'Save Matchup' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
