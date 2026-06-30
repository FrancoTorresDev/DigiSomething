export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      })
    }

    if (url.pathname === '/health') {
      return json({ ok: true }, 200)
    }

    if (url.pathname.startsWith('/digimon-api/')) {
      return proxyDigimon(url)
    }

    if (url.pathname.startsWith('/reddit-api/')) {
      return proxyReddit(url)
    }

    if (url.pathname.startsWith('/card-images/')) {
      return proxyCardImage(url)
    }

    if (url.pathname.startsWith('/qr-api/')) {
      return proxyQrCode(url)
    }

    return json({ error: 'Not found' }, 404)
  }
}

const REDDIT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

async function proxyDigimon(url) {
  const upstreamPath = url.pathname.replace('/digimon-api', '/api-public')
  const upstreamUrl = `https://digimoncard.io${upstreamPath}${url.search}`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': REDDIT_USER_AGENT
      }
    })

    const body = await upstream.arrayBuffer()
    const headers = new Headers(corsHeaders())
    headers.set('content-type', upstream.headers.get('content-type') || 'application/json')
    headers.set('cache-control', 'public, max-age=3600')

    return new Response(body, {
      status: upstream.status,
      headers
    })
  } catch {
    return json({ error: 'Failed to reach Digimon API' }, 502)
  }
}

async function proxyReddit(url) {
  const upstreamPath = url.pathname.replace('/reddit-api', '')
  const upstreamUrl = `https://www.reddit.com${upstreamPath}${url.search}`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': 'DigiSomethingNewsProxy/1.0'
      }
    })

    const contentType = upstream.headers.get('content-type') || ''
    const bodyText = await upstream.text()

    // Reddit sometimes blocks anonymous/script traffic; when that happens,
    // switch to subreddit RSS via rss2json and keep the app's JSON shape.
    if (isBlockedRedditResponse(upstream.status, contentType, bodyText)) {
      return proxyRedditViaRss(url, upstreamPath)
    }

    const headers = new Headers(corsHeaders())
    headers.set('content-type', contentType || 'application/json')
    headers.set('cache-control', 'public, max-age=120')

    return new Response(bodyText, {
      status: upstream.status,
      headers
    })
  } catch {
    return proxyRedditViaRss(url, upstreamPath)
  }
}

async function proxyCardImage(url) {
  const upstreamPath = url.pathname.replace('/card-images', '/images/cards')
  const upstreamUrl = `https://images.digimoncard.io${upstreamPath}${url.search}`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'image/*'
      }
    })

    const body = await upstream.arrayBuffer()
    const headers = new Headers(corsHeaders())
    headers.set('content-type', upstream.headers.get('content-type') || 'image/jpeg')
    headers.set('cache-control', 'public, max-age=86400')

    return new Response(body, {
      status: upstream.status,
      headers
    })
  } catch {
    return json({ error: 'Failed to reach card image CDN' }, 502)
  }
}

async function proxyQrCode(url) {
  const upstreamPath = url.pathname.replace('/qr-api', '')
  const upstreamUrl = `https://api.qrserver.com${upstreamPath}${url.search}`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'image/*'
      }
    })

    const body = await upstream.arrayBuffer()
    const headers = new Headers(corsHeaders())
    headers.set('content-type', upstream.headers.get('content-type') || 'image/png')
    headers.set('cache-control', 'public, max-age=3600')

    return new Response(body, {
      status: upstream.status,
      headers
    })
  } catch {
    return json({ error: 'Failed to reach QR API' }, 502)
  }
}

async function proxyRedditViaRss(url, upstreamPath) {
  const subreddit = getSubredditFromPath(upstreamPath) || 'DigimonCardGame2020'
  const query = (url.searchParams.get('q') || '').toLowerCase()
  const rssUrl = query.includes('flair:news')
    ? `https://www.reddit.com/r/${subreddit}/search.rss?q=flair%3ANews&restrict_sr=1&sort=new`
    : `https://www.reddit.com/r/${subreddit}/.rss`
  const offset = Math.max(0, Number(url.searchParams.get('after') || '0') || 0)
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || '15')))

  try {
    const upstream = await fetch(rssUrl, {
      method: 'GET',
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml',
        'user-agent': REDDIT_USER_AGENT
      }
    })

    if (!upstream.ok) {
      return json({ error: 'Failed to reach Reddit API' }, 502)
    }

    const xml = await upstream.text()
    const entries = extractEntriesFromRss(xml)
    return redditJsonResponseFromRawEntries(entries, offset, limit, 300, query.includes('flair:news'))
  } catch {
    return json({ error: 'Failed to reach Reddit API' }, 502)
  }
}

