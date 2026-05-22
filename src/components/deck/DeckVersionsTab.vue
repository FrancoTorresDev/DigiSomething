<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getDeckVersions } from '@/services/deckService'
import type { DeckVersion, DeckCard } from '@/models/Deck'

const props = defineProps<{ deckId: string; currentVersion?: number }>()

const versions = ref<DeckVersion[]>([])
const loading = ref(true)
const expanded = ref<Set<number>>(new Set())

onMounted(async () => {
  try {
    versions.value = await getDeckVersions(props.deckId)
    // Auto-expand the latest version
    if (versions.value.length > 0) {
      expanded.value.add(versions.value[versions.value.length - 1].versionNumber)
    }
  } finally {
    loading.value = false
  }
})

function toggle(versionNumber: number) {
  if (expanded.value.has(versionNumber)) {
    expanded.value.delete(versionNumber)
  } else {
    expanded.value.add(versionNumber)
  }
}

// Compute the diff between two card snapshots
interface CardDiff {
  card: DeckCard['card']
  quantityChange: number // positive = added, negative = removed
}

function getDiff(current: DeckCard[], previous: DeckCard[]): { added: CardDiff[]; removed: CardDiff[] } {
  const prevMap = new Map(previous.map((c) => [c.card.cardnumber, c.quantity]))
  const currMap = new Map(current.map((c) => [c.card.cardnumber, c.quantity]))

  const added: CardDiff[] = []
  const removed: CardDiff[] = []

  for (const [num, qty] of currMap) {
    const prevQty = prevMap.get(num) ?? 0
    if (qty > prevQty) {
      const card = current.find((c) => c.card.cardnumber === num)!.card
      added.push({ card, quantityChange: qty - prevQty })
    }
  }
  for (const [num, qty] of prevMap) {
    const currQty = currMap.get(num) ?? 0
    if (qty > currQty) {
      const card = previous.find((c) => c.card.cardnumber === num)!.card
      removed.push({ card, quantityChange: -(qty - currQty) })
    }
  }

  return { added, removed }
}

const sortedVersions = computed(() => [...versions.value].sort((a, b) => b.versionNumber - a.versionNumber))

const totalVersions = computed(() => versions.value.length)
const latestVersionNumber = computed(() =>
  versions.value.length > 0
    ? Math.max(...versions.value.map((v) => v.versionNumber))
    : 1
)

// Get the diff for a version relative to the previous one
function versionDiff(version: DeckVersion): { added: CardDiff[]; removed: CardDiff[] } | null {
  const idx = versions.value.findIndex((v) => v.versionNumber === version.versionNumber)
  if (idx <= 0) return null // v1 has no previous
  const prev = versions.value[idx - 1]
  return getDiff(version.cards, prev.cards)
}

function versionDiffSummary(version: DeckVersion): string {
  const diff = versionDiff(version)
  if (!diff) return ''
  const parts: string[] = []
  const totalAdded = diff.added.reduce((s, c) => s + c.quantityChange, 0)
  const totalRemoved = diff.removed.reduce((s, c) => s + Math.abs(c.quantityChange), 0)
  if (totalAdded > 0) parts.push(`Main: +${totalAdded}`)
  if (totalRemoved > 0) parts.push(`-${totalRemoved}`)
  return parts.join(', ')
}

function formatDate(ts: unknown): string {
  if (!ts) return ''
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round(((ts as { seconds: number }).seconds * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    )
  }
  return ''
}
</script>

