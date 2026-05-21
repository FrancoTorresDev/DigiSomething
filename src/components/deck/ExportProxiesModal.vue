<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Deck } from '@/models/Deck'

const props = defineProps<{ deck: Deck }>()
const emit = defineEmits<{ close: [] }>()

type Layout = '3x3' | '4x4'

const layout = ref<Layout>('3x3')
const includeEggs = ref(true)

const COLS: Record<Layout, number> = { '3x3': 3, '4x4': 4 }
const PER_PAGE: Record<Layout, number> = { '3x3': 9, '4x4': 16 }

const allCards = computed(() =>
  props.deck.cards
    .filter(e => includeEggs.value || e.card.type !== 'Digi-Egg')
    .flatMap(e => Array(e.quantity).fill(e.card))
)

const pageCount = computed(() =>
  Math.max(1, Math.ceil(allCards.value.length / PER_PAGE[layout.value]))
)

function openPrintPreview() {
  const cols = COLS[layout.value]
  const cardSize = cols === 3 ? '63mm' : '47mm'
  const cardHeight = cols === 3 ? '88mm' : '65mm'

  const cardsHtml = allCards.value
    .map(c => {
      const src = `/card-images/${c.cardnumber}.jpg`
      return `<div class="card"><img src="${src}" alt="${c.name}" onerror="this.style.display='none'" /></div>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proxies – ${props.deck.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; font-family: sans-serif; }
    .header { padding: 8mm 10mm 4mm; font-size: 14pt; font-weight: bold; color: #111; }
    .grid {
      display: grid;
      grid-template-columns: repeat(${cols}, ${cardSize});
      gap: 3mm;
      padding: 0 10mm 10mm;
    }
    .card {
      width: ${cardSize};
      height: ${cardHeight};
      border: 0.5pt solid #ccc;
      border-radius: 3mm;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
    @media print {
      .header { padding-top: 0; }
      @page { margin: 10mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="header">${props.deck.name} — Proxy Cards</div>
  <div class="grid">${cardsHtml}</div>
  <script>window.onload = () => window.print()<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      @mousedown.self="emit('close')"
    >
      <div class="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <!-- Close -->
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <div class="p-6">
          <h2 class="text-lg font-bold text-white">Export Proxies</h2>
          <p class="text-sm text-gray-400 mt-0.5 mb-6">Print-ready proxy cards for your deck</p>

          <!-- Layout -->
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cards per Sheet</p>
          <div class="grid grid-cols-2 gap-2 mb-5">
            <button
              v-for="opt in (['3x3', '4x4'] as Layout[])"
              :key="opt"
              @click="layout = opt"
              class="py-3 rounded-xl text-sm font-semibold border transition-colors flex flex-col items-center gap-0.5"
              :class="layout === opt
                ? 'bg-gray-700 text-white border-gray-500'
                : 'bg-gray-800 text-gray-400 hover:text-white border-transparent'"
            >
              <span>{{ opt }}</span>
              <span class="text-xs font-normal opacity-60">{{ PER_PAGE[opt] }} cards</span>
            </button>
          </div>

          <!-- Display Options -->
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Options</p>
          <div class="border border-gray-800 rounded-xl overflow-hidden mb-6">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-sm font-medium text-white">Include Digi-Eggs</p>
                <p class="text-xs text-gray-500 mt-0.5">Add egg cards to the proxy sheet</p>
              </div>
              <button
                @click="includeEggs = !includeEggs"
                class="relative w-10 h-6 rounded-full transition-colors shrink-0"
                :class="includeEggs ? 'bg-yellow-500' : 'bg-gray-700'"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  :class="includeEggs ? 'translate-x-4' : 'translate-x-0.5'"
                ></span>
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="flex items-center justify-between mb-5 text-sm text-gray-400">
            <span>{{ allCards.length }} cards total</span>
            <span>{{ pageCount }} {{ pageCount === 1 ? 'page' : 'pages' }}</span>
          </div>

          <!-- Print -->
          <button
            @click="openPrintPreview"
            :disabled="allCards.length === 0"
            class="w-full py-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Open Print Preview
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
