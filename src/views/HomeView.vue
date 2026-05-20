<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchNews, type NewsItem } from '@/services/rssService'

const news = ref<NewsItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const afterCursor = ref<string | null>(null)
const hasMore = ref(false)

async function loadNews(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const page = await fetchNews(undefined, 15)
    news.value = page.items
    afterCursor.value = page.after
    hasMore.value = !!page.after
  } catch {
    error.value = 'Could not load news feed. Please try again later.'
  } finally {
    loading.value = false
  }
}

async function loadMore(): Promise<void> {
  if (!afterCursor.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const page = await fetchNews(afterCursor.value, 10)
    news.value.push(...page.items)
    afterCursor.value = page.after
    hasMore.value = !!page.after
  } finally {
    loadingMore.value = false
  }
}

onMounted(loadNews)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-10">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-1">News</h1>
      <p class="text-gray-400">
        Latest from the Digimon Card Game community ·
        <a
          href="https://www.reddit.com/r/DigimonCardGame2020"
          target="_blank"
          rel="noopener noreferrer"
          class="text-orange-400 hover:text-orange-300 transition-colors"
        >r/DigimonCardGame2020</a>
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-gray-500">
      <p class="mb-3">{{ error }}</p>
      <button
        @click="loadNews"
        class="text-sm text-blue-400 hover:underline"
      >
        Retry
      </button>
    </div>

    <!-- Empty -->
    <div v-else-if="news.length === 0" class="text-center py-20 text-gray-500">
      <p>No news posts this week.</p>
    </div>

    <!-- News feed -->
    <div v-else class="flex flex-col gap-4">
      <article
        v-for="item in news"
        :key="item.link"
        class="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex hover:border-gray-600 transition-colors"
      >
        <img
          v-if="item.thumbnail"
          :src="item.thumbnail"
          :alt="item.title"
          class="w-36 shrink-0 object-cover"
          loading="lazy"
          @error="(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }"
        />
        <!-- Shown when image errors out (sibling swap via @error above) -->
        <div :class="item.thumbnail ? 'hidden' : ''" class="w-36 shrink-0 bg-gray-800 flex flex-col items-center justify-center gap-1">
          <span class="text-3xl font-black tracking-tight text-yellow-500/40">DS</span>
          <span class="text-[9px] uppercase tracking-widest text-gray-600">DigiSomething</span>
        </div>
        <div class="p-5 flex-1 min-w-0">
          <p class="text-xs text-gray-500 mb-1.5">
            {{ item.author }} · {{ formatDate(item.pubDate) }}
          </p>
          <h2 class="text-base font-semibold text-white mb-2 line-clamp-2">{{ item.title }}</h2>
          <p class="text-sm text-gray-400 line-clamp-3">{{ stripHtml(item.description) }}</p>
          <a
            :href="item.link"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Read more →
          </a>
        </div>
      </article>

      <!-- Load More -->
      <div class="flex justify-center pt-2 pb-6">
        <button
          v-if="hasMore"
          @click="loadMore"
          :disabled="loadingMore"
          class="px-6 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-yellow-500 hover:text-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loadingMore" class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin inline-block"></span>
            Loading…
          </span>
          <span v-else>Load 10 more</span>
        </button>
        <p v-else class="text-xs text-gray-600">No more posts</p>
      </div>
    </div>
  </div>
</template>
