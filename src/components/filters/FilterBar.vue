<script setup lang="ts">
import { useCardFilters } from '@/composables/useCardFilters'

const { filters, availableColors, availableTypes, availableRarities, activeFilterCount, resetFilters } =
  useCardFilters()
</script>

<template>
  <div class="bg-gray-900 rounded-xl p-4 border border-gray-800">
    <div class="flex flex-wrap gap-3 items-center">
      <!-- Search -->
      <div class="relative flex-1 min-w-48">
        <input
          v-model="filters.search"
          type="text"
          placeholder="Search cards..."
          class="w-full bg-gray-800 text-white placeholder-gray-500 text-sm px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>

      <!-- Color -->
      <select
        v-model="filters.color"
        class="bg-gray-800 text-sm text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <option value="">Color: All</option>
        <option v-for="c in availableColors" :key="c" :value="c">{{ c }}</option>
      </select>

      <!-- Type -->
      <select
        v-model="filters.type"
        class="bg-gray-800 text-sm text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <option value="">Type: All</option>
        <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
      </select>

      <!-- Rarity -->
      <select
        v-model="filters.rarity"
        class="bg-gray-800 text-sm text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <option value="">Rarity: All</option>
        <option v-for="r in availableRarities" :key="r" :value="r">{{ r }}</option>
      </select>

      <!-- Reset -->
      <button
        v-if="activeFilterCount > 0"
        @click="resetFilters"
        class="text-sm text-red-400 hover:text-red-300 px-3 py-2 border border-red-900 hover:border-red-700 rounded-lg transition-colors"
      >
        Reset ({{ activeFilterCount }})
      </button>
    </div>
  </div>
</template>
