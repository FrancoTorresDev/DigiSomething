<script setup lang="ts">
import { ref } from 'vue'
import { useCardFilters } from '@/composables/useCardFilters'
import RangeSlider from './RangeSlider.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

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
  <div class="bg-ds-navy rounded-xl p-3 sm:p-4 border border-ds-neon/20">
    <div class="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
      <!-- Search -->
      <div class="relative flex w-full sm:flex-1 sm:min-w-48">
        <input
          v-model="filters.search"
          type="text"
          :placeholder="filters.searchInText ? 'Search card text...' : 'Search by name...'"
          class="flex-1 bg-ds-midnight text-ds-soft-white placeholder-ds-slate/50 text-sm px-4 py-2 rounded-l-lg border border-ds-neon/30 focus:border-ds-cyan focus:outline-none transition-colors"
        />
        <button
          @click="filters.searchInText = !filters.searchInText"
          :title="filters.searchInText ? 'Searching name + effect text' : 'Search name only'"
          class="px-3 py-2 text-xs font-medium rounded-r-lg border border-l-0 border-ds-neon/30 transition-colors shrink-0"
          :class="filters.searchInText
            ? 'bg-ds-gold/20 text-ds-gold border-ds-gold/40'
            : 'bg-ds-midnight text-ds-slate hover:text-ds-soft-white'"
        >
          {{ filters.searchInText ? 'Text' : 'Name' }}
        </button>
      </div>

      <!-- Row 2 on mobile: Color + Type -->
      <div class="flex gap-2 w-full sm:w-auto sm:contents">
        <!-- Color -->
        <select
          v-model="filters.color"
          class="bg-ds-midnight text-sm text-ds-soft-white px-3 py-2 rounded-lg border border-ds-neon/30 focus:border-ds-cyan focus:outline-none transition-colors flex-1 sm:flex-none"
        >
          <option value="">Color: All</option>
          <option v-for="c in availableColors" :key="c" :value="c">{{ c }}</option>
        </select>

        <!-- Type -->
        <select
          v-model="filters.type"
          class="bg-ds-midnight text-sm text-ds-soft-white px-3 py-2 rounded-lg border border-ds-neon/30 focus:border-ds-cyan focus:outline-none transition-colors flex-1 sm:flex-none"
        >
          <option value="">Type: All</option>
          <option v-for="t in availableTypes" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <!-- Row 3 on mobile: Rarity + Advanced + Reset -->
      <div class="flex flex-wrap gap-2 w-full sm:w-auto sm:contents items-center">
        <!-- Rarity -->
        <select
          v-model="filters.rarity"
          class="bg-ds-midnight text-sm text-ds-soft-white px-3 py-2 rounded-lg border border-ds-neon/30 focus:border-ds-cyan focus:outline-none transition-colors flex-1 sm:flex-none"
        >
          <option value="">Rarity: All</option>
          <option v-for="r in availableRarities" :key="r" :value="r">{{ r }}</option>
        </select>

        <!-- Advanced toggle -->
        <button
          @click="showAdvanced = !showAdvanced"
          class="text-sm px-3 py-2 rounded-lg border transition-colors shrink-0 min-w-28"
          :class="showAdvanced ? 'text-ds-gold border-ds-gold/40 bg-ds-gold/10' : 'text-ds-slate border-ds-neon/30 hover:border-ds-neon/60'"
        >
          {{ showAdvanced ? '▲' : '▼' }} Advanced
        </button>

        <!-- Reset -->
        <BaseButton
          v-if="activeFilterCount > 0"
          variant="danger"
          size="sm"
          @click="resetFilters"
        >Reset ({{ activeFilterCount }})</BaseButton>
      </div>
    </div>

    <!-- Advanced range filters -->
      <div v-if="showAdvanced" class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-ds-neon/20 pt-4">
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
