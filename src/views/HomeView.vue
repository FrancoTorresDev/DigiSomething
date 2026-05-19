<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchNews, type NewsItem } from '@/services/rssService'

const news = ref<NewsItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    news.value = await fetchNews()
  } catch {
    error.value = 'Could not load news feed. Please try again later.'
  } finally {
    loading.value = false
  }
})

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
      <p class="text-gray-400">Latest from the Digimon Card Game community</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-gray-500">
      <p class="mb-3">{{ error }}</p>
      <button
        @click="() => { loading = true; fetchNews().then(n => { news = n; error = null }).catch(() => { error = 'Failed' }).finally(() => { loading = false }) }"
        class="text-sm text-blue-400 hover:underline"
      >
        Retry
      </button>
    </div>

    <!-- Empty -->
    <div v-else-if="news.length === 0" class="text-center py-20 text-gray-500">
      <p>No news articles found.</p>
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
        />
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
    </div>
  </div>
</template>
