const { onRequest } = require('firebase-functions/v2/https')

const JUSTTCG_BASE = 'https://api.justtcg.com/v1'
const DIGIMON_GAME_ID = 'digimon-card-game'
const PRICE_CACHE_TTL_MS = 10 * 60 * 1000

const priceCache = new Map()
let lastJustTcgRequestAt = 0

function normalizeCardNumber(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function extractCanonicalCardNumber(value) {
  const raw = String(value ?? '').toUpperCase().trim()
  if (!raw) return ''

  const match = raw.match(/[A-Z]{1,4}\d{0,2}-\d{3}/)
  if (match?.[0]) return normalizeCardNumber(match[0])

  return normalizeCardNumber(raw)
}

function extractSetCode(cardnumber) {
  const normalized = normalizeCardNumber(cardnumber)
  const match = normalized.match(/^([A-Z]{1,4}\d{0,2})-\d{3}$/)
  return match?.[1] ?? ''
}

function normalizeName(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function pickNumericPrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function extractPrice(card) {
  const directFields = [
    card?.price,
    card?.marketPrice,
    card?.lowPrice,
    card?.midPrice,
    card?.avgPrice,
    card?.prices?.market,
    card?.prices?.mid,
    card?.prices?.avg,
    card?.prices?.low,
  ]
  for (const value of directFields) {
    const numeric = pickNumericPrice(value)
    if (numeric !== null) return numeric
  }

  if (Array.isArray(card?.variants)) {
    const variantPrices = card.variants
      .map((variant) => pickNumericPrice(variant?.price ?? variant?.marketPrice ?? variant?.lowPrice))
      .filter((value) => value !== null)
    if (variantPrices.length > 0) return Math.min(...variantPrices)
  }

  return null
}

function cardMatches(item, normalizedCardNumber) {
  const candidates = [
    item?.cardnumber,
    item?.cardNumber,
    item?.number,
    item?.code,
    item?.id,
    item?.sku,
  ]

  for (const candidate of candidates) {
    if (extractCanonicalCardNumber(candidate) === normalizedCardNumber) return true
  }

  const name = String(item?.name ?? '').toUpperCase()
  return name.includes(normalizedCardNumber)
}

function cardNameMatches(item, cardName) {
  const needle = normalizeName(cardName)
  if (!needle) return false
  const hay = normalizeName(item?.name)
  if (!hay) return false
  return hay === needle || hay.startsWith(`${needle} `) || hay.includes(` ${needle} `)
}

function cardHasSetCode(item, setCode) {
  if (!setCode) return false
  const values = [item?.number, item?.cardnumber, item?.cardNumber, item?.code, item?.id]
  return values.some((value) => normalizeCardNumber(value).includes(setCode))
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function throttleJustTcgRequests(minGapMs = 350) {
  const now = Date.now()
  const elapsed = now - lastJustTcgRequestAt
  if (elapsed < minGapMs) {
    await wait(minGapMs - elapsed)
  }
  lastJustTcgRequestAt = Date.now()
}

async function justTcgGetCards(apiKey, params) {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const url = new URL(`${JUSTTCG_BASE}/cards`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })

    await throttleJustTcgRequests()

    const upstream = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
      },
    })

    let payload = null
    try {
      payload = await upstream.json()
    } catch {
      payload = null
    }

    if (upstream.ok) {
      return Array.isArray(payload?.data) ? payload.data : []
    }

    const isRateLimited = upstream.status === 429 || payload?.code === 'RATE_LIMIT_EXCEEDED'
    if (isRateLimited && attempt < maxAttempts) {
      await wait(350 * attempt)
      continue
    }

    throw new Error(payload?.error ?? `JustTCG request failed (${upstream.status})`)
  }

  return []
}

async function lookupCardPrice(apiKey, cardnumber, cardName) {
  const normalized = normalizeCardNumber(cardnumber)
  const setCode = extractSetCode(normalized)

  const cached = priceCache.get(normalized)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const attempts = [
    { game: DIGIMON_GAME_ID, q: normalized, limit: 25 },
    { game: DIGIMON_GAME_ID, q: cardName, limit: 25 },
  ]

  for (const params of attempts) {
    const data = await justTcgGetCards(apiKey, params)
    if (!data.length) continue

    const exact = data.find((item) => cardMatches(item, normalized))
    let chosen = exact

    if (!chosen && cardName) {
      const byName = data.filter((item) => cardNameMatches(item, cardName))
      const byNameAndSet = byName.filter((item) => cardHasSetCode(item, setCode))
      if (byNameAndSet.length > 0) chosen = byNameAndSet[0]
      else if (byName.length === 1) chosen = byName[0]
    }

    if (!chosen) continue

    const price = extractPrice(chosen)
    if (price !== null) {
      const value = {
        unitPrice: price,
        matchedName: String(chosen?.name ?? ''),
      }
      priceCache.set(normalized, {
        value,
        expiresAt: Date.now() + PRICE_CACHE_TTL_MS,
      })
      return value
    }
  }

  priceCache.set(normalized, {
    value: null,
    expiresAt: Date.now() + Math.min(PRICE_CACHE_TTL_MS, 60 * 1000),
  })
  return null
}

