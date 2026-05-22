<script setup lang="ts">
import type { DigimonCard } from '@/models/Card'

const props = defineProps<{
  card: DigimonCard
  selectable?: boolean
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

function getBorderClass(color: string): string {
  return COLOR_BORDER[color] ?? 'border-ds-neon/30'
}
</script>

<template>
  <div
    class="relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-black/60 bg-ds-navy"
    :class="getBorderClass(props.card.color)"
    draggable="true"
    @dragstart="(e) => { e.dataTransfer?.setData('text/plain', JSON.stringify(card)); (e.currentTarget as HTMLElement).style.opacity = '0.5' }"
    @dragend="(e) => ((e.currentTarget as HTMLElement).style.opacity = '')"
  >
    <!-- Card image -->
    <div class="aspect-[2/3] relative overflow-hidden bg-ds-midnight">
      <img
        v-if="card.imgurl"
        :src="card.imgurl"
        :alt="card.name"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-ds-slate/40 text-xs text-center p-2"
      >
        {{ card.name }}
      </div>
    </div>

    <!-- Card info -->
    <div class="px-2 py-1">
      <div class="flex justify-between items-center">
        <span class="text-[10px] text-ds-slate">{{ card.type }}</span>
        <span class="text-[10px] text-ds-slate/50 font-mono">{{ card.rarity }}-{{ card.cardnumber }}</span>
      </div>
    </div>

    <!-- Hover overlay for selectable mode -->
    <div
      v-if="selectable"
      class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center"
    >
      <span
        class="opacity-0 group-hover:opacity-100 transition-opacity bg-ds-royal text-ds-soft-white text-xs px-3 py-1 rounded-full font-medium shadow-lg glow-cyan"
      >
        + Add
      </span>
    </div>
  </div>
</template>
