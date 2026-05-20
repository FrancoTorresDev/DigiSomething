import { computed } from 'vue'
import { useDeckStore } from '@/stores/deckStore'

const MAIN_DECK_SIZE = 50
const EGG_MAX = 5
const MAX_COPIES = 4

export function useDeckValidator() {
  const deckStore = useDeckStore()

  const isValid = computed(() => {
    if (deckStore.mainDeckTotal !== MAIN_DECK_SIZE) return false
    if (deckStore.digiEggTotal > EGG_MAX) return false
    return deckStore.activeDeck.cards.every((c) => c.quantity <= MAX_COPIES)
  })

  const validationMessages = computed((): string[] => {
    const msgs: string[] = []

    if (deckStore.mainDeckTotal < MAIN_DECK_SIZE) {
      msgs.push(`Main deck needs ${MAIN_DECK_SIZE - deckStore.mainDeckTotal} more cards (${deckStore.mainDeckTotal}/${MAIN_DECK_SIZE})`)
    } else if (deckStore.mainDeckTotal > MAIN_DECK_SIZE) {
      msgs.push(`Main deck has too many cards (${deckStore.mainDeckTotal}/${MAIN_DECK_SIZE})`)
    }

    if (deckStore.digiEggTotal > EGG_MAX) {
      msgs.push(`Egg deck exceeds limit (${deckStore.digiEggTotal}/${EGG_MAX})`)
    }

    deckStore.activeDeck.cards
      .filter((c) => c.quantity > MAX_COPIES)
      .forEach((c) => msgs.push(`"${c.card.name}" exceeds ${MAX_COPIES}-copy limit`))

    return msgs
  })

  return {
    isValid,
    validationMessages,
    totalCards: deckStore.totalCards,
    mainDeckTotal: deckStore.mainDeckTotal,
    digiEggTotal: deckStore.digiEggTotal
  }
}
