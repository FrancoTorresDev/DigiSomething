<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  fetchTournaments,
  fetchStandings,
  type LimitlessTournament,
  type TournamentStanding
} from '@/services/tournamentService'

const CARD_IMAGE_BASE = '/card-images'

const tournaments = ref<LimitlessTournament[]>([])
const tournamentsLoading = ref(false)
const tournamentsError = ref<string | null>(null)

const selectedTournament = ref<LimitlessTournament | null>(null)
const standings = ref<TournamentStanding[]>([])
const standingsLoading = ref(false)
const standingsError = ref<string | null>(null)

const selectedStanding = ref<TournamentStanding | null>(null)
const deckCards = ref<{ cardnumber: string; count: number; imgurl: string }[]>([])

function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return ''
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateStr))
}

interface DeckEntry {
  cardnumber: string
  count: number
}

function extractDeckEntries(decklist: unknown): DeckEntry[] {
  if (!decklist || typeof decklist !== 'object') return []

  const parseEntry = (e: unknown): DeckEntry | null => {
    if (!e || typeof e !== 'object') return null
    const obj = e as Record<string, unknown>
    const cnt = (obj.count ?? obj.quantity ?? obj.qty) as number | undefined
    if (typeof cnt !== 'number') return null

    // Limitless DCG format: { set: "BT25", number: "083", count: 4, name: "..." }
    if (typeof obj.set === 'string' && typeof obj.number === 'string') {
      return { cardnumber: `${obj.set}-${obj.number}`, count: cnt }
    }

    // Generic format: { cardnumber: "BT25-083", count: 4 }
    const num = (obj.cardnumber ?? obj.code ?? obj.id) as string | undefined
    if (typeof num === 'string') return { cardnumber: num, count: cnt }

    return null
  }

  if (Array.isArray(decklist)) {
    return decklist.map(parseEntry).filter((e): e is DeckEntry => e !== null)
  }

  // Sectioned format: { digimon: [...], tamer: [...], option: [...], egg: [...] }
  const entries: DeckEntry[] = []
  for (const val of Object.values(decklist as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      for (const e of val) {
        const entry = parseEntry(e)
        if (entry) entries.push(entry)
      }
    }
  }
  return entries
}

async function loadTournaments() {
  tournamentsLoading.value = true
  tournamentsError.value = null
  tournaments.value = []
  selectedTournament.value = null
  standings.value = []
  try {
    tournaments.value = await fetchTournaments()
  } catch {
    tournamentsError.value = 'Failed to load tournaments.'
  } finally {
    tournamentsLoading.value = false
  }
}

async function selectTournament(t: LimitlessTournament) {
  if (selectedTournament.value?.id === t.id) return
  selectedTournament.value = t
  standings.value = []
  standingsLoading.value = true
  standingsError.value = null
  try {
    standings.value = await fetchStandings(t.id)
  } catch {
    standingsError.value = 'Failed to load standings.'
  } finally {
    standingsLoading.value = false
  }
}

async function openDeck(standing: TournamentStanding) {
  selectedStanding.value = standing
  deckCards.value = []
  const entries = extractDeckEntries(standing.decklist)
  if (entries.length === 0) return

  // Directly construct image URLs from card numbers — no per-card API calls needed.
  // Limitless sends numbers in the exact CDN format: BT25-046 (3-digit), ST23-01 (2-digit).
  deckCards.value = entries.map((e) => ({
    cardnumber: e.cardnumber,
    count: e.count,
    imgurl: `${CARD_IMAGE_BASE}/${e.cardnumber}.jpg`
  }))
}

function closeModal() {
  selectedStanding.value = null
  deckCards.value = []
}

onMounted(() => loadTournaments())
</script>

