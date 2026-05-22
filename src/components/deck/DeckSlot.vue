<script setup lang="ts">
import type { DeckCard } from '@/models/Deck'

defineProps<{
  entry: DeckCard
}>()

const emit = defineEmits<{
  increment: []
  decrement: []
}>()

const COLOR_DOT: Record<string, string> = {
  Red: 'bg-red-500',
  Blue: 'bg-blue-500',
  Yellow: 'bg-yellow-400',
  Green: 'bg-green-500',
  Black: 'bg-gray-400',
  Purple: 'bg-purple-500',
  White: 'bg-white'
}
</script>

<template>
  <div
    class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-ds-navy group transition-colors"
  >
    <span
      class="w-2 h-2 rounded-full shrink-0"
      :class="COLOR_DOT[entry.card.color] ?? 'bg-gray-500'"
    />
    <span class="flex-1 text-sm text-ds-soft-white/90 truncate min-w-0">{{ entry.card.name }}</span>
    <span class="text-[10px] text-ds-slate/40 shrink-0 hidden group-hover:inline">
      {{ entry.card.type }}
    </span>
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        @click="emit('decrement')"
        class="w-5 h-5 rounded text-ds-slate/50 hover:text-red-400 hover:bg-ds-navy flex items-center justify-center text-sm font-bold transition-colors"
      >
        −
      </button>
      <span
        class="w-5 text-center text-sm font-semibold tabular-nums"
        :class="entry.quantity >= 4 ? 'text-ds-gold' : 'text-ds-soft-white'"
      >
        {{ entry.quantity }}
      </span>
      <button
        @click="emit('increment')"
        :disabled="entry.quantity >= 4"
        class="w-5 h-5 rounded text-ds-slate/50 hover:text-green-400 hover:bg-ds-navy disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors"
      >
        +
      </button>
    </div>
  </div>
</template>
