import axios from 'axios'

// Proxied through Vite dev server to avoid Reddit CORS block
// Search for posts with News flair directly — more reliable than filtering top posts
const REDDIT_API = '/reddit-api/r/DigimonCardGame2020/search.json'

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail: string
  author: string
}

interface RedditPost {
  title: string
  permalink: string
  created_utc: number
  author: string
  selftext: string
  thumbnail: string
  url: string
  link_flair_text: string | null
  is_gallery?: boolean
  gallery_data?: {
    items: Array<{ media_id: string; id: number }>
  }
  media_metadata?: Record<string, {
    e: string
    m: string       // MIME type e.g. "image/jpg"
    status: string  // "valid" | "failed"
    s?: { u: string; x: number; y: number }
  }>
}

interface RedditResponse {
  data: {
    after: string | null
    children: Array<{ data: RedditPost }>
  }
}

export interface NewsPage {
  items: NewsItem[]
  after: string | null
}

export async function fetchNews(after?: string, limit = 15): Promise<NewsPage> {
  const response = await axios.get<RedditResponse>(REDDIT_API, {
    params: { q: 'flair:News', sort: 'new', restrict_sr: 1, limit, after },
    headers: { Accept: 'application/json' }
  })

  const items = response.data.data.children
    .filter(({ data: post }) => post.link_flair_text?.toLowerCase().includes('news'))
    .map(({ data: post }) => {
      let thumbnail = ''

      // 1. Gallery post — construct i.redd.it URL from first item (not ORB-blocked)
      if (post.is_gallery && post.gallery_data?.items?.length && post.media_metadata) {
        const firstId = post.gallery_data.items[0].media_id
        const meta = post.media_metadata[firstId]
        if (meta?.status === 'valid' && meta.m) {
          const ext = meta.m.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
          thumbnail = `https://i.redd.it/${firstId}.${ext}`
        }
      }

      // 2. YouTube link — use YouTube's public thumbnail CDN
      if (!thumbnail && post.url) {
        const ytMatch = post.url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        )
        if (ytMatch) {
          thumbnail = `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`
        }
      }

      // 3. Direct image link (i.redd.it) — safe to use
      if (!thumbnail && post.url?.startsWith('https://i.redd.it/')) {
        thumbnail = post.url
      }

      // 4. Simple thumbnail field — skip preview.redd.it (ORB-blocked)
      if (!thumbnail && post.thumbnail?.startsWith('http') && !post.thumbnail.includes('preview.redd.it')) {
        thumbnail = post.thumbnail
      }
      return {
        title: post.title,
        link: `https://www.reddit.com${post.permalink}`,
        pubDate: new Date(post.created_utc * 1000).toISOString(),
        description: post.selftext,
        thumbnail,
        author: post.author
      }
    })

  return { items, after: response.data.data.after }
}