async function redditJsonResponseFromRawEntries(entries, offset, limit, maxAgeSeconds, forceNews = false) {
  const slice = entries.slice(offset, offset + limit)
  const nextOffset = offset + slice.length < entries.length ? String(offset + slice.length) : null
  const imageMap = forceNews
    ? await fetchRedditPostImages(slice)
    : new Map()
  const children = slice.map((entry) => ({
    data: {
      title: entry.title,
      permalink: toRedditPermalink(entry.link),
      created_utc: toUnixTime(entry.pubDate),
      author: entry.author || 'unknown',
      selftext: stripHtml(entry.description),
      thumbnail: imageMap.get(entry.link) || entry.thumbnail,
      url: entry.link,
      link_flair_text: forceNews ? 'News' : inferFlair(entry),
      is_gallery: false
    }
  }))

  return redditJsonResponse(children, maxAgeSeconds, nextOffset)
}

async function fetchRedditPostImages(entries) {
  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      if (!entry.link) return [entry.link, '']
      const imageUrl = await extractRedditPostImage(entry.link)
      return [entry.link, imageUrl]
    })
  )

  const imageMap = new Map()
  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const [link, imageUrl] = result.value
    if (link && imageUrl) imageMap.set(link, imageUrl)
  }

  return imageMap
}

async function extractRedditPostImage(link) {
  try {
    const url = new URL(link)
    const oldUrl = `https://old.reddit.com${url.pathname}`
    const response = await fetch(oldUrl, {
      method: 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': REDDIT_USER_AGENT
      }
    })

    if (!response.ok) return ''

    const html = await response.text()
    return extractRedditImageUrl(html)
  } catch {
    return ''
  }
}

function extractRedditImageUrl(html) {
  const candidates = [
    /https:\/\/preview\.redd\.it\/[^"'\s<>]+/gi,
    /https:\/\/i\.redd\.it\/[^"'\s<>]+/gi,
    /https:\/\/external-preview\.redd\.it\/[^"'\s<>]+/gi
  ]

  for (const pattern of candidates) {
    const match = pattern.exec(html)
    if (match?.[0]) {
      return decodeHtmlEntities(match[0].replace(/&amp;/g, '&'))
    }
  }

  return ''
}

function redditJsonResponse(children, maxAgeSeconds, after = null) {
  const normalized = {
    data: {
      after,
      children
    }
  }

  const headers = new Headers(corsHeaders())
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', `public, max-age=${maxAgeSeconds}`)

  return new Response(JSON.stringify(normalized), {
    status: 200,
    headers
  })
}

function extractEntriesFromRss(xml) {
  const entries = []
  const entryRegex = /<entry[\s\S]*?<\/entry>/gi
  const chunks = xml.match(entryRegex) || []

  for (const chunk of chunks) {
    const title = decodeEntities(extractTagValue(chunk, 'title') || '')
    const description = decodeEntities(extractTagValue(chunk, 'content') || extractTagValue(chunk, 'summary') || '')
    const pubDate = extractTagValue(chunk, 'updated') || extractTagValue(chunk, 'published') || ''
    const author = decodeEntities(extractTagValue(chunk, 'name') || '')
    const linkMatch = chunk.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)
    const link = linkMatch?.[1] || ''
    const thumbnail = extractFirstImageUrl(description)

    entries.push({ title, description, pubDate, author, link, thumbnail })
  }

  return entries
}

function extractTagValue(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(regex)
  return match?.[1] || ''
}

function extractFirstImageUrl(html) {
  const imgMatch = (html || '').match(/<img[^>]*src=["']([^"']+)["']/i)
  return imgMatch?.[1] || ''
}

function decodeEntities(value) {
  return (value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function isBlockedRedditResponse(status, contentType, bodyText) {
  if (status >= 400) return true
  if (!contentType.includes('application/json')) {
    const body = (bodyText || '').toLowerCase()
    if (body.includes('blocked by network security')) return true
    if (body.includes('whoa there, pardner')) return true
    return true
  }

  return false
}

function getSubredditFromPath(pathname) {
  const match = pathname.match(/^\/r\/([^/]+)/i)
  return match?.[1] || null
}

function toRedditPermalink(link) {
  if (!link) return ''
  try {
    const parsed = new URL(link)
    return parsed.pathname
  } catch {
    return ''
  }
}

function toUnixTime(value) {
  const ts = Date.parse(value || '')
  if (!Number.isFinite(ts)) return Math.floor(Date.now() / 1000)
  return Math.floor(ts / 1000)
}

function stripHtml(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferFlair(item) {
  const categories = Array.isArray(item?.categories) ? item.categories : []
  const text = `${item?.title || ''} ${item?.description || ''}`.toLowerCase()
  if (categories.some((c) => String(c).toLowerCase().includes('news'))) return 'News'
  if (text.includes('news') || text.includes('announce') || text.includes('update')) return 'News'
  return 'Discussion'
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization'
  }
}

function json(value, status) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json; charset=utf-8'
    }
  })
}
