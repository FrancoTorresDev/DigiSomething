import axios from 'axios'
import type { DigimonCard } from '@/models/Card'

const BASE_URL = 'https://digimoncard.io/api-public/search.php'

export interface CardSearchParams {
  sort?: 'name' | 'color' | 'type'
  type?: string
  color?: string
  level?: number
  page?: number
  series?: string
}

export async function searchCards(params: CardSearchParams = {}): Promise<DigimonCard[]> {
  const response = await axios.get<DigimonCard[]>(BASE_URL, {
    params: {
      series: 'Digimon Card Game',
      sort: 'name',
      ...params
    }
  })
  return Array.isArray(response.data) ? response.data : []
}

export async function getCardByNumber(cardnumber: string): Promise<DigimonCard | null> {
  const cards = await searchCards({})
  return cards.find((c) => c.cardnumber === cardnumber) ?? null
}
