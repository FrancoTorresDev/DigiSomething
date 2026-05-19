import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Deck, DeckCard } from '@/models/Deck'
import type { DigimonCard } from '@/models/Card'
import {
  getUserDecks,
  saveDeck as saveDeckService,
  deleteDeck as deleteDeckService
} from '@/services/deckService'
import { useAuthStore } from './authStore'

const DECK_MAX = 50
const CARD_MAX_COPIES = 4

function emptyDeck(): Deck {
  return { id: '', ownerId: '', name: 'New Deck', cards: [], isPublic: false, votes: 0 }
}

export const useDeckStore = defineStore('deck', () => {
  const userDecks = ref<Deck[]>([])
  const activeDeck = ref<Deck>(emptyDeck())
  const loading = ref(false)

  const totalCards = computed(() =>
    activeDeck.value.cards.reduce((sum, c) => sum + c.quantity, 0)
  )

  function addCard(card: DigimonCard): void {
    const existing = activeDeck.value.cards.find((c) => c.card.cardnumber === card.cardnumber)
    if (existing) {
      if (existing.quantity < CARD_MAX_COPIES) existing.quantity++
    } else if (totalCards.value < DECK_MAX) {
      activeDeck.value.cards.push({ card, quantity: 1 })
    }
  }

  function removeCard(cardnumber: string): void {
    const idx = activeDeck.value.cards.findIndex((c) => c.card.cardnumber === cardnumber)
    if (idx === -1) return
    const slot = activeDeck.value.cards[idx]
    if (slot.quantity > 1) {
      slot.quantity--
    } else {
      activeDeck.value.cards.splice(idx, 1)
    }
  }

  function clearDeck(): void {
    activeDeck.value = emptyDeck()
  }

  function loadDeck(deck: Deck): void {
    activeDeck.value = { ...deck, cards: deck.cards.map((c: DeckCard) => ({ ...c })) }
  }

  async function loadUserDecks(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.user) return
    loading.value = true
    try {
      userDecks.value = await getUserDecks(auth.user.uid)
    } finally {
      loading.value = false
    }
  }

  async function saveDeck(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.user) return
    loading.value = true
    try {
      const id = await saveDeckService({
        ownerId: auth.user.uid,
        name: activeDeck.value.name,
        cards: activeDeck.value.cards,
        isPublic: activeDeck.value.isPublic,
        votes: 0,
        ownerName: auth.displayName,
        ownerPhoto: auth.photoURL
      })
      activeDeck.value.id = id
      await loadUserDecks()
    } finally {
      loading.value = false
    }
  }

  async function deleteDeck(id: string): Promise<void> {
    await deleteDeckService(id)
    await loadUserDecks()
  }

  return {
    userDecks,
    activeDeck,
    loading,
    totalCards,
    addCard,
    removeCard,
    clearDeck,
    loadDeck,
    loadUserDecks,
    saveDeck,
    deleteDeck
  }
})
