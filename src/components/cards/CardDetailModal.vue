<script setup lang="ts">
import type { DigimonCard } from '@/models/Card'

const props = defineProps<{
  card: DigimonCard | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  'add-to-deck': [card: DigimonCard]
}>()

const COLOR_STYLE: Record<string, string> = {
  Red: 'border-red-500 bg-red-950/40',
  Blue: 'border-blue-500 bg-blue-950/40',
  Yellow: 'border-yellow-400 bg-yellow-950/40',
  Green: 'border-green-500 bg-green-950/40',
  Black: 'border-gray-600 bg-gray-900/60',
  Purple: 'border-purple-500 bg-purple-950/40',
  White: 'border-gray-300 bg-gray-800/60'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible && card"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="relative max-w-2xl w-full rounded-2xl border bg-gray-950 p-6 shadow-2xl flex flex-col sm:flex-row gap-6"
          :class="card ? (COLOR_STYLE[card.color] ?? 'border-gray-700') : ''"
        >
          <!-- Close button -->
          <button
            @click="emit('close')"
            class="absolute top-4 right-4 text-gray-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>

          <!-- Card image -->
          <div class="w-full sm:w-44 shrink-0">
            <img
              v-if="card.imgurl"
              :src="card.imgurl"
              :alt="card.name"
              class="w-full rounded-xl shadow-lg"
            />
          </div>

          <!-- Card details -->
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-white mb-0.5 pr-8">{{ card.name }}</h2>
            <p class="text-sm text-gray-500 mb-4">{{ card.cardnumber }} · {{ card.set_name }}</p>

            <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              <div v-if="card.type" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Type</span>
                <span class="text-sm text-white">{{ card.type }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Color</span>
                <span class="text-sm text-white">{{ card.color }}</span>
              </div>
              <div v-if="card.level" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Level</span>
                <span class="text-sm text-white">Lv.{{ card.level }}</span>
              </div>
              <div v-if="card.dp" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">DP</span>
                <span class="text-sm text-white">{{ card.dp }}</span>
              </div>
              <div v-if="card.playCost != null" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Play Cost</span>
                <span class="text-sm text-white">{{ card.playCost }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Rarity</span>
                <span class="text-sm text-white">{{ card.rarity }}</span>
              </div>
            </div>

            <div v-if="card.mainEffect" class="mb-3">
              <p class="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Effect</p>
              <p class="text-sm text-gray-300 leading-relaxed">{{ card.mainEffect }}</p>
            </div>
            <div v-if="card.soureEffect" class="mb-4">
              <p class="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Source Effect</p>
              <p class="text-sm text-gray-300 leading-relaxed">{{ card.soureEffect }}</p>
            </div>

            <button
              @click="emit('add-to-deck', card)"
              class="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              + Add to Deck
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
