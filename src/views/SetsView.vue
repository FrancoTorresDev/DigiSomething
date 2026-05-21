<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { SORTED_SETS, setImgUrl, TYPE_BADGE, type DigimonSet } from '@/services/digimonSets'

const router = useRouter()
const search = ref('')
const activeType = ref<DigimonSet['type'] | 'All'>('All')

const TYPES: (DigimonSet['type'] | 'All')[] = ['All', 'Booster', 'Extra', 'Starter', 'Other']

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

const filteredSets = computed(() => {
  let sets = SORTED_SETS
  if (activeType.value !== 'All') sets = sets.filter(s => s.type === activeType.value)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    sets = sets.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
  }
  return sets
})

function openSet(set: DigimonSet) {
  router.push({ name: 'set-detail', params: { code: set.code } })
}
</script>

<template>
  <div class="max-w-screen-xl mx-auto px-6 py-10">

    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-1">Card Sets</h1>
      <p class="text-gray-400">Browse all Digimon Card Game releases</p>
    </div>

    <!-- Controls -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
      <!-- Search -->
      <div class="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 w-full sm:w-72">
        <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search sets..."
          class="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
        />
      </div>

      <!-- Type filter tabs -->
      <div class="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
        <button
          v-for="t in TYPES"
          :key="t"
          @click="activeType = t"
          class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          :class="activeType === t
            ? 'bg-gray-700 text-white'
            : 'text-gray-500 hover:text-gray-300'"
        >{{ t }}</button>
      </div>

      <span class="text-sm text-gray-600 ml-auto">{{ filteredSets.length }} sets</span>
    </div>

    <!-- Sets grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <button
        v-for="set in filteredSets"
        :key="set.code"
        @click="openSet(set)"
        class="group flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 hover:scale-[1.02] transition-all duration-150 text-left"
      >
        <!-- Card image -->
        <div class="relative aspect-[3/4] bg-gray-800 overflow-hidden">
          <img
            :src="setImgUrl(set)"
            :alt="set.name"
            class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="onImgError"
          />
          <!-- Overlay gradient -->
          <div class="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent pointer-events-none" />
          <!-- Type badge top-left -->
          <span
            class="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
            :class="TYPE_BADGE[set.type]"
          >{{ set.type }}</span>
        </div>

        <!-- Info -->
        <div class="px-3 py-2.5">
          <p class="text-[11px] font-bold text-yellow-400 mb-0.5 leading-none">{{ set.code }}</p>
          <p class="text-xs text-white font-medium leading-tight truncate">{{ set.name }}</p>
          <p class="text-[10px] text-gray-600 mt-1">
            {{ set.releaseDate.replace('-', '/') }}
          </p>
        </div>
      </button>
    </div>

    <!-- Empty -->
    <div v-if="filteredSets.length === 0" class="text-center py-20">
      <p class="text-gray-500">No sets match your search.</p>
      <button @click="search = ''; activeType = 'All'" class="mt-2 text-sm text-yellow-400 hover:text-yellow-300">
        Clear filters
      </button>
    </div>

  </div>
</template>
