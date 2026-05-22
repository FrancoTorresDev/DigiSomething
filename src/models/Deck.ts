import type { DigimonCard } from './Card'

export interface DeckCard {
  card: DigimonCard
  quantity: number
}

export interface DeckVersion {
  id: string
  versionNumber: number
  label: string
  cards: DeckCard[]
  createdAt?: unknown
}

export type MatchResult = 'win' | 'loss' | 'draw'

export interface DeckMatch {
  id: string
  opponentColors: string[]     // Digimon colors (multi-color support)
  opponentDeckName?: string    // optional deck name/archetype
  opponentName?: string        // optional username
  wonGames: number
  lostGames: number
  result: MatchResult
  wonDiceRoll: boolean
  notes?: string
  createdAt?: unknown
}

export type MatchupDifficulty = 'favored' | 'even' | 'unfavored'

export interface DeckMatchup {
  id: string
  title?: string
  opponentColors: string[]       // up to 3 Digimon colors
  opponentDeckName?: string      // optional archetype label
  difficulty: MatchupDifficulty
  notesGoingFirst?: string       // max 250 chars
  notesGoingSecond?: string      // max 250 chars
  createdAt?: unknown
}

export type DeckArchetypeTag =
  | 'MIDRANGE_YELLOW'
  | 'CONTROL_BLUE'
  | 'AGGRO_RED'
  | 'MIDRANGE'
  | 'CONTROL'
  | 'AGGRO'

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
  currentVersion?: number
  guide?: string
  archetypeTag?: DeckArchetypeTag
}
