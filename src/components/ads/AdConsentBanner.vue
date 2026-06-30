<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { readAdConsent, writeAdConsent } from '@/services/adConsent'

const visible = ref(false)

onMounted(() => {
  visible.value = readAdConsent() === 'unknown'
})

function accept(): void {
  writeAdConsent('accepted')
  visible.value = false
}

function reject(): void {
  writeAdConsent('rejected')
  visible.value = false
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-4 left-4 right-4 z-[70] rounded-xl border border-ds-neon/30 bg-ds-navy/95 p-4 shadow-2xl backdrop-blur"
  >
    <p class="text-sm text-ds-soft-white">
      We use cookies and similar technologies to personalize ads and support the site.
    </p>
    <p class="mt-1 text-xs text-ds-slate">
      You can accept ads cookies or reject non-essential cookies.
    </p>

    <div class="mt-3 flex flex-wrap gap-2">
      <button
        class="rounded-lg bg-ds-gold px-3 py-1.5 text-xs font-semibold text-ds-midnight hover:bg-ds-gold/85"
        @click="accept"
      >
        Accept Ads Cookies
      </button>
      <button
        class="rounded-lg border border-ds-neon/30 px-3 py-1.5 text-xs font-semibold text-ds-soft-white hover:border-ds-neon/60"
        @click="reject"
      >
        Reject Non-Essential
      </button>
    </div>
  </div>
</template>
