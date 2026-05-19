import { computed } from 'vue'
import { useDeckStore } from '@/stores/deckStore'

const DECK_SIZE = 50
const MAX_COPIES = 4

export function useDeckValidator() {
  const deckStore = useDeckStore()

  const isValid = computed(() => {
    if (deckStore.totalCards !== DECK_SIZE) return false
    return deckStore.activeDeck.cards.every((c) => c.quantity <= MAX_COPIES)
  })

  const validationMessages = computed((): string[] => {
    const msgs: string[] = []

    if (deckStore.totalCards < DECK_SIZE) {
      msgs.push(`Deck needs ${DECK_SIZE - deckStore.totalCards} more cards (${deckStore.totalCards}/${DECK_SIZE})`)
    } else if (deckStore.totalCards > DECK_SIZE) {
      msgs.push(`Deck has too many cards (${deckStore.totalCards}/${DECK_SIZE})`)
    }

    deckStore.activeDeck.cards
      .filter((c) => c.quantity > MAX_COPIES)
      .forEach((c) => msgs.push(`"${c.card.name}" exceeds ${MAX_COPIES}-copy limit`))

    return msgs
  })

  return { isValid, validationMessages, totalCards: deckStore.totalCards }
}
