import { computed } from 'vue'
import { useCardStore } from '@/stores/cardStore'

export const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Black', 'Purple', 'White']
export const TYPES = ['Digimon', 'Tamer', 'Option']
export const RARITIES = ['C', 'U', 'R', 'SR', 'SEC', 'P']

export const LEVEL_MIN = 2
export const LEVEL_MAX = 7
export const DP_MIN = 1000
export const DP_MAX = 15000
export const COST_MIN = 0
export const COST_MAX = 20

export function useCardFilters() {
  const cardStore = useCardStore()

  const activeFilterCount = computed(() => {
    let count = 0
    if (cardStore.filters.search) count++
    if (cardStore.filters.color) count++
    if (cardStore.filters.type) count++
    if (cardStore.filters.rarity) count++
    const [lMin, lMax] = cardStore.filters.levelRange
    if (lMin !== LEVEL_MIN || lMax !== LEVEL_MAX) count++
    const [dMin, dMax] = cardStore.filters.dpRange
    if (dMin !== DP_MIN || dMax !== DP_MAX) count++
    const [cMin, cMax] = cardStore.filters.playCostRange
    if (cMin !== COST_MIN || cMax !== COST_MAX) count++
    return count
  })

  return {
    filters: cardStore.filters,
    filteredCards: cardStore.filteredCards,
    availableColors: COLORS,
    availableTypes: TYPES,
    availableRarities: RARITIES,
    levelMin: LEVEL_MIN,
    levelMax: LEVEL_MAX,
    dpMin: DP_MIN,
    dpMax: DP_MAX,
    costMin: COST_MIN,
    costMax: COST_MAX,
    activeFilterCount,
    resetFilters: cardStore.resetFilters
  }
}