async function runWithConcurrency(items, worker, concurrency = 1) {
  const results = new Array(items.length)
  let cursor = 0

  async function runWorker() {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => runWorker()))
  return results
}

/**
 * Proxies requests to the Digimon Card Game public API to bypass CORS restrictions.
 * Mapped from /digimon-api/** → https://digimoncard.io/api-public/**
 */
exports.digimonProxy = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  const path = req.path.replace(/^\/digimon-api/, '/api-public')
  const query = new URLSearchParams(req.query).toString()
  const url = `https://digimoncard.io${path}${query ? '?' + query : ''}`

  try {
    const upstream = await fetch(url)
    const data = await upstream.json()
    res.set('Cache-Control', 'public, max-age=3600')
    res.json(data)
  } catch {
    res.status(502).json({ error: 'Failed to reach Digimon API' })
  }
})

/**
 * Proxies requests to the Limitless TCG API for tournament data.
 * Mapped from /limitless-api/** → https://play.limitlesstcg.com/api/**
 */
exports.limitlessProxy = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  const path = req.path.replace(/^\/limitless-api/, '/api')
  const query = new URLSearchParams(req.query).toString()
  const url = `https://play.limitlesstcg.com${path}${query ? '?' + query : ''}`

  try {
    const upstream = await fetch(url)
    const data = await upstream.json()
    res.set('Cache-Control', 'public, max-age=300')
    res.json(data)
  } catch {
    res.status(502).json({ error: 'Failed to reach Limitless API' })
  }
})

/**
 * Secure JustTCG pricing proxy for deck/card pricing.
 * Endpoint: POST /justtcg-api/pricing
 */
exports.justTcgPricingProxy = onRequest({ cors: true, region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (req.path !== '/pricing') {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const apiKey = process.env.JUSTTCG_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Server missing JUSTTCG_API_KEY' })
    return
  }

  const cards = Array.isArray(req.body?.cards) ? req.body.cards : []
  if (!cards.length) {
    res.status(400).json({ error: 'cards array is required' })
    return
  }

  const uniqueCards = []
  const seen = new Set()
  for (const card of cards) {
    const cardnumber = normalizeCardNumber(card?.cardnumber)
    if (!cardnumber || seen.has(cardnumber)) continue
    seen.add(cardnumber)
    uniqueCards.push({
      cardnumber,
      name: String(card?.name ?? ''),
    })
  }

  try {
    const lookedUp = await runWithConcurrency(
      uniqueCards,
      async (card) => {
        try {
          const match = await lookupCardPrice(apiKey, card.cardnumber, card.name)
          return { cardnumber: card.cardnumber, match }
        } catch (error) {
          return {
            cardnumber: card.cardnumber,
            match: null,
            error: error instanceof Error ? error.message : 'lookup_failed',
          }
        }
      },
      1
    )

    const prices = {}
    const unmatched = []
    let hasRateLimitError = false

    for (const result of lookedUp) {
      if (String(result?.error ?? '').toLowerCase().includes('rate limit')) {
        hasRateLimitError = true
      }

      if (result?.match?.unitPrice !== undefined && result.match.unitPrice !== null) {
        prices[result.cardnumber] = {
          unitPrice: Number(result.match.unitPrice),
          matchedName: result.match.matchedName,
        }
      } else {
        unmatched.push(result.cardnumber)
      }
    }

    if (hasRateLimitError && Object.keys(prices).length === 0) {
      res.status(429).json({ error: 'JustTCG rate limit reached. Please retry in a minute.' })
      return
    }

    let deck = 0
    let main = 0
    let eggs = 0

    for (const card of cards) {
      const cardnumber = normalizeCardNumber(card?.cardnumber)
      const quantity = Number(card?.quantity ?? 0)
      const unitPrice = prices[cardnumber]?.unitPrice
      if (!Number.isFinite(quantity) || quantity <= 0 || unitPrice === undefined) continue

      const lineTotal = unitPrice * quantity
      deck += lineTotal
      if (String(card?.type) === 'Digi-Egg') eggs += lineTotal
      else main += lineTotal
    }

    res.set('Cache-Control', 'private, max-age=120')
    res.json({
      data: {
        prices,
        unmatched,
        totals: { deck, main, eggs },
      },
    })
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to fetch JustTCG pricing',
    })
  }
})
