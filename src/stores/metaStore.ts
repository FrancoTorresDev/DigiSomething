import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Deck } from '@/models/Deck'
import { getTopDecks } from '@/services/deckService'

export const useMetaStore = defineStore('meta', () => {
  const topDecks = ref<Deck[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchMeta(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      topDecks.value = await getTopDecks(20)
    } catch {
      error.value = 'Failed to load meta decks.'
    } finally {
      loading.value = false
    }
  }

  return { topDecks, loading, error, fetchMeta }
})
