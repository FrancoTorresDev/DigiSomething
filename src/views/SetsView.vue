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
      <h1 class="text-3xl font-bold text-ds-soft-white mb-1">Card Sets</h1>
      <p class="text-ds-slate">Browse all Digimon Card Game releases</p>
    </div>

    <!-- Controls -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
      <!-- Search -->
      <div class="flex items-center gap-2 bg-ds-navy border border-ds-neon/20 rounded-lg px-3 py-2 w-full sm:w-72 focus-within:border-ds-cyan transition-colors">
        <svg class="w-4 h-4 text-ds-slate shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Search sets..."
          class="flex-1 bg-transparent text-sm text-ds-soft-white placeholder-ds-slate/60 outline-none"
        />
      </div>

      <!-- Type filter tabs -->
      <div class="flex items-center gap-1 bg-ds-navy border border-ds-neon/20 rounded-lg p-1">
        <button
          v-for="t in TYPES"
          :key="t"
          @click="activeType = t"
          class="px-3 py-1.5 rounded-md text-sm font-display font-medium transition-colors"
          :class="activeType === t
            ? 'bg-ds-royal/30 text-ds-cyan border border-ds-neon/40'
            : 'text-ds-slate hover:text-ds-soft-white'"
        >{{ t }}</button>
      </div>

      <span class="text-sm text-ds-slate/60 ml-auto">{{ filteredSets.length }} sets</span>
    </div>

    <!-- Sets grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <button
        v-for="set in filteredSets"
        :key="set.code"
        @click="openSet(set)"
        class="group flex flex-col bg-ds-navy border border-ds-neon/20 rounded-xl overflow-hidden hover:border-ds-neon/60 hover:scale-[1.02] transition-all duration-150 text-left"
      >
        <!-- Card image -->
        <div class="relative aspect-[3/4] bg-ds-midnight overflow-hidden">
          <img
            :src="setImgUrl(set)"
            :alt="set.name"
            class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="onImgError"
          />
          <!-- Overlay gradient -->
          <div class="absolute inset-0 bg-gradient-to-t from-ds-navy/80 via-transparent to-transparent pointer-events-none" />
          <!-- Type badge top-left -->
          <span
            class="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded leading-none"
            :class="TYPE_BADGE[set.type]"
          >{{ set.type }}</span>
        </div>

        <!-- Info -->
        <div class="px-3 py-2.5">
          <p class="text-[11px] font-bold font-display text-ds-gold mb-0.5 leading-none">{{ set.code }}</p>
          <p class="text-xs text-ds-soft-white font-medium leading-tight truncate">{{ set.name }}</p>
          <p class="text-[10px] text-ds-slate/50 mt-1">
            {{ set.releaseDate.replace('-', '/') }}
          </p>
        </div>
      </button>
    </div>

    <!-- Empty -->
    <div v-if="filteredSets.length === 0" class="text-center py-20">
      <p class="text-ds-slate">No sets match your search.</p>
      <button @click="search = ''; activeType = 'All'" class="mt-2 text-sm text-ds-gold hover:text-ds-cyan">
        Clear filters
      </button>
    </div>

  </div>
</template>
