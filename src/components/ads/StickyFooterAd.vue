<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import AdSlot from './AdSlot.vue'
import { onAdConsentChange, readAdConsent } from '@/services/adConsent'

const props = defineProps<{ slot: string }>()

const dismissed = ref(false)
const hasConsent = ref(readAdConsent() === 'accepted')
let stopConsentListener: (() => void) | null = null

onMounted(() => {
  stopConsentListener = onAdConsentChange((state) => {
    hasConsent.value = state === 'accepted'
  })
})

onUnmounted(() => {
  stopConsentListener?.()
})
</script>

<template>
  <div v-if="slot && !dismissed && hasConsent" class="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
    <div class="mx-auto max-w-3xl rounded-xl border border-ds-neon/30 bg-ds-midnight/95 p-2 shadow-2xl backdrop-blur">
      <button
        class="mb-1 ml-auto block rounded-md px-2 py-0.5 text-[10px] font-semibold text-ds-slate hover:text-ds-soft-white"
        @click="dismissed = true"
      >
        Close
      </button>
      <AdSlot :slot="slot" format="horizontal" :responsive="true" />
    </div>
  </div>
</template>
