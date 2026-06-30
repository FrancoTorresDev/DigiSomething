<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { loadAdSenseScript, requestAdRender, hasAdSenseConfig, getAdSenseClientId } from '@/services/adsense'
import { onAdConsentChange, readAdConsent } from '@/services/adConsent'

const props = withDefaults(defineProps<{
  slot: string
  format?: string
  responsive?: boolean
}>(), {
  format: 'auto',
  responsive: true,
})

const adRef = ref<HTMLElement | null>(null)
const initialized = ref(false)
const consent = ref(readAdConsent())
let stopConsentListener: (() => void) | null = null

const canAttempt = computed(() => {
  return hasAdSenseConfig() && !!props.slot && consent.value === 'accepted'
})

async function initAd(): Promise<void> {
  if (!canAttempt.value || initialized.value) return
  if (!adRef.value) return

  const loaded = await loadAdSenseScript()
  if (!loaded) return

  await nextTick()
  initialized.value = requestAdRender()
}

onMounted(async () => {
  stopConsentListener = onAdConsentChange((state) => {
    consent.value = state
    if (state === 'accepted') {
      void initAd()
    }
  })

  await initAd()
})

onUnmounted(() => {
  stopConsentListener?.()
})

watch(() => props.slot, () => {
  initialized.value = false
  void initAd()
})
</script>

<template>
  <div v-if="slot && hasAdSenseConfig() && consent === 'accepted'" class="rounded-xl border border-ds-neon/20 bg-ds-navy/40 p-2">
    <ins
      ref="adRef"
      class="adsbygoogle block"
      style="min-height: 90px"
      :data-ad-client="getAdSenseClientId()"
      :data-ad-slot="slot"
      :data-ad-format="format"
      :data-full-width-responsive="responsive ? 'true' : 'false'"
    />
  </div>
</template>
