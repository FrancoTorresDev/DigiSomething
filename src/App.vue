<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/layout/Navbar.vue'
import AdConsentBanner from '@/components/ads/AdConsentBanner.vue'
import StickyFooterAd from '@/components/ads/StickyFooterAd.vue'

const route = useRoute()
const stickySlot = import.meta.env.VITE_ADSENSE_SLOT_STICKY_FOOTER ?? ''
const hideStickyRoutes = ['/deck-builder']

const showStickyAd = computed(() => {
  if (!stickySlot) return false
  return !hideStickyRoutes.some((prefix) => route.path.startsWith(prefix))
})
</script>

<template>
  <div class="min-h-screen overflow-x-hidden text-ds-soft-white">
    <Navbar />
    <main
      class="min-h-[calc(100svh-4rem)] pt-16"
      :class="showStickyAd ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]' : 'pb-[env(safe-area-inset-bottom)]'"
    >
      <RouterView />
    </main>
    <StickyFooterAd v-if="showStickyAd" :slot="stickySlot" />
    <AdConsentBanner />
  </div>
</template>