<template>
  <div class="max-w-screen-xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl sm:text-3xl font-bold text-ds-soft-white mb-1">Tournament Results</h1>
      <p class="text-ds-slate">Top standings and decklists from official Digimon TCG events</p>
    </div>

    <!-- Split layout -->
    <div class="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
      <!-- Left: Tournament list -->
      <div class="space-y-2 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div v-if="tournamentsLoading" class="flex justify-center py-10">
          <div
            class="w-8 h-8 border-2 border-ds-gold border-t-transparent rounded-full animate-spin"
          />
        </div>

        <div v-else-if="tournamentsError" class="text-center py-10 text-ds-slate">
          <p>{{ tournamentsError }}</p>
          <button
            @click="loadTournaments()"
            class="mt-2 text-sm text-ds-cyan hover:underline"
          >
            Retry
          </button>
        </div>

        <div
          v-else-if="tournaments.length === 0"
          class="text-center py-10 text-ds-slate/50 text-sm"
        >
          No tournaments found.
        </div>

        <button
          v-for="t in tournaments"
          :key="t.id"
          @click="selectTournament(t)"
          class="w-full text-left bg-ds-navy border rounded-xl px-4 py-3 transition-all hover:border-ds-neon/50"
          :class="
            selectedTournament?.id === t.id
              ? 'border-ds-gold/60 bg-ds-midnight'
              : 'border-ds-neon/20'
          "
        >
          <p class="text-ds-soft-white text-sm font-medium leading-tight mb-1 truncate">{{ t.name }}</p>
          <div class="flex items-center gap-2 text-xs text-ds-slate">
            <span>{{ formatDate(t.date) }}</span>
            <span>·</span>
            <span>{{ t.players }} players</span>
          </div>
        </button>
      </div>

      <!-- Right: Standings -->
      <div>
        <!-- Empty state -->
        <div
          v-if="!selectedTournament && !tournamentsLoading"
          class="h-64 flex items-center justify-center text-ds-slate/50 border border-dashed border-ds-neon/20 rounded-xl text-sm"
        >
          Select a tournament to see standings
        </div>

        <!-- Standings loading -->
        <div v-else-if="standingsLoading" class="flex justify-center py-16">
          <div
            class="w-8 h-8 border-2 border-ds-gold border-t-transparent rounded-full animate-spin"
          />
        </div>

        <!-- Standings error -->
        <div v-else-if="standingsError" class="text-center py-16 text-ds-slate text-sm">
          <p>{{ standingsError }}</p>
          <button
            v-if="selectedTournament"
            @click="selectTournament(selectedTournament)"
            class="mt-2 text-ds-cyan hover:underline"
          >
            Retry
          </button>
        </div>

        <!-- Standings table -->
        <div v-else-if="standings.length > 0">
          <h2 class="text-ds-soft-white font-semibold text-lg mb-3 truncate">
            {{ selectedTournament?.name }}
          </h2>
          <div class="bg-ds-navy border border-ds-neon/20 rounded-xl overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-ds-neon/20 text-ds-slate text-xs uppercase tracking-wide"
                >
                  <th class="text-left px-4 py-3 w-12">#</th>
                  <th class="text-left px-4 py-3">Player</th>
                  <th class="text-left px-4 py-3 hidden md:table-cell">Deck</th>
                  <th class="text-right px-4 py-3 hidden sm:table-cell">Record</th>
                  <th class="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="s in standings.slice(0, 64)"
                  :key="s.player"
                  @click="openDeck(s)"
                  class="border-b border-ds-neon/10 last:border-0 hover:bg-ds-midnight/60 transition-colors cursor-pointer"
                >
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                      :class="
                        s.placing === 1
                          ? 'bg-ds-gold text-ds-midnight'
                          : s.placing === 2
                            ? 'bg-ds-slate text-ds-midnight'
                            : s.placing === 3
                              ? 'bg-amber-700 text-white'
                              : 'text-ds-slate'
                      "
                    >
                      {{ s.placing }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-ds-soft-white font-medium">{{ s.name || s.player }}</span>
                    <span
                      v-if="s.country"
                      class="ml-2 text-base"
                      :title="s.country"
                    >{{ flagEmoji(s.country) }}</span>
                  </td>
                    <td class="px-4 py-3 text-ds-slate hidden md:table-cell">
                    {{ s.deck?.name ?? '—' }}
                  </td>
                  <td class="px-4 py-3 text-right hidden sm:table-cell">
                      <span class="font-mono text-xs text-ds-slate/60">
                      {{ s.record.wins }}-{{ s.record.losses
                      }}<span v-if="s.record.ties">-{{ s.record.ties }}</span>
                    </span>
                  </td>
                  <td class="px-2 py-3 text-center">
                    <span v-if="s.decklist" class="text-ds-gold text-xs" title="Decklist available">📋</span>
                    <span v-else class="text-ds-slate/30 text-xs">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="standings.length > 64" class="text-xs text-ds-slate/50 mt-2 text-right">
            Showing top 64 of {{ standings.length }} players
          </p>
        </div>
      </div>
    </div>

    <!-- Deck detail modal -->
    <Teleport to="body">
      <div
        v-if="selectedStanding"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="closeModal" />

        <div
          class="relative bg-ds-navy border border-ds-neon/30 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[88vh] sm:max-h-[82vh] flex flex-col z-10"
        >
          <!-- Modal header -->
          <div class="flex items-start justify-between p-5 border-b border-ds-neon/20 shrink-0">
            <div class="min-w-0">
              <h3 class="text-ds-soft-white font-bold text-lg truncate">
                {{ selectedStanding.name || selectedStanding.player }}
                <span
                  v-if="selectedStanding.country"
                  class="text-base font-normal ml-1"
                >{{ flagEmoji(selectedStanding.country) }}</span>
              </h3>
              <p class="text-ds-slate text-sm mt-0.5">
                #{{ selectedStanding.placing }} ·
                {{ selectedStanding.deck?.name ?? 'Unknown deck' }}
                <span class="ml-2 font-mono text-ds-slate/60 text-xs">
                  {{ selectedStanding.record.wins }}-{{ selectedStanding.record.losses
                  }}<span v-if="selectedStanding.record.ties"
                    >-{{ selectedStanding.record.ties }}</span
                  >
                </span>
              </p>
            </div>
            <button
              @click="closeModal"
              class="text-ds-slate hover:text-ds-soft-white text-xl leading-none ml-4 mt-0.5 shrink-0"
            >
              ✕
            </button>
          </div>

          <!-- Modal body -->
          <div class="overflow-y-auto p-5 flex-1">
            <!-- No decklist -->
            <div
              v-if="!selectedStanding.decklist"
              class="text-center py-12 text-ds-slate text-sm"
            >
              Decklist was not submitted for this tournament.
            </div>

            <!-- Card grid -->
            <div v-else class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
              <div
                v-for="entry in deckCards"
                :key="entry.cardnumber"
                class="relative rounded-lg overflow-hidden bg-ds-midnight aspect-[5/7]"
              >
                <img
                  :src="entry.imgurl"
                  :alt="entry.cardnumber"
                  class="w-full h-full object-cover"
                  loading="lazy"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <span
                  class="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                >
                  ×{{ entry.count }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