<template>
  <div class="space-y-4">

    <!-- Header bar -->
    <div class="flex items-center gap-6 px-1 py-3 border-b border-ds-neon/20 text-sm">
      <div class="flex items-center gap-1.5 text-ds-slate">
        <span class="text-ds-slate/40 uppercase text-xs tracking-widest font-semibold">Current</span>
        <span class="text-ds-gold font-bold">v{{ latestVersionNumber }}</span>
      </div>
      <div class="flex items-center gap-1.5 text-ds-slate">
        <span class="text-ds-slate/40 uppercase text-xs tracking-widest font-semibold">Versions</span>
        <span class="text-ds-soft-white font-bold">{{ totalVersions }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-ds-gold border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty -->
    <div v-else-if="versions.length === 0" class="flex flex-col items-center gap-3 py-16 text-ds-slate/40">
      <svg class="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p class="text-sm">No versions yet. Save the deck to create the first version.</p>
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-[18px] top-3 bottom-3 w-px bg-ds-neon/20" />

      <div class="space-y-3">
        <div
          v-for="version in sortedVersions"
          :key="version.versionNumber"
          class="relative pl-10"
        >
          <!-- Timeline dot -->
          <div
            class="absolute left-[11px] top-[18px] w-3.5 h-3.5 rounded-full border-2 z-10"
            :class="version.versionNumber === latestVersionNumber
              ? 'bg-ds-gold border-ds-gold'
              : 'bg-ds-midnight border-ds-neon/40'"
          />

          <!-- Version card -->
          <div class="bg-ds-navy border border-ds-neon/20 rounded-xl overflow-hidden">

            <!-- Version header (always visible, clickable) -->
            <button
              class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-ds-navy/60 transition-colors text-left"
              @click="toggle(version.versionNumber)"
            >
              <!-- Version badge -->
              <span
                class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold"
                :class="version.versionNumber === latestVersionNumber
                  ? 'bg-ds-gold/15 text-ds-gold border border-ds-gold/40'
                  : 'bg-ds-midnight text-ds-slate border border-ds-neon/20'"
              >
                v{{ version.versionNumber }}
              </span>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-semibold text-ds-soft-white">
                    {{ version.versionNumber === latestVersionNumber ? 'Current Version' : version.label }}
                  </span>
                  <span
                    v-if="version.versionNumber === latestVersionNumber"
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ds-gold/15 text-ds-gold border border-ds-gold/40 uppercase tracking-wider"
                  >Latest</span>
                  <span
                    v-if="version.versionNumber === 1"
                    class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ds-midnight text-ds-slate border border-ds-neon/20 uppercase tracking-wider"
                  >Initial</span>
                </div>
                <p v-if="versionDiffSummary(version)" class="text-xs text-ds-slate/60 mt-0.5">
                  {{ versionDiffSummary(version) }}
                </p>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                <span class="text-xs text-ds-slate/50">{{ formatDate(version.createdAt) }}</span>
                <svg
                  class="w-4 h-4 text-ds-slate/40 transition-transform duration-200"
                  :class="expanded.has(version.versionNumber) ? 'rotate-180' : ''"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <!-- Expanded body -->
            <div v-if="expanded.has(version.versionNumber)" class="border-t border-ds-neon/20 p-4">

              <!-- No previous version to compare (oldest recorded snapshot) -->
              <template v-if="!versionDiff(version)">
                <div class="flex flex-col items-center gap-2 py-6 text-ds-slate/40">
                  <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <p class="text-sm">{{ version.versionNumber === 1 ? 'This is the initial version of the deck.' : 'This is the earliest recorded version.' }}</p>
                </div>
              </template>

              <!-- Diff view -->
              <template v-else>
                <div
                  class="grid gap-4"
                  :class="versionDiff(version)!.added.length > 0 && versionDiff(version)!.removed.length > 0
                    ? 'grid-cols-2'
                    : 'grid-cols-1'"
                >
                  <!-- Removed -->
                  <div v-if="versionDiff(version)!.removed.length > 0">
                    <div class="flex items-center gap-2 mb-3">
                      <span class="w-5 h-5 rounded-full bg-red-500/20 border border-red-600/50 flex items-center justify-center text-red-400 text-[10px] font-bold">
                        -{{ versionDiff(version)!.removed.reduce((s, c) => s + Math.abs(c.quantityChange), 0) }}
                      </span>
                      <span class="text-xs font-semibold uppercase tracking-widest text-ds-slate">Cards Removed</span>
                    </div>
                    <p class="text-[10px] uppercase tracking-widest text-ds-slate/40 mb-2">Main Deck</p>
                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      <div
                        v-for="item in versionDiff(version)!.removed"
                        :key="item.card.cardnumber"
                        class="relative rounded-lg overflow-hidden border-2 border-red-600/70"
                      >
                        <img
                          :src="item.card.imgurl"
                          :alt="item.card.name"
                          class="w-full aspect-[2/3] object-cover"
                          loading="lazy"
                          @error="($event.target as HTMLImageElement).style.display='none'"
                        />
                        <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                          {{ item.quantityChange }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Added -->
                  <div v-if="versionDiff(version)!.added.length > 0">
                    <div class="flex items-center gap-2 mb-3">
                      <span class="w-5 h-5 rounded-full bg-green-500/20 border border-green-600/50 flex items-center justify-center text-green-400 text-[10px] font-bold">
                        +{{ versionDiff(version)!.added.reduce((s, c) => s + c.quantityChange, 0) }}
                      </span>
                      <span class="text-xs font-semibold uppercase tracking-widest text-ds-slate">Cards Added</span>
                    </div>
                    <p class="text-[10px] uppercase tracking-widest text-ds-slate/40 mb-2">Main Deck</p>
                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      <div
                        v-for="item in versionDiff(version)!.added"
                        :key="item.card.cardnumber"
                        class="relative rounded-lg overflow-hidden border-2 border-green-600/70"
                      >
                        <img
                          :src="item.card.imgurl"
                          :alt="item.card.name"
                          class="w-full aspect-[2/3] object-cover"
                          loading="lazy"
                          @error="($event.target as HTMLImageElement).style.display='none'"
                        />
                        <span class="absolute top-1 left-1 w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
                          +{{ item.quantityChange }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- No changes between versions -->
                  <div
                    v-if="versionDiff(version)!.added.length === 0 && versionDiff(version)!.removed.length === 0"
                    class="flex flex-col items-center gap-2 py-6 text-ds-slate/40 col-span-2"
                  >
                    <p class="text-sm">No card changes in this version.</p>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
