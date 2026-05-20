const { onRequest } = require('firebase-functions/v2/https')

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
