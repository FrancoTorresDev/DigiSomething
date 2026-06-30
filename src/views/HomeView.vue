<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { fetchNews, type NewsItem } from '@/services/rssService'
import AdSlot from '@/components/ads/AdSlot.vue'

const news = ref<NewsItem[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const afterCursor = ref<string | null>(null)
const hasMore = ref(false)
const imageErrors = reactive(new Set<string>())
const topAdSlot = import.meta.env.VITE_ADSENSE_SLOT_NEWS_TOP ?? ''
const inlineAdSlot = import.meta.env.VITE_ADSENSE_SLOT_NEWS_INLINE ?? ''

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


</script>

<template>
  <!-- Tech circuit background -->
  <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
    <svg
      class="absolute inset-0 w-full h-full"
      viewBox="0 0 3840 2160"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <!-- Deep near-black background, subtle blue tint -->
        <linearGradient id="pageBg" x1="0" y1="0" x2="3840" y2="2160" gradientUnits="userSpaceOnUse">
          <stop offset="0"    stop-color="#020A1E"/>
          <stop offset="0.40" stop-color="#010914"/>
          <stop offset="1"    stop-color="#040E30"/>
        </linearGradient>

        <!-- Strong left-edge radar glow — concentrated at (0, 1080) -->
        <radialGradient id="leftGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0 1080) scale(1100 1100)">
          <stop offset="0"    stop-color="#1254E8" stop-opacity="0.60"/>
          <stop offset="0.22" stop-color="#0E5BFF" stop-opacity="0.32"/>
          <stop offset="0.52" stop-color="#0A3CC2" stop-opacity="0.10"/>
          <stop offset="1"    stop-color="#0A3CC2" stop-opacity="0"/>
        </radialGradient>

        <!-- Subtle top-right hex area glow -->
        <radialGradient id="rightGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(3840 0) scale(1300 900)">
          <stop offset="0"    stop-color="#0E5BFF" stop-opacity="0.28"/>
          <stop offset="0.38" stop-color="#0E5BFF" stop-opacity="0.10"/>
          <stop offset="1"    stop-color="#0E5BFF" stop-opacity="0"/>
        </radialGradient>

        <!-- Very sparse dot grid -->
        <pattern id="dotGrid" width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.8" fill="#5B9FE8" fill-opacity="0.035"/>
        </pattern>

        <!-- Hex pattern — larger cells to match reference -->
        <pattern id="hexPattern" x="0" y="0" width="200" height="173.2" patternUnits="userSpaceOnUse">
          <path d="M50 4L150 4L200 86.6L150 169.2L50 169.2L0 86.6Z"
            stroke="#1EDCFF" stroke-opacity="0.18" stroke-width="2" fill="none"/>
        </pattern>

        <!-- Radar glow filter -->
        <filter id="radarGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Circuit trace glow -->
        <filter id="traceGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Pixel node glow -->
        <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Base + ambient glow layers -->
      <rect width="3840" height="2160" fill="url(#pageBg)"/>
      <rect width="3840" height="2160" fill="url(#leftGlow)"/>
      <rect width="3840" height="2160" fill="url(#rightGlow)"/>
      <rect width="3840" height="2160" fill="url(#dotGrid)"/>

      <!-- ── RADAR / HUD — centered on left edge at y=1080 ── -->
      <g filter="url(#radarGlow)">
        <!-- Outermost rings — very faint, mostly off-screen left -->
        <circle cx="0" cy="1080" r="1380" fill="none" stroke="#0E5BFF" stroke-opacity="0.10" stroke-width="2.5"/>
        <circle cx="0" cy="1080" r="1160" fill="none" stroke="#0E5BFF" stroke-opacity="0.13" stroke-width="2.5" stroke-dasharray="55 38"/>
        <circle cx="0" cy="1080" r="960"  fill="none" stroke="#1EDCFF" stroke-opacity="0.16" stroke-width="3"/>
        <circle cx="0" cy="1080" r="775"  fill="none" stroke="#0E5BFF" stroke-opacity="0.20" stroke-width="2.5" stroke-dasharray="40 28"/>
        <circle cx="0" cy="1080" r="600"  fill="none" stroke="#1EDCFF" stroke-opacity="0.27" stroke-width="3"/>
        <circle cx="0" cy="1080" r="442"  fill="none" stroke="#0E5BFF" stroke-opacity="0.35" stroke-width="3" stroke-dasharray="26 18"/>
        <circle cx="0" cy="1080" r="300"  fill="none" stroke="#1EDCFF" stroke-opacity="0.50" stroke-width="3.5"/>
        <circle cx="0" cy="1080" r="170"  fill="none" stroke="#1EDCFF" stroke-opacity="0.65" stroke-width="4"/>
        <circle cx="0" cy="1080" r="72"   fill="none" stroke="#76CFFF" stroke-opacity="0.80" stroke-width="4"/>
        <!-- Crosshair -->
        <path d="M0 550V1610" fill="none" stroke="#1EDCFF" stroke-opacity="0.12" stroke-width="2"/>
        <path d="M-420 1080H420" fill="none" stroke="#1EDCFF" stroke-opacity="0.12" stroke-width="2"/>
        <!-- Diagonal cross -->
        <path d="M-440 640L440 1520" fill="none" stroke="#0E5BFF" stroke-opacity="0.08" stroke-width="1.5"/>
        <path d="M440 640L-440 1520" fill="none" stroke="#0E5BFF" stroke-opacity="0.08" stroke-width="1.5"/>
      </g>
      <!-- Radar bright center point -->
      <circle cx="0" cy="1080" r="100" fill="#0B3FCC" opacity="0.55"/>
      <circle cx="0" cy="1080" r="52"  fill="#1EDCFF" opacity="0.70"/>
      <circle cx="0" cy="1080" r="26"  fill="#76CFFF" opacity="0.85"/>
      <circle cx="0" cy="1080" r="10"  fill="white"   opacity="0.95"/>

      <!-- ── RIGHT HEX FIELD — top-right corner ── -->
      <rect x="2520" y="0" width="1320" height="1280" fill="url(#hexPattern)"/>
      <!-- Subtle inner hex glow overlay -->
      <rect x="3200" y="0" width="640" height="560" fill="#0B3FCC" opacity="0.06"/>

      <!-- ── TOP-LEFT CIRCUIT TRACES ── -->
      <g filter="url(#traceGlow)" fill="none">
        <path d="M0 252H500L636 118H920"   stroke="#1EDCFF" stroke-opacity="0.48" stroke-width="2.5"/>
        <path d="M0 390H390L518 262H790"   stroke="#0E5BFF" stroke-opacity="0.36" stroke-width="2.5"/>
        <path d="M0 530H300L422 408H680"   stroke="#1EDCFF" stroke-opacity="0.28" stroke-width="2.5"/>
        <path d="M0 672H260L376 556H606"   stroke="#0E5BFF" stroke-opacity="0.22" stroke-width="2"/>
        <!-- Node dots at corners -->
        <circle cx="500" cy="252" r="9" fill="#1EDCFF" fill-opacity="0.70"/>
        <circle cx="390" cy="390" r="9" fill="#0E5BFF" fill-opacity="0.58"/>
        <circle cx="300" cy="530" r="8" fill="#1EDCFF" fill-opacity="0.50"/>
        <circle cx="260" cy="672" r="7" fill="#0E5BFF" fill-opacity="0.42"/>
      </g>

      <!-- ── RIGHT-SIDE CIRCUIT TRACES (from right edge going left) ── -->
      <g filter="url(#traceGlow)" fill="none">
        <path d="M3840 1330H3590L3462 1202H3210" stroke="#1EDCFF" stroke-opacity="0.34" stroke-width="2.5"/>
        <path d="M3840 1478H3560L3432 1350H3178" stroke="#0E5BFF" stroke-opacity="0.28" stroke-width="2.5"/>
        <path d="M3840 1624H3528L3400 1496H3148" stroke="#1EDCFF" stroke-opacity="0.24" stroke-width="2"/>
        <path d="M3840 1770H3500L3372 1642H3108" stroke="#0E5BFF" stroke-opacity="0.20" stroke-width="2"/>
        <!-- Node dots -->
        <circle cx="3590" cy="1330" r="8" fill="#1EDCFF" fill-opacity="0.58"/>
        <circle cx="3560" cy="1478" r="8" fill="#0E5BFF" fill-opacity="0.50"/>
        <circle cx="3528" cy="1624" r="7" fill="#1EDCFF" fill-opacity="0.44"/>
        <circle cx="3500" cy="1770" r="7" fill="#0E5BFF" fill-opacity="0.36"/>
      </g>

      <!-- ── SCATTERED PIXEL NODES ── -->
      <g filter="url(#nodeGlow)">
        <!-- Left cluster -->
        <rect x="460"  y="500"  width="24" height="24" fill="#1EDCFF" fill-opacity="0.62"/>
        <rect x="680"  y="820"  width="30" height="30" fill="#0E5BFF" fill-opacity="0.50"/>
        <rect x="300"  y="1340" width="26" height="26" fill="#1EDCFF" fill-opacity="0.55"/>
        <rect x="820"  y="1440" width="16" height="16" fill="#76CFFF" fill-opacity="0.48"/>
        <rect x="520"  y="1700" width="22" height="22" fill="#1EDCFF" fill-opacity="0.42"/>
        <!-- Center-left -->
        <rect x="1080" y="340"  width="18" height="18" fill="#1EDCFF" fill-opacity="0.42"/>
        <rect x="1500" y="1340" width="22" height="22" fill="#0E5BFF" fill-opacity="0.46"/>
        <rect x="1860" y="660"  width="16" height="16" fill="#76CFFF" fill-opacity="0.32"/>
        <!-- Right cluster -->
        <rect x="2820" y="440"  width="24" height="24" fill="#1EDCFF" fill-opacity="0.52"/>
        <rect x="3120" y="220"  width="28" height="28" fill="#0E5BFF" fill-opacity="0.44"/>
        <rect x="3460" y="660"  width="22" height="22" fill="#1EDCFF" fill-opacity="0.55"/>
        <rect x="2980" y="920"  width="26" height="26" fill="#1EDCFF" fill-opacity="0.40"/>
        <rect x="3310" y="1060" width="20" height="20" fill="#76CFFF" fill-opacity="0.48"/>
        <rect x="3650" y="1240" width="18" height="18" fill="#1EDCFF" fill-opacity="0.42"/>
        <rect x="3740" y="310"  width="24" height="24" fill="#0E5BFF" fill-opacity="0.36"/>
        <!-- Smaller dot nodes -->
        <circle cx="600"  cy="110"  r="7" fill="#1EDCFF" fill-opacity="0.58"/>
        <circle cx="1520" cy="500"  r="6" fill="#0E5BFF" fill-opacity="0.48"/>
        <circle cx="2860" cy="1300" r="6" fill="#1EDCFF" fill-opacity="0.44"/>
        <circle cx="3340" cy="500"  r="7" fill="#0E5BFF" fill-opacity="0.52"/>
        <circle cx="900"  cy="1620" r="6" fill="#76CFFF" fill-opacity="0.42"/>
        <circle cx="2100" cy="1800" r="5" fill="#1EDCFF" fill-opacity="0.32"/>
      </g>
    </svg>
  </div>

  <!-- Page content -->
  <div class="max-w-3xl mx-auto px-4 sm:px-5 pt-5 sm:pt-8 pb-10 sm:pb-12">
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-ds-soft-white mb-1 flex items-center gap-3">
        <span class="w-1 h-7 rounded-full bg-ds-gold shrink-0"></span>
        News
      </h1>
      <p class="text-ds-slate text-xs sm:text-sm pl-4">
        Latest from the Digimon Card Game community ·
        <a
          href="https://www.reddit.com/r/DigimonCardGame2020"
          target="_blank"
          rel="noopener noreferrer"
          class="text-ds-cyan hover:text-ds-royal transition-colors"
        >r/DigimonCardGame2020</a>
      </p>
    </div>

    <div v-if="topAdSlot" class="mb-6">
      <AdSlot :slot="topAdSlot" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-2 border-ds-cyan border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-ds-slate/60">
      <p class="mb-3">{{ error }}</p>
      <button @click="loadNews" class="text-sm text-ds-cyan hover:underline">Retry</button>
    </div>

    <!-- Empty -->
    <div v-else-if="news.length === 0" class="text-center py-20 text-ds-slate/60">
      <p>No news posts this week.</p>
    </div>

    <!-- News feed -->
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <a
        v-for="item in news"
        :key="item.link"
        :href="item.link"
        target="_blank"
        rel="noopener noreferrer"
        class="news-card group flex h-full flex-col overflow-hidden rounded-xl transition-all duration-200 ease-in-out hover:-translate-y-px"
      >
        <div class="relative aspect-[16/9] overflow-hidden bg-ds-midnight/90">
          <img
            v-if="item.thumbnail && !imageErrors.has(item.link)"
            :src="item.thumbnail"
            :alt="item.title"
            class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            @error="imageErrors.add(item.link)"
          />
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center gap-1 bg-[radial-gradient(circle_at_top,_rgba(30,220,255,0.16),_rgba(3,10,36,0.96))]"
          >
            <span class="text-3xl font-black tracking-tight text-ds-gold/45">DS</span>
            <span class="text-[10px] uppercase tracking-[0.28em] text-ds-slate/55">Reddit News</span>
          </div>
          <div class="absolute left-3 top-3 rounded-full border border-ds-neon/20 bg-ds-midnight/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ds-cyan">
            Reddit
          </div>
        </div>

        <div class="flex flex-1 flex-col justify-between p-4">
          <div>
            <p class="text-xs text-ds-slate mb-2">
              {{ item.author }} · {{ formatDate(item.pubDate) }}
            </p>
            <h2 class="text-[0.98rem] font-semibold leading-snug text-ds-soft-white line-clamp-3 group-hover:text-ds-cyan transition-colors">
              {{ item.title }}
            </h2>
          </div>

          <span class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-ds-cyan">
            Read more
            <svg class="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </span>
        </div>
      </a>

      <div v-if="inlineAdSlot" class="pt-2">
        <AdSlot :slot="inlineAdSlot" />
      </div>

      <!-- Load More -->
      <div class="flex justify-center pt-4 pb-6">
        <button
          v-if="hasMore"
          @click.prevent="loadMore"
          :disabled="loadingMore"
          class="px-6 py-2.5 rounded-lg border border-ds-neon/30 text-sm text-ds-slate hover:border-ds-cyan hover:text-ds-cyan transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loadingMore" class="flex items-center gap-2">
            <span class="w-4 h-4 border-2 border-ds-cyan border-t-transparent rounded-full animate-spin inline-block" />
            Loading…
          </span>
          <span v-else>Load 10 more</span>
        </button>
        <p v-else class="text-xs text-ds-slate/50">All caught up</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.news-card {
  background: linear-gradient(135deg, rgba(8, 24, 72, 0.82) 0%, rgba(3, 10, 36, 0.92) 100%);
  border: 1px solid rgba(30, 220, 255, 0.14);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.36), inset 0 1px 0 rgba(30, 220, 255, 0.06);
  min-height: 100%;
}
.news-card:hover {
  border-color: rgba(30, 220, 255, 0.42);
  box-shadow:
    0 0 0 1px rgba(30, 220, 255, 0.24),
    0 0 18px rgba(30, 220, 255, 0.12),
    0 8px 28px rgba(0, 0, 0, 0.48),
    inset 0 1px 0 rgba(30, 220, 255, 0.12);
}
</style>
