import { computed } from 'vue'
import { useCardStore } from '@/stores/cardStore'

export const COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Black', 'Purple', 'White']
export const TYPES = ['Digimon', 'Tamer', 'Option']
export const RARITIES = ['C', 'U', 'R', 'SR', 'SEC', 'P']

export function useCardFilters() {
  const cardStore = useCardStore()

  const activeFilterCount = computed(() => {
    let count = 0
    if (cardStore.filters.search) count++
    if (cardStore.filters.color) count++
    if (cardStore.filters.type) count++
    if (cardStore.filters.rarity) count++
    return count
  })

  return {
    filters: cardStore.filters,
    filteredCards: cardStore.filteredCards,
    availableColors: COLORS,
    availableTypes: TYPES,
    availableRarities: RARITIES,
    activeFilterCount,
    resetFilters: cardStore.resetFilters
  }
}
