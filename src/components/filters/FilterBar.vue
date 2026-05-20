<script setup lang="ts">
import { ref } from 'vue'
import { useCardFilters } from '@/composables/useCardFilters'
import RangeSlider from './RangeSlider.vue'

const {
  filters,
  availableColors,
  availableTypes,
  availableRarities,
  levelMin, levelMax,
  dpMin, dpMax,
  costMin, costMax,
  activeFilterCount,
  resetFilters
} = useCardFilters()

const showAdvanced = ref(false)
</script>

<template>
  <div class="bg-gray-900 rounded-xl p-4 border border-gray-800">
    <div class="flex flex-wrap gap-3 items-center">
      <!-- Search -->
      <div class="relative flex-1 min-w-48 flex">
        <input
          v-model="filters.search"
          type="text"
          :placeholder="filters.searchInText ? 'Search card text...' : 'Search by name...'"
          class="flex-1 bg-gray-800 text-white placeholder-gray-500 text-sm px-4 py-2 rounded-l-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition-colors"
        />
        <button
          @click="filters.searchInText = !filters.searchInText"
          :title="filters.searchInText ? 'Searching name + effect text' : 'Search name only'"
          class="px-3 py-2 text-xs font-medium rounded-r-lg border border-l-0 border-gray-700 transition-colors shrink-0"
          :class="filters.searchInText
            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-700'
            : 'bg-gray-800 text-gray-500 hover:text-gray-300'"
        >
          {{ filters.searchInText ? 'Text' : 'Name' }}
        </button>
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

      <!-- Advanced toggle -->
      <button
        @click="showAdvanced = !showAdvanced"
        class="text-sm px-3 py-2 rounded-lg border transition-colors"
        :class="showAdvanced ? 'text-yellow-400 border-yellow-800 bg-yellow-950' : 'text-gray-400 border-gray-700 hover:border-gray-500'"
      >
        {{ showAdvanced ? '▲' : '▼' }} Advanced
      </button>

      <!-- Reset -->
      <button
        v-if="activeFilterCount > 0"
        @click="resetFilters"
        class="text-sm text-red-400 hover:text-red-300 px-3 py-2 border border-red-900 hover:border-red-700 rounded-lg transition-colors"
      >
        Reset ({{ activeFilterCount }})
      </button>
    </div>

    <!-- Advanced range filters -->
    <div v-if="showAdvanced" class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-gray-800 pt-4">
      <RangeSlider
        label="Level"
        :min="levelMin"
        :max="levelMax"
        v-model="filters.levelRange"
      />
      <RangeSlider
        label="DP"
        :min="dpMin"
        :max="dpMax"
        :step="1000"
        :format-value="(v: number) => v >= 1000 ? (v / 1000) + 'k' : String(v)"
        v-model="filters.dpRange"
      />
      <RangeSlider
        label="Play Cost"
        :min="costMin"
        :max="costMax"
        v-model="filters.playCostRange"
      />
    </div>
  </div>
</template>
