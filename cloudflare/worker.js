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

    return json({ error: 'Not found' }, 404)
  }
}

async function proxyDigimon(url) {
  const upstreamPath = url.pathname.replace('/digimon-api', '/api-public')
  const upstreamUrl = `https://digimoncard.io${upstreamPath}${url.search}`

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json'
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

async function proxyRedditViaRss(url, upstreamPath) {
  const subreddit = getSubredditFromPath(upstreamPath) || 'DigimonCardGame2020'
  const rssUrl = `https://www.reddit.com/r/${subreddit}/.rss`
  const rss2jsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || '15')))

  try {
    const upstream = await fetch(rss2jsonUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    })

    if (upstream.ok) {
      const payload = await upstream.json()
      const items = Array.isArray(payload?.items) ? payload.items.slice(0, limit) : []
      const children = items.map((item) => ({
        data: {
          title: item?.title || '',
          permalink: toRedditPermalink(item?.link),
          created_utc: toUnixTime(item?.pubDate),
          author: item?.author || 'unknown',
          selftext: stripHtml(item?.description || item?.content || ''),
          thumbnail: item?.thumbnail || item?.enclosure?.link || '',
          url: item?.link || '',
          link_flair_text: inferFlair(item),
          is_gallery: false
        }
      }))

      return redditJsonResponse(children, 300)
    }

    // If rss2json is unavailable, fall back to parsing Reddit RSS directly.
    return proxyRedditViaRawRss(rssUrl, limit)
  } catch {
    return proxyRedditViaRawRss(rssUrl, limit)
  }
}

async function proxyRedditViaRawRss(rssUrl, limit) {
  try {
    const rssResponse = await fetch(rssUrl, {
      method: 'GET',
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml'
      }
    })

    if (!rssResponse.ok) {
      return json({ error: 'Failed to reach Reddit API' }, 502)
    }

    const xml = await rssResponse.text()
    const entries = extractEntriesFromRss(xml).slice(0, limit)
    const children = entries.map((entry) => ({
      data: {
        title: entry.title,
        permalink: toRedditPermalink(entry.link),
        created_utc: toUnixTime(entry.pubDate),
        author: entry.author || 'unknown',
        selftext: stripHtml(entry.description),
        thumbnail: entry.thumbnail,
        url: entry.link,
        link_flair_text: inferFlair(entry),
        is_gallery: false
      }
    }))

    return redditJsonResponse(children, 180)
  } catch {
    return json({ error: 'Failed to reach Reddit API' }, 502)
  }
}

function redditJsonResponse(children, maxAgeSeconds) {
  const normalized = {
    data: {
      after: null,
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
