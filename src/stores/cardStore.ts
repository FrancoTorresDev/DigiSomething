import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { refDebounced } from '@vueuse/core'
import type { DigimonCard } from '@/models/Card'
import { searchCards } from '@/services/digimonApi'

export interface CardFilters {
  search: string
  searchInText: boolean
  color: string
  type: string
  rarity: string
  levelRange: [number, number]
  dpRange: [number, number]
  playCostRange: [number, number]
}

const PAGE_SIZE = 50

export const useCardStore = defineStore('cards', () => {
  const allCards = ref<DigimonCard[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const hasMore = ref(true)

  const filters = ref<CardFilters>({
    search: '',
    searchInText: false,
    color: '',
    type: '',
    rarity: '',
    levelRange: [2, 7],
    dpRange: [1000, 15000],
    playCostRange: [0, 20]
  })

  const debouncedSearch = refDebounced(computed(() => filters.value.search), 250)

  const filteredCards = computed(() => {
    const search = debouncedSearch.value
    const { searchInText, color, type, rarity, levelRange, dpRange, playCostRange } = filters.value
    return allCards.value.filter((card) => {
      if (search) {
        const q = search.toLowerCase()
        if (searchInText) {
          const textMatch =
            (card.mainEffect ?? '').toLowerCase().includes(q) ||
            (card.sourceEffect ?? '').toLowerCase().includes(q)
          if (!textMatch) return false
        } else {
          if (!card.name.toLowerCase().includes(q)) return false
        }
      }
      if (color && card.color !== color) return false
      if (type && card.type !== type) return false
      if (rarity && card.rarity !== rarity) return false
      if (card.level !== undefined && (card.level < levelRange[0] || card.level > levelRange[1])) return false
      if (card.dp !== undefined && (card.dp < dpRange[0] || card.dp > dpRange[1])) return false
      if (card.playCost !== undefined && (card.playCost < playCostRange[0] || card.playCost > playCostRange[1])) return false
      return true
    })
  })

  async function fetchCards(page = 1): Promise<void> {
    if (page > 1 && !hasMore.value) return

    loading.value = true
    error.value = null
    try {
      const cards = await searchCards({ page, sort: 'name', num: PAGE_SIZE })
      const receivedAppearsUnpaged = cards.length > PAGE_SIZE * 2

      if (page === 1) {
        const seen = new Set<string>()
        allCards.value = cards.filter((c) => {
          if (seen.has(c.cardnumber)) return false
          seen.add(c.cardnumber)
          return true
        })
        // digimoncard.io currently ignores paging params and returns all cards.
        hasMore.value = !receivedAppearsUnpaged && cards.length >= PAGE_SIZE
      } else {
        const seen = new Set(allCards.value.map((c) => c.cardnumber))
        const unique = cards.filter((c) => {
          if (seen.has(c.cardnumber)) return false
          seen.add(c.cardnumber)
          return true
        })
        allCards.value = [...allCards.value, ...unique]
        hasMore.value = !receivedAppearsUnpaged && unique.length > 0 && cards.length >= PAGE_SIZE
      }

      currentPage.value = page
    } catch {
      error.value = 'Failed to load cards. Please try again.'
    } finally {
      loading.value = false
    }
  }

  function resetFilters(): void {
    Object.assign(filters.value, {
      search: '',
      searchInText: false,
      color: '',
      type: '',
      rarity: '',
      levelRange: [2, 7],
      dpRange: [1000, 15000],
      playCostRange: [0, 20]
    })
  }

  return { allCards, loading, error, filters, filteredCards, currentPage, hasMore, fetchCards, resetFilters }
})
