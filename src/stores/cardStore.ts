import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DigimonCard } from '@/models/Card'
import { searchCards } from '@/services/digimonApi'

export interface CardFilters {
  search: string
  color: string
  type: string
  rarity: string
}

export const useCardStore = defineStore('cards', () => {
  const allCards = ref<DigimonCard[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const hasMore = ref(true)

  const filters = ref<CardFilters>({
    search: '',
    color: '',
    type: '',
    rarity: ''
  })

  const filteredCards = computed(() => {
    const { search, color, type, rarity } = filters.value
    return allCards.value.filter((card) => {
      if (search && !card.name.toLowerCase().includes(search.toLowerCase())) return false
      if (color && card.color !== color) return false
      if (type && card.type !== type) return false
      if (rarity && card.rarity !== rarity) return false
      return true
    })
  })

  async function fetchCards(page = 1): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const cards = await searchCards({ page, sort: 'name' })
      if (page === 1) {
        allCards.value = cards
      } else {
        allCards.value = [...allCards.value, ...cards]
      }
      hasMore.value = cards.length > 0
      currentPage.value = page
    } catch {
      error.value = 'Failed to load cards. Please try again.'
    } finally {
      loading.value = false
    }
  }

  function resetFilters(): void {
    filters.value = { search: '', color: '', type: '', rarity: '' }
  }

  return { allCards, loading, error, filters, filteredCards, currentPage, hasMore, fetchCards, resetFilters }
})
