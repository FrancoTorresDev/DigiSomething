<script setup lang="ts">
import { computed } from 'vue'
import type { Deck } from '@/models/Deck'

const props = defineProps<{ deck: Deck }>()

const COLOR_BG: Record<string, string> = {
  Red: 'bg-red-500',
  Blue: 'bg-blue-500',
  Yellow: 'bg-yellow-400',
  Green: 'bg-green-500',
  Black: 'bg-gray-500',
  Purple: 'bg-purple-500',
  White: 'bg-gray-200',
}

const deckColors = computed(() => {
  const seen = new Set<string>()
  for (const entry of props.deck.cards) {
    if (entry.card.color) {
      for (const c of entry.card.color.split('/')) {
        const trimmed = c.trim()
        if (trimmed) seen.add(trimmed)
      }
    }
  }
  return [...seen]
})

const deckSets = computed(() => {
  const seen = new Set<string>()
  for (const entry of props.deck.cards) {
    if (entry.card.set_name) {
      const match = entry.card.set_name.match(/\[([^\]]+)\]/)
      if (match) seen.add(match[1])
      else seen.add(entry.card.set_name.split(' ')[0].slice(0, 6).toUpperCase())
    }
  }
  return [...seen].slice(0, 6)
})

const totalCards = computed(() =>
  props.deck.cards.reduce((s, c) => s + c.quantity, 0)
)

const statusLabel = computed(() => (props.deck.isPublic ? 'Public' : 'Draft'))

const statusClass = computed(() =>
  props.deck.isPublic
    ? 'text-green-400 border-green-700'
    : 'text-yellow-500 border-yellow-700'
)

// Show explicitly chosen cover, or fall back to first main-deck card image
const coverImage = computed(() => {
  if (props.deck.coverCardImage) return props.deck.coverCardImage
  const first = props.deck.cards.find(e => e.card.type !== 'Digi-Egg')
  return first?.card.imgurl ?? null
})
</script>

<template>
  <div class="flex bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all duration-150 group cursor-pointer h-[110px]">

    <!-- Left: cover image -->
    <div class="relative w-[80px] shrink-0 bg-gray-800 overflow-hidden">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="deck.name"
        class="w-full h-full object-cover object-top"
      />
      <div
        v-else
        class="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-700"
      >
        <!-- Placeholder icon -->
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="12" cy="10" r="3" />
          <path d="M6 21c0-3.314 2.686-5 6-5s6 1.686 6 5" />
        </svg>
        <span class="text-[9px] text-center leading-tight px-1">No cover</span>
      </div>
      <!-- Fade to right -->
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900/70 pointer-events-none" />
    </div>

    <!-- Right: info -->
    <div class="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-between">

      <!-- Name + author -->
      <div>
        <h3 class="text-white font-semibold text-sm leading-tight truncate group-hover:text-yellow-400 transition-colors">
          {{ deck.name }}
        </h3>
        <p v-if="deck.ownerName" class="text-[11px] text-gray-500 mt-0.5 truncate">
          by {{ deck.ownerName }}
        </p>
      </div>

      <!-- Colors + set badges -->
      <div class="flex flex-wrap items-center gap-1.5 my-1">
        <div
          v-for="color in deckColors"
          :key="color"
          :title="color"
          class="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
          :class="COLOR_BG[color] ?? 'bg-gray-400'"
        />
        <span v-if="deckColors.length && deckSets.length" class="text-gray-700 text-[10px]">·</span>
        <span
          v-for="set in deckSets"
          :key="set"
          class="text-[9px] font-bold px-1 py-px rounded bg-gray-800 border border-gray-700 text-gray-400 leading-none shrink-0"
        >{{ set }}</span>
      </div>

      <!-- Status + card count -->
      <div class="flex items-center gap-2 flex-wrap">
        <span
          class="text-[9px] font-semibold px-1.5 py-px rounded border leading-none shrink-0"
          :class="statusClass"
        >{{ statusLabel }}</span>
        <span class="text-[10px] text-gray-500 tabular-nums">{{ totalCards }}/55</span>
        <span v-if="deck.votes > 0" class="text-[10px] text-gray-500 flex items-center gap-0.5">
          ♥ {{ deck.votes }}
        </span>
      </div>

    </div>
  </div>
</template>
