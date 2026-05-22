<script setup lang="ts">
import type { DeckCard } from '@/models/Deck'

defineProps<{
  entry: DeckCard
}>()

const emit = defineEmits<{
  increment: []
  decrement: []
}>()

const COLOR_BORDER: Record<string, string> = {
  Red: 'border-red-500',
  Blue: 'border-blue-500',
  Yellow: 'border-yellow-400',
  Green: 'border-green-500',
  Black: 'border-gray-500',
  Purple: 'border-purple-500',
  White: 'border-gray-200'
}
</script>

<template>
  <div class="relative group cursor-pointer">
    <div
      class="relative rounded overflow-hidden border-2 transition-transform duration-150 group-hover:scale-105"
      :class="COLOR_BORDER[entry.card.color] ?? 'border-ds-neon/30'"
    >
      <!-- Card image -->
      <div class="aspect-[2/3] bg-ds-midnight">
        <img
          v-if="entry.card.imgurl"
          :src="entry.card.imgurl"
          :alt="entry.card.name"
          class="w-full h-full object-cover"
          loading="eager"
        />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-ds-slate/30 text-[9px] text-center p-1"
        >
          {{ entry.card.name }}
        </div>
      </div>

      <!-- Bottom bar: count always visible, +/− only on hover -->
      <div class="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-sm flex items-center justify-between px-1 py-0.5 gap-0.5">
        <button
          @click.stop="emit('decrement')"
          class="text-white font-bold text-xs leading-none hover:text-red-400 transition-colors w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >−</button>
        <span
          class="font-bold text-xs leading-none"
          :class="entry.quantity >= 4 ? 'text-ds-gold' : 'text-ds-soft-white'"
        >×{{ entry.quantity }}</span>
        <button
          @click.stop="emit('increment')"
          :disabled="entry.quantity >= 4"
          class="text-white font-bold text-xs leading-none hover:text-green-400 disabled:!opacity-0 disabled:cursor-not-allowed transition-colors w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >+</button>
      </div>
    </div>
  </div>
</template>
