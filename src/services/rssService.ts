import axios from 'axios'

// rss2json.com converts any RSS feed to JSON with CORS support (free tier: 10k req/month)
const RSS2JSON = 'https://api.rss2json.com/v1/api.json'

// Digimon Card Game subreddit — reliable public RSS source
const FEED_URL = 'https://www.reddit.com/r/DigimonCardGame2020/top.rss?t=week'

export interface NewsItem {
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail: string
  author: string
}

interface Rss2JsonItem {
  title: string
  link: string
  pubDate: string
  description: string
  thumbnail: string
  enclosure?: { link: string }
  author: string
}

interface Rss2JsonResponse {
  status: string
  items: Rss2JsonItem[]
}

export async function fetchNews(): Promise<NewsItem[]> {
  const response = await axios.get<Rss2JsonResponse>(RSS2JSON, {
    params: { rss_url: FEED_URL, count: 15 }
  })

  if (response.data.status !== 'ok') return []

  return response.data.items.map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: item.description,
    thumbnail: item.thumbnail || item.enclosure?.link || '',
    author: item.author
  }))
}
