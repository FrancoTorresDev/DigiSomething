<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Deck } from '@/models/Deck'
import { getTopDecks } from '@/services/deckService'
import AdSlot from '@/components/ads/AdSlot.vue'

type FirestoreTimestampLike = {
  toDate?: () => Date
  seconds?: number
}

const loading = ref(true)
const error = ref<string | null>(null)
const loadWarning = ref<string | null>(null)
const decks = ref<Deck[]>([])
const brokenImages = ref(new Set<string>())
const topAdSlot = import.meta.env.VITE_ADSENSE_SLOT_COMMUNITY_TOP ?? ''
const inlineAdSlot = import.meta.env.VITE_ADSENSE_SLOT_COMMUNITY_INLINE ?? ''

const fallbackDecks: Deck[] = [
  {
    id: 'sample-blue-flare',
    ownerId: 'sample',
    name: 'Blue Flare Control',
    cards: [{ card: { name: 'Blue Flare', cardnumber: 'BT16-082', type: 'Digimon', color: 'Blue', rarity: 'R', imgurl: '/card-images/BT16-082.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 42,
    ownerName: 'Community'
  },
  {
    id: 'sample-lilith',
    ownerId: 'sample',
    name: 'Lilith Loop',
    cards: [{ card: { name: 'Lilithmon', cardnumber: 'BT15-081', type: 'Digimon', color: 'Purple', rarity: 'SR', imgurl: '/card-images/BT15-081.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 38,
    ownerName: 'Community'
  },
  {
    id: 'sample-royal',
    ownerId: 'sample',
    name: 'Royal Knights',
    cards: [{ card: { name: 'Alphamon', cardnumber: 'BT16-052', type: 'Digimon', color: 'Yellow', rarity: 'SR', imgurl: '/card-images/BT16-052.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 31,
    ownerName: 'Community'
  },
  {
    id: 'sample-blackwar',
    ownerId: 'sample',
    name: 'BlackWarGreymon X',
    cards: [{ card: { name: 'BlackWarGreymon X', cardnumber: 'BT16-077', type: 'Digimon', color: 'Black', rarity: 'SR', imgurl: '/card-images/BT16-077.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 28,
    ownerName: 'Community'
  },
  {
    id: 'sample-levia',
    ownerId: 'sample',
    name: 'Leviamon Control',
    cards: [{ card: { name: 'Leviamon', cardnumber: 'EX06-060', type: 'Digimon', color: 'Purple', rarity: 'SR', imgurl: '/card-images/EX06-060.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 26,
    ownerName: 'Community'
  },
  {
    id: 'sample-armor',
    ownerId: 'sample',
    name: 'Armor Rush',
    cards: [{ card: { name: 'Magnamon', cardnumber: 'BT16-020', type: 'Digimon', color: 'Yellow', rarity: 'SR', imgurl: '/card-images/BT16-020.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 23,
    ownerName: 'Community'
  },
  {
    id: 'sample-redhybrid',
    ownerId: 'sample',
    name: 'Red Hybrid Aggro',
    cards: [{ card: { name: 'Agnimon', cardnumber: 'BT16-013', type: 'Digimon', color: 'Red', rarity: 'R', imgurl: '/card-images/BT16-013.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 20,
    ownerName: 'Community'
  },
  {
    id: 'sample-bloom',
    ownerId: 'sample',
    name: 'Bloomlord Tempo',
    cards: [{ card: { name: 'Bloomlordmon', cardnumber: 'BT16-048', type: 'Digimon', color: 'Green', rarity: 'SR', imgurl: '/card-images/BT16-048.jpg' }, quantity: 1 }],
    isPublic: true,
    votes: 18,
    ownerName: 'Community'
  }
]

async function loadCommunityDecks(): Promise<void> {
  loading.value = true
  error.value = null
  loadWarning.value = null
  try {
    brokenImages.value.clear()
    decks.value = await getTopDecks(32)
  } catch {
    brokenImages.value.clear()
    decks.value = fallbackDecks
    loadWarning.value = 'Live community decks are unavailable right now, showing sample decks.'
  } finally {
    loading.value = false
  }
}

onMounted(loadCommunityDecks)

function getCoverImage(deck: Deck): string {
  if (deck.coverCardImage) return deck.coverCardImage
  const first = deck.cards.find((entry) => !!entry.card.imgurl)
  return first?.card.imgurl ?? ''
}

function getDominantColor(deck: Deck): string {
  const colorCounts = new Map<string, number>()
  for (const entry of deck.cards) {
    if (entry.card.type === 'Digi-Egg') continue
    const key = entry.card.color?.trim() || 'Unknown'
    colorCounts.set(key, (colorCounts.get(key) ?? 0) + entry.quantity)
  }
  let winner = 'Unknown'
  let max = -1
  for (const [color, count] of colorCounts) {
    if (count > max) {
      winner = color
      max = count
    }
  }
  return winner
}

function inferArchetype(deckName: string): string {
  const name = deckName.toLowerCase()
  if (name.includes('control')) return 'CONTROL'
  if (name.includes('aggro') || name.includes('rush')) return 'AGGRO'
  if (name.includes('combo')) return 'COMBO'
  if (name.includes('tempo')) return 'TEMPO'
  return 'MIDRANGE'
}

function resolveArchetypeTag(tag: Deck['archetypeTag']): string | null {
  if (!tag) return null
  if (tag === 'MIDRANGE_YELLOW' || tag === 'MIDRANGE') return 'MIDRANGE'
  if (tag === 'CONTROL_BLUE' || tag === 'CONTROL') return 'CONTROL'
  if (tag === 'AGGRO_RED' || tag === 'AGGRO') return 'AGGRO'
  return null
}

function getSetCode(deck: Deck): string {
  const firstMain = deck.cards.find((entry) => entry.card.type !== 'Digi-Egg')
  const cardNumber = firstMain?.card.cardnumber ?? ''
  const match = cardNumber.match(/^(BT|EX|ST|P)-?(\d{1,2})/i)
  if (!match) return 'MIXED'
  const prefix = match[1].toUpperCase()
  const number = match[2].padStart(2, '0')
  return `${prefix}${number}`
}

function getWinRate(deck: Deck): string | null {
  // Use only real match stats if present on the deck document.
  // Avoid synthetic percentages to prevent misleading users.
  const raw = deck as unknown as Record<string, unknown>
  const wins =
    typeof raw.matchWins === 'number' ? raw.matchWins
      : typeof raw.wins === 'number' ? raw.wins
      : null
  const losses =
    typeof raw.matchLosses === 'number' ? raw.matchLosses
      : typeof raw.losses === 'number' ? raw.losses
      : null

  if (wins == null || losses == null) return null

  const total = wins + losses
  if (total <= 0) return null

  const rate = (wins / total) * 100
  return `${rate.toFixed(1)}%`
}

function formatUpdated(createdAt: unknown): string {
  if (!createdAt) return 'Updated recently'

  if (createdAt instanceof Date) {
    return `Updated ${createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const ts = createdAt as FirestoreTimestampLike
  if (typeof ts.toDate === 'function') {
    const date = ts.toDate()
    return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  if (typeof ts.seconds === 'number') {
    const date = new Date(ts.seconds * 1000)
    return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  return 'Updated recently'
}

const colorClass: Record<string, string> = {
  Red: 'bg-red-500/15 text-red-300 border-red-400/30',
  Blue: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  Yellow: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
  Green: 'bg-green-500/15 text-green-300 border-green-400/30',
  Purple: 'bg-purple-500/15 text-purple-300 border-purple-400/30',
  Black: 'bg-gray-400/15 text-gray-300 border-gray-300/30',
  White: 'bg-zinc-500/15 text-zinc-200 border-zinc-300/30',
  Unknown: 'bg-slate-500/15 text-slate-300 border-slate-300/30'
}

const archetypeClass: Record<string, string> = {
  MIDRANGE: 'bg-yellow-500/15 text-yellow-300 border-yellow-400/30',
  CONTROL: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  AGGRO: 'bg-red-500/15 text-red-300 border-red-400/30'
}

const decoratedDecks = computed(() =>
  decks.value.map((deck, index) => {
    const dominantColor = getDominantColor(deck)
    const archetype = resolveArchetypeTag(deck.archetypeTag) ?? inferArchetype(deck.name)
    return {
      deck,
      isSample: deck.ownerId === 'sample',
      rank: index + 1,
      dominantColor,
      archetype,
      archetypePillClass: archetypeClass[archetype] ?? 'border-ds-cyan/25 bg-ds-cyan/10 text-ds-cyan',
      setCode: getSetCode(deck),
      coverImage: getCoverImage(deck),
      winRate: getWinRate(deck),
      updatedText: formatUpdated(deck.createdAt),
      colorPillClass: colorClass[dominantColor] ?? colorClass.Unknown
    }
  })
)
</script>

<template>
  <div class="max-w-screen-2xl mx-auto px-3 sm:px-6 py-6 sm:py-9 lg:px-8">
    <div class="mb-7">
      <h1 class="text-2xl sm:text-3xl font-bold text-ds-soft-white">Community Decks</h1>
      <p class="text-sm sm:text-base text-ds-slate mt-1">Trending public decks from the DigiSomething community</p>
    </div>

    <div v-if="topAdSlot" class="mb-6">
      <AdSlot :slot="topAdSlot" />
    </div>

    <div v-if="loading" class="flex justify-center py-24">
      <div class="w-11 h-11 border-2 border-ds-cyan border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else-if="error" class="text-center py-24 text-ds-slate">
      <p class="mb-3">{{ error }}</p>
      <button @click="loadCommunityDecks" class="text-ds-cyan hover:text-ds-soft-white transition-colors">Retry</button>
    </div>

    <div v-else-if="decoratedDecks.length === 0" class="text-center py-24 text-ds-slate">
      <p>No public community decks yet.</p>
      <RouterLink to="/deck-builder" class="text-ds-cyan hover:text-ds-soft-white transition-colors">Create the first one</RouterLink>
    </div>

    <div v-else>
      <div v-if="loadWarning" class="mb-4 rounded-lg border border-ds-cyan/25 bg-ds-cyan/10 px-3 py-2 text-xs text-ds-cyan">
        {{ loadWarning }}
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <component
        v-for="item in decoratedDecks"
        :key="item.deck.id"
        :is="item.isSample ? 'div' : RouterLink"
        :to="item.isSample ? undefined : { name: 'deck-detail', params: { id: item.deck.id } }"
        class="community-card group rounded-xl border border-ds-neon/20 overflow-hidden bg-ds-navy/70 hover:border-ds-cyan/60 transition-all duration-200"
      >
        <div class="relative h-28 overflow-hidden bg-ds-midnight/90">
          <img
            v-if="item.coverImage && !brokenImages.has(item.deck.id)"
            :src="item.coverImage"
            :alt="item.deck.name"
            class="h-full w-full object-cover opacity-92 group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
            @error="brokenImages.add(item.deck.id)"
          />
          <div v-else class="h-full w-full bg-gradient-to-br from-ds-royal/30 to-ds-midnight" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#03103A] via-[#03103A]/35 to-transparent" />
          <div class="absolute right-2 top-2 rounded-md border border-ds-cyan/35 bg-ds-midnight/80 px-1.5 py-0.5 text-[10px] font-semibold text-ds-cyan">
            #{{ item.rank }}
          </div>
        </div>

        <div class="p-3.5">
          <h2 class="text-ds-soft-white text-[1.05rem] font-semibold leading-tight line-clamp-1">
            {{ item.deck.name }}
          </h2>

          <div class="mt-2.5 flex flex-wrap gap-1.5">
            <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border" :class="item.colorPillClass">
              {{ item.dominantColor.toUpperCase() }}
            </span>
            <span class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold" :class="item.archetypePillClass">
              {{ item.archetype }}
            </span>
            <span class="inline-flex items-center rounded border border-ds-neon/20 bg-ds-midnight/50 px-1.5 py-0.5 text-[10px] font-semibold text-ds-slate">
              {{ item.setCode }}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p class="text-[10px] uppercase tracking-wide text-ds-slate/65">Win Rate</p>
              <p
                class="text-lg font-bold leading-none mt-1"
                :class="item.winRate ? 'text-ds-cyan' : 'text-ds-slate/55'"
              >
                {{ item.winRate ?? 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-[10px] uppercase tracking-wide text-ds-slate/65">Popularity</p>
              <p class="text-fuchsia-300 text-lg font-bold leading-none mt-1">#{{ item.rank }}</p>
            </div>
          </div>

          <div class="mt-3.5 flex items-center justify-between text-[11px] text-ds-slate/75">
            <span>{{ item.updatedText }}</span>
            <span class="inline-flex items-center gap-1">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-5M7 4H2v5M3 9a9 9 0 0115.5-3.5L22 9M2 15l3.5 3.5A9 9 0 0021 15" />
              </svg>
              {{ item.deck.votes ?? 0 }}
            </span>
          </div>
        </div>
      </component>
      </div>

      <div v-if="inlineAdSlot" class="mt-6">
        <AdSlot :slot="inlineAdSlot" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-card {
  box-shadow: inset 0 1px 0 rgba(30, 220, 255, 0.06), 0 12px 24px rgba(0, 0, 0, 0.30);
}
.community-card:hover {
  box-shadow:
    0 0 0 1px rgba(30, 220, 255, 0.24),
    0 0 18px rgba(30, 220, 255, 0.14),
    0 16px 32px rgba(0, 0, 0, 0.44),
    inset 0 1px 0 rgba(30, 220, 255, 0.12);
}
</style>
