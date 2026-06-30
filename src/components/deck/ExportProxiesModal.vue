<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Deck } from '@/models/Deck'
import type { DigimonCard } from '@/models/Card'
import BaseButton from '@/components/ui/BaseButton.vue'
import { cardImageUrl } from '@/services/exportAssets'

const props = defineProps<{ deck: Deck }>()
const emit = defineEmits<{ close: [] }>()

// ── Settings ──────────────────────────────────────────────────────────────
const step        = ref<'settings' | 'preview'>('settings')
const includeEggs = ref(true)

const COLS = 3
const ROWS = 3
const PER  = COLS * ROWS   // 9 cards per page

const allCards = computed<DigimonCard[]>(() =>
  props.deck.cards
    .filter(e => includeEggs.value || e.card.type !== 'Digi-Egg')
    .flatMap(e => Array<DigimonCard>(e.quantity).fill(e.card))
)

const pageCount = computed(() =>
  Math.max(1, Math.ceil(allCards.value.length / PER))
)

// ── Preview state ─────────────────────────────────────────────────────────
const generating  = ref(false)
const pageUrls    = ref<string[]>([])
const currentPage = ref(0)

// ── Helpers ───────────────────────────────────────────────────────────────
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// ── Generate canvas pages ─────────────────────────────────────────────────
async function generatePreview() {
  generating.value = true
  step.value = 'preview'
  pageUrls.value = []
  currentPage.value = 0

  try {
    const SCALE = 2

    // ── Real mm → pixel mapping (96 dpi, A4 = 210×297 mm) ──────────────
    // 1 inch = 25.4 mm  →  96 px/in ÷ 25.4 mm/in = 3.7795 px/mm
    const PX   = 96 / 25.4                    // px per mm
    const PAGE_W = Math.round(210 * PX)        // 794 px
    const PAGE_H = Math.round(297 * PX)        // 1122 px

    // Digimon card size matching digiprintmon.com: 64 mm × 89 mm, 0 mm gutter
    const REAL_CW = Math.round(64 * PX)        // 242 px
    const GAP     = 0                          // no gutter between cards

    // 3×3 fixed layout — COLS/ROWS/PER are module-level constants
    const CARD_W = REAL_CW
    const CARD_H = Math.round(CARD_W * (89 / 64))

    // Center the grid on the page
    const gridW  = COLS * CARD_W + (COLS - 1) * GAP
    const gridH  = ROWS * CARD_H + (ROWS - 1) * GAP
    const startX = Math.round((PAGE_W - gridW) / 2)
    const startY = Math.round((PAGE_H - gridH) / 2)

    const urls: string[] = []

    for (let p = 0; p < pageCount.value; p++) {
      const pageCards = allCards.value.slice(p * PER, (p + 1) * PER)

      const canvas  = document.createElement('canvas')
      canvas.width  = PAGE_W * SCALE
      canvas.height = PAGE_H * SCALE
      const ctx = canvas.getContext('2d')!
      ctx.scale(SCALE, SCALE)

      // White page background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, PAGE_W, PAGE_H)

      // Load this page's images in parallel
      const imgResults = await Promise.allSettled(
        pageCards.map(c => loadImg(cardImageUrl(c.cardnumber)))
      )

      imgResults.forEach((result, idx) => {
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        const x   = startX + col * (CARD_W + GAP)
        const y   = startY + row * (CARD_H + GAP)

        // Rounded card clip
        ctx.save()
        const r = 6
        ctx.beginPath()
        ctx.moveTo(x + r, y);              ctx.lineTo(x + CARD_W - r, y)
        ctx.quadraticCurveTo(x + CARD_W, y, x + CARD_W, y + r)
        ctx.lineTo(x + CARD_W, y + CARD_H - r); ctx.quadraticCurveTo(x + CARD_W, y + CARD_H, x + CARD_W - r, y + CARD_H)
        ctx.lineTo(x + r, y + CARD_H);    ctx.quadraticCurveTo(x, y + CARD_H, x, y + CARD_H - r)
        ctx.lineTo(x, y + r);             ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
        ctx.clip()

        if (result.status === 'fulfilled') {
          ctx.drawImage(result.value, x, y, CARD_W, CARD_H)
        } else {
          ctx.fillStyle = '#f3f4f6'
          ctx.fillRect(x, y, CARD_W, CARD_H)
          ctx.fillStyle = '#9ca3af'
          ctx.font = '10px sans-serif'
          ctx.fillText(pageCards[idx].cardnumber, x + 4, y + CARD_H / 2)
        }
        ctx.restore()
      })

      // Dashed cut-guide lines at every column and row boundary
      ctx.save()
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = '#bbbbbb'
      ctx.lineWidth = 0.6
      for (let col = 0; col <= COLS; col++) {
        const lx = startX + col * CARD_W
        ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, PAGE_H - 16); ctx.stroke()
      }
      for (let row = 0; row <= ROWS; row++) {
        const ly = startY + row * CARD_H
        ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(PAGE_W, ly); ctx.stroke()
      }
      ctx.restore()

      // Footer
      ctx.fillStyle = '#9ca3af'
      ctx.font = '9px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        `${props.deck.name}  ·  Page ${p + 1} of ${pageCount.value}  ·  3×3`,
        PAGE_W / 2, PAGE_H - 8
      )
      ctx.textAlign = 'left'

      urls.push(canvas.toDataURL('image/jpeg', 0.92))
    }

    pageUrls.value = urls
  } catch (e) {
    console.error('Proxy generation failed', e)
  } finally {
    generating.value = false
  }
}

