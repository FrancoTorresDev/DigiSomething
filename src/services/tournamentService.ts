import axios from 'axios'

const BASE = '/limitless-api'

export interface LimitlessTournament {
  id: string
  game: string
  format: string
  name: string
  date: string
  players: number
}

export interface DeckInfo {
  id: string
  name: string
  icons?: string[]
}

export interface TournamentStanding {
  player: string
  name: string
  country: string
  placing: number
  record: { wins: number; losses: number; ties: number }
  decklist?: unknown
  deck?: DeckInfo | null
  drop: number | null
}

export async function fetchTournaments(limit = 40): Promise<LimitlessTournament[]> {
  const { data } = await axios.get<LimitlessTournament[]>(`${BASE}/tournaments`, {
    params: { game: 'DCG', limit }
  })
  return data
}

export async function fetchStandings(tournamentId: string): Promise<TournamentStanding[]> {
  const { data } = await axios.get<TournamentStanding[]>(
    `${BASE}/tournaments/${tournamentId}/standings`
  )
  return data
}
