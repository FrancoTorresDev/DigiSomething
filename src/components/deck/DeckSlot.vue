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
    class="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800 group transition-colors"
  >
    <span
      class="w-2 h-2 rounded-full shrink-0"
      :class="COLOR_DOT[entry.card.color] ?? 'bg-gray-500'"
    />
    <span class="flex-1 text-sm text-gray-200 truncate min-w-0">{{ entry.card.name }}</span>
    <span class="text-[10px] text-gray-600 shrink-0 hidden group-hover:inline">
      {{ entry.card.type }}
    </span>
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        @click="emit('decrement')"
        class="w-5 h-5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 flex items-center justify-center text-sm font-bold transition-colors"
      >
        −
      </button>
      <span
        class="w-5 text-center text-sm font-semibold tabular-nums"
        :class="entry.quantity >= 4 ? 'text-yellow-400' : 'text-white'"
      >
        {{ entry.quantity }}
      </span>
      <button
        @click="emit('increment')"
        :disabled="entry.quantity >= 4"
        class="w-5 h-5 rounded text-gray-500 hover:text-green-400 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors"
      >
        +
      </button>
    </div>
  </div>
</template>
