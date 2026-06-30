import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Deck, DeckCard } from '@/models/Deck'
import type { DigimonCard } from '@/models/Card'
import {
  getUserDecks,
  saveDeck as saveDeckService,
  updateDeck as updateDeckService,
  deleteDeck as deleteDeckService,
  saveDeckVersion,
} from '@/services/deckService'
import { useAuthStore } from './authStore'

const DECK_MAX = 50
const DIGI_EGG_MAX = 5
const CARD_MAX_COPIES = 4
const STORAGE_KEY = 'digimon-active-deck'

function emptyDeck(): Deck {
  return { id: '', ownerId: '', name: 'New Deck', cards: [], isPublic: false, votes: 0 }
}

function loadFromStorage(): Deck {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Deck
  } catch { /* ignore */ }
  return emptyDeck()
}

export const useDeckStore = defineStore('deck', () => {
  const userDecks = ref<Deck[]>([])
  const activeDeck = ref<Deck>(loadFromStorage())
  const loading = ref(false)
  const loadError = ref<string | null>(null)

  watch(activeDeck, (deck) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)) } catch { /* ignore */ }
  }, { deep: true })

  const totalCards = computed(() =>
    activeDeck.value.cards.reduce((sum, c) => sum + c.quantity, 0)
  )

  const digiEggTotal = computed(() =>
    activeDeck.value.cards
      .filter((c) => c.card.type === 'Digi-Egg')
      .reduce((sum, c) => sum + c.quantity, 0)
  )

  const mainDeckTotal = computed(() =>
    activeDeck.value.cards
      .filter((c) => c.card.type !== 'Digi-Egg')
      .reduce((sum, c) => sum + c.quantity, 0)
  )

  function addCard(card: DigimonCard): void {
    const existing = activeDeck.value.cards.find((c) => c.card.cardnumber === card.cardnumber)
    if (existing) {
      if (existing.quantity < CARD_MAX_COPIES) existing.quantity++
    } else {
      const isEgg = card.type === 'Digi-Egg'
      const limit = isEgg ? DIGI_EGG_MAX : DECK_MAX
      const current = isEgg ? digiEggTotal.value : mainDeckTotal.value
      if (current < limit) {
        activeDeck.value.cards.push({ card, quantity: 1 })
      }
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

    if (auth.loading) {
      await new Promise<void>((resolve) => {
        const stop = watch(
          () => auth.loading,
          (isLoading) => {
            if (!isLoading) {
              stop()
              resolve()
            }
          }
        )
      })
    }

    if (!auth.user) {
      userDecks.value = []
      loadError.value = null
      return
    }

    loading.value = true
    loadError.value = null
    try {
      userDecks.value = await getUserDecks(auth.user.uid)
    } catch {
      loadError.value = 'Unable to load your decks right now. Please try again.'
      userDecks.value = []
    } finally {
      loading.value = false
    }
  }

  async function saveDeck(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.user) return
    loading.value = true
    try {
      if (activeDeck.value.id) {
        const nextVersion = (activeDeck.value.currentVersion ?? 1) + 1
        const updateData: Partial<Deck> = {
          name: activeDeck.value.name,
          cards: activeDeck.value.cards,
          isPublic: activeDeck.value.isPublic,
          description: activeDeck.value.description,
          videoUrl: activeDeck.value.videoUrl,
          currentVersion: nextVersion,
        }
        if (activeDeck.value.coverCardImage) updateData.coverCardImage = activeDeck.value.coverCardImage
        await updateDeckService(activeDeck.value.id, updateData)
        activeDeck.value.currentVersion = nextVersion
        await saveDeckVersion(activeDeck.value.id, {
          versionNumber: nextVersion,
          label: 'Current Version',
          cards: activeDeck.value.cards.map((c) => ({ ...c })),
        })
      } else {
        const newDeckData: Omit<Deck, 'id' | 'createdAt'> = {
          ownerId: auth.user.uid,
          name: activeDeck.value.name,
          cards: activeDeck.value.cards,
          isPublic: activeDeck.value.isPublic,
          votes: 0,
          ownerName: auth.displayName,
          ownerPhoto: auth.photoURL,
          description: activeDeck.value.description,
          videoUrl: activeDeck.value.videoUrl,
          currentVersion: 1,
        }
        if (activeDeck.value.coverCardImage) newDeckData.coverCardImage = activeDeck.value.coverCardImage
        const id = await saveDeckService(newDeckData)
        activeDeck.value.id = id
        activeDeck.value.currentVersion = 1
        const qrCodeUrl = `${window.location.origin}/deck/${id}`
        activeDeck.value.qrCodeUrl = qrCodeUrl
        await updateDeckService(id, { qrCodeUrl })
        await saveDeckVersion(id, {
          versionNumber: 1,
          label: activeDeck.value.name,
          cards: activeDeck.value.cards.map((c) => ({ ...c })),
        })
      }
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
    loadError,
    totalCards,
    digiEggTotal,
    mainDeckTotal,
    addCard,
    removeCard,
    clearDeck,
    loadDeck,
    loadUserDecks,
    saveDeck,
    deleteDeck
  }
})
