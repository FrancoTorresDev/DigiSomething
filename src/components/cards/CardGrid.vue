<script setup lang="ts">
import type { DigimonCard } from '@/models/Card'
import CardTile from './CardTile.vue'

defineProps<{
  cards: DigimonCard[]
  selectable?: boolean
}>()

const emit = defineEmits<{
  'card-click': [card: DigimonCard]
}>()
</script>

<template>
  <div
    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3"
  >
    <CardTile
      v-for="card in cards"
      :key="card.cardnumber"
      :card="card"
      :selectable="selectable"
      @click="emit('card-click', card)"
    />
  </div>
</template>
