import axios from 'axios'
import type { DigimonCard } from '@/models/Card'

const API_PROXY_BASE = (import.meta.env.VITE_API_PROXY_BASE ?? '').replace(/\/$/, '')
const BASE_URL = API_PROXY_BASE
  ? `${API_PROXY_BASE}/digimon-api/search.php`
  : '/digimon-api/search.php'
const IMAGE_BASE = 'https://images.digimoncard.io/images/cards'

/** Raw shape returned by digimoncard.io/api-public (snake_case) */
interface ApiCard {
  id: string
  name: string
  type: string
  color: string
  color2: string | null
  level: number | null
  dp: number | null
  play_cost: number | null
  evolution_cost: number | null
  rarity: string
  set_name: string[] | string | null
  main_effect: string | null
  source_effect: string | null
  digi_type: string | null
  attribute: string | null
  form: string | null
}

function mapCard(api: ApiCard): DigimonCard {
  const setName = Array.isArray(api.set_name)
    ? api.set_name[0] ?? undefined
    : api.set_name ?? undefined
  return {
    cardnumber: api.id,
    name: api.name,
    type: api.type,
    color: api.color,
    color2: api.color2 ?? undefined,
    level: api.level ?? undefined,
    dp: api.dp ?? undefined,
    playCost: api.play_cost ?? undefined,
    useCost: api.evolution_cost ?? undefined,
    rarity: api.rarity,
    set_name: setName,
    imgurl: `${IMAGE_BASE}/${api.id}.jpg`,
    mainEffect: api.main_effect ?? undefined,
    sourceEffect: api.source_effect ?? undefined
  }
}

export interface CardSearchParams {
  sort?: 'name' | 'color' | 'type'
  type?: string
  color?: string
  level?: number
  page?: number
  num?: number
  series?: string
}

export async function searchCards(params: CardSearchParams = {}): Promise<DigimonCard[]> {
  const response = await axios.get<ApiCard[]>(BASE_URL, {
    params: {
      series: 'Digimon Card Game',
      sort: 'name',
      ...params
    }
  })
  return Array.isArray(response.data) ? response.data.map(mapCard) : []
}

export async function getCardByNumber(cardnumber: string): Promise<DigimonCard | null> {
  const response = await axios.get<ApiCard[]>(BASE_URL, {
    params: { series: 'Digimon Card Game', n: cardnumber }
  })
  const cards = Array.isArray(response.data) ? response.data : []
  const exact = cards.find((c) => c.id === cardnumber)
  return exact ? mapCard(exact) : cards.length > 0 ? mapCard(cards[0]) : null
}

/** Fetch all cards from a specific set by its series name. Paginates automatically. */
export async function fetchCardsBySeries(series: string): Promise<DigimonCard[]> {
  const results: DigimonCard[] = []
  const seen = new Set<string>()
  let page = 1
  while (true) {
    const cards = await searchCards({ series, page, num: 50 })
    if (!cards.length) break
    for (const c of cards) {
      if (!seen.has(c.cardnumber)) { seen.add(c.cardnumber); results.push(c) }
    }
    if (cards.length < 50) break
    page++
    if (page > 10) break // safety: max 500 cards
  }
  return results
}