// ── Download PDF — CSS mm layout (exact physical card size) ──────────────
function downloadPdf() {
  const cols = COLS
  const rows = ROWS
  const per  = PER

  // Card size matching digiprintmon.com: 64 mm × 89 mm, 0 mm gutter
  const GAP_MM   = 0
  const cardW_mm = 64
  const cardH_mm = 89

  const totalPages = Math.ceil(allCards.value.length / per)

  const pagesHtml = Array.from({ length: totalPages }, (_, p) => {
    const slice = allCards.value.slice(p * per, (p + 1) * per)
    const cardsHtml = slice.map(c =>
      `<div class="card"><img src="${cardImageUrl(c.cardnumber)}" alt="${c.cardnumber}" /></div>`
    ).join('')
    return (
      `<div class="page">` +
        `<div class="grid">${cardsHtml}</div>` +
        `<div class="footer">${props.deck.name} &nbsp;·&nbsp; Page ${p + 1} / ${totalPages}</div>` +
      `</div>`
    )
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Proxies – ${props.deck.name}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; font-family: sans-serif; }

    .page {
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .page:last-child { page-break-after: auto; }

    .grid {
      display: grid;
      grid-template-columns: repeat(${cols}, ${cardW_mm}mm);
      grid-auto-rows: ${cardH_mm}mm;
      gap: ${GAP_MM}mm;
    }

    .card {
      width: ${cardW_mm}mm;
      height: ${cardH_mm}mm;
      border-radius: 2.5mm;
      overflow: hidden;
      outline: 0.4pt dashed #bbb;
      outline-offset: 0;
    }
    .card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .footer {
      position: absolute;
      bottom: 4mm;
      font-size: 6.5pt;
      color: #aaa;
      text-align: center;
    }

    @page { size: A4 portrait; margin: 0; }
    @media print { body { background: #fff; } }
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    window.onload = function () {
      var imgs = Array.from(document.querySelectorAll('img'))
      var pending = imgs.length
      if (!pending) { window.print(); return; }
      imgs.forEach(function (img) {
        function done() { if (--pending === 0) window.print(); }
        if (img.complete) done(); else { img.onload = done; img.onerror = done; }
      })
    }
  <\/script>
</body>
</html>`

  // document.write keeps the same origin as the opener → Vite proxy paths work
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

function back() {
  step.value = 'settings'
  pageUrls.value = []
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      @mousedown.self="emit('close')"
    >
      <div
        class="relative bg-ds-navy border border-ds-neon/20 rounded-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300"
        :style="{ maxWidth: step === 'preview' ? '640px' : '420px' }"
      >
        <!-- Close -->
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 text-ds-slate hover:text-ds-soft-white transition-colors z-10"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- ─── SETTINGS ──────────────────────────────────────────── -->
        <div v-if="step === 'settings'" class="p-6">
          <h2 class="text-lg font-bold text-ds-soft-white">Export Proxies</h2>
          <p class="text-sm text-ds-slate/60 mt-0.5 mb-6">Print-ready A4 proxy sheets for your deck</p>

          <!-- Options -->
          <p class="text-xs font-semibold text-ds-slate/50 uppercase tracking-wider mb-2">Options</p>
          <div class="border border-ds-neon/20 rounded-xl overflow-hidden mb-6">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-sm font-medium text-ds-soft-white">Include Digi-Eggs</p>
                <p class="text-xs text-ds-slate/60 mt-0.5">Add egg cards to the proxy sheet</p>
              </div>
              <button
                @click="includeEggs = !includeEggs"
                class="relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0 focus:outline-none"
                :style="{ backgroundColor: includeEggs ? '#eab308' : '#374151' }"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  :style="{ transform: includeEggs ? 'translateX(20px)' : 'translateX(0px)' }"
                ></span>
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="flex items-center justify-between mb-5 text-sm text-ds-slate/60">
            <span>{{ allCards.length }} cards · {{ pageCount }} {{ pageCount === 1 ? 'page' : 'pages' }} · 3×3</span>
            <span class="text-xs">A4 portrait</span>
          </div>

          <!-- Generate -->
          <BaseButton
            variant="cta"
            size="lg"
            class="w-full"
            :disabled="allCards.length === 0"
            @click="generatePreview"
          >
            <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></template>
            Generate Preview
          </BaseButton>
        </div>

        <!-- ─── PREVIEW ────────────────────────────────────────────── -->
        <div v-else class="p-6">
          <!-- Back -->
          <BaseButton variant="ghost" size="sm" @click="back" class="mb-4">
            <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></template>
            Back to settings
          </BaseButton>

          <h2 class="text-lg font-bold text-ds-soft-white mb-1">Proxy Preview</h2>
          <p class="text-sm text-ds-slate/60 mb-4">
            {{ allCards.length }} cards · {{ pageUrls.length }} {{ pageUrls.length === 1 ? 'page' : 'pages' }} · A4 · 3×3
          </p>

          <!-- Generating spinner -->
          <div v-if="generating" class="flex flex-col items-center justify-center py-16 gap-4">
            <svg class="w-8 h-8 text-ds-gold animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p class="text-sm text-ds-slate/60">Rendering pages…</p>
          </div>

          <!-- Page image -->
          <div v-else-if="pageUrls.length" class="space-y-4">
            <!-- Canvas preview -->
            <div class="rounded-xl overflow-hidden border border-ds-neon/20 shadow-xl bg-white">
              <img
                :src="pageUrls[currentPage]"
                class="w-full block"
                :alt="`Page ${currentPage + 1}`"
              />
            </div>

            <!-- Page navigation -->
            <div v-if="pageUrls.length > 1" class="flex items-center justify-center gap-3">
              <button
                @click="currentPage--"
                :disabled="currentPage === 0"
                class="p-1.5 rounded-lg text-ds-slate hover:text-ds-soft-white disabled:opacity-30 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-sm text-ds-slate min-w-[80px] text-center">
                Page {{ currentPage + 1 }} / {{ pageUrls.length }}
              </span>
              <button
                @click="currentPage++"
                :disabled="currentPage === pageUrls.length - 1"
                class="p-1.5 rounded-lg text-ds-slate hover:text-ds-soft-white disabled:opacity-30 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-1 gap-2 pt-1">
              <BaseButton
                variant="cta"
                size="lg"
                class="w-full"
                @click="downloadPdf"
              >
                <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></template>
                Download PDF
              </BaseButton>
              <p class="text-xs text-center text-ds-slate/50">
                Opens a print dialog — choose "Save as PDF" in your browser
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
