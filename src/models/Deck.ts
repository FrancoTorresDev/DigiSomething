import type { DigimonCard } from './Card'

export interface DeckCard {
  card: DigimonCard
  quantity: number
}

export interface Deck {
  id: string
  ownerId: string
  name: string
  cards: DeckCard[]
  isPublic: boolean
  votes: number
  createdAt?: unknown
  ownerName?: string
  ownerPhoto?: string
  description?: string
  videoUrl?: string
  coverCardImage?: string
  qrCodeUrl?: string
}
