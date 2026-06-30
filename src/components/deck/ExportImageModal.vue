<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Deck } from '@/models/Deck'
import type { DigimonCard } from '@/models/Card'
import BaseButton from '@/components/ui/BaseButton.vue'
import { cardImageUrl, qrCodeUrl } from '@/services/exportAssets'

const props = defineProps<{ deck: Deck }>()
const emit = defineEmits<{ close: [] }>()

// ─── Step ──────────────────────────────────────────────────────────────────
const step = ref<'settings' | 'preview'>('settings')
const generating = ref(false)
const previewUrl = ref<string | null>(null)

// ─── Settings ──────────────────────────────────────────────────────────────
const background = ref<'default' | 'color'>('default')
const bgColor = ref('#030712')

type SortField = 'Type' | 'Color' | 'Level' | 'Cost' | 'DP' | 'Name'
interface SortLevel { field: SortField; dir: 'asc' | 'desc' }

const sortLevels = ref<SortLevel[]>([
  { field: 'Type',  dir: 'asc' },
  { field: 'Level', dir: 'asc' },
  { field: 'Name',  dir: 'asc' },
])
const ALL_FIELDS: SortField[] = ['Type', 'Color', 'Level', 'Cost', 'DP', 'Name']
const showAddSort = ref(false)

const availableToAdd = computed(() =>
  ALL_FIELDS.filter(f => !sortLevels.value.some(s => s.field === f))
)

function addSortLevel(field: SortField) {
  sortLevels.value.push({ field, dir: 'asc' })
  showAddSort.value = false
}
function removeSortLevel(i: number) { sortLevels.value.splice(i, 1) }
function toggleDir(i: number) {
  sortLevels.value[i].dir = sortLevels.value[i].dir === 'asc' ? 'desc' : 'asc'
}
function moveUp(i: number) {
  if (i === 0) return
  const tmp = sortLevels.value[i - 1]
  sortLevels.value[i - 1] = sortLevels.value[i]
  sortLevels.value[i] = tmp
}

// ─── Sorted cards ──────────────────────────────────────────────────────────
const TYPE_ORDER: Record<string, number> = { 'Digi-Egg': 0, Digimon: 1, Tamer: 2, Option: 3 }

function getSortVal(card: DigimonCard, field: SortField): string | number {
  switch (field) {
    case 'Type':  return TYPE_ORDER[card.type] ?? 9
    case 'Color': return card.color ?? ''
    case 'Level': return card.level ?? 0
    case 'Cost':  return card.playCost ?? card.useCost ?? 0
    case 'DP':    return card.dp ?? 0
    case 'Name':  return card.name ?? ''
  }
}

const sortedCards = computed<DigimonCard[]>(() => {
  // Always expand by quantity so every copy appears in the image
  const entries = props.deck.cards.flatMap(e => Array<DigimonCard>(e.quantity).fill(e.card))
  return [...entries].sort((a, b) => {
    for (const lvl of sortLevels.value) {
      const va = getSortVal(a, lvl.field)
      const vb = getSortVal(b, lvl.field)
      const cmp = va < vb ? -1 : va > vb ? 1 : 0
      if (cmp !== 0) return lvl.dir === 'asc' ? cmp : -cmp
    }
    return 0
  })
})

// ─── Canvas generation ─────────────────────────────────────────────────────
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function generatePreview() {
  generating.value = true
  step.value = 'preview'
  previewUrl.value = null

  try {
    const SCALE      = 2
    const PAD        = 24
    const GAP        = 5
    const CARD_W     = 76
    const CARD_H     = 106
    const EGG_W      = 64
    const EGG_H      = 90
    const QR_SIZE    = 72        // top-right header
    const HDR_H      = QR_SIZE + PAD * 2   // 120px – tall enough for QR
    const COLS       = 10
    const LABEL_H    = 28        // section label + padding
    const SEC_GAP    = 14        // gap between sections

    const allSorted  = sortedCards.value
    const eggCards   = allSorted.filter(c => c.type === 'Digi-Egg')
    const mainCards  = allSorted.filter(c => c.type !== 'Digi-Egg')

    const eggRows    = eggCards.length  > 0 ? Math.ceil(eggCards.length  / COLS) : 0
    const mainRows   = mainCards.length > 0 ? Math.ceil(mainCards.length / COLS) : 0

    const eggBlockH  = eggRows  > 0 ? LABEL_H + eggRows  * (EGG_H  + GAP) - GAP + SEC_GAP : 0
    const mainBlockH = mainRows > 0 ? LABEL_H + mainRows * (CARD_H + GAP) - GAP            : 0

    const LW = COLS * (CARD_W + GAP) - GAP + PAD * 2
    const LH = HDR_H + PAD + eggBlockH + (eggBlockH > 0 ? SEC_GAP : 0) + mainBlockH + PAD

    const canvas = document.createElement('canvas')
    canvas.width  = LW * SCALE
    canvas.height = LH * SCALE
    const ctx = canvas.getContext('2d')!
    ctx.scale(SCALE, SCALE)

    // Background
    ctx.fillStyle = background.value === 'color' ? bgColor.value : '#030712'
    ctx.fillRect(0, 0, LW, LH)

    // ── Load everything in parallel ────────────────────────────────────────
    const deckUrl = window.location.href

    const [qrResult, ...cardResults] = await Promise.allSettled([
      loadImg(qrCodeUrl(deckUrl, QR_SIZE * SCALE)),
      ...eggCards.map(c  => loadImg(cardImageUrl(c.cardnumber))),
      ...mainCards.map(c => loadImg(cardImageUrl(c.cardnumber))),
    ])

    const eggImgs  = cardResults.slice(0, eggCards.length)
    const mainImgs = cardResults.slice(eggCards.length)

    // ── Header text ────────────────────────────────────────────────────────
    const textMaxW = LW - PAD * 3 - QR_SIZE   // leave room for QR
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillText(props.deck.name, PAD, PAD + 22, textMaxW)
    if (props.deck.ownerName) {
      ctx.fillStyle = '#9ca3af'
      ctx.font = '13px system-ui, sans-serif'
      ctx.fillText(`by ${props.deck.ownerName}`, PAD, PAD + 44, textMaxW)
    }

    // ── QR code — top-right ────────────────────────────────────────────────
    if (qrResult.status === 'fulfilled') {
      const qx = LW - PAD - QR_SIZE
      const qy = PAD
      ctx.fillStyle = '#0a0f1a'
      ctx.fillRect(qx - 4, qy - 4, QR_SIZE + 8, QR_SIZE + 8)
      ctx.drawImage(qrResult.value, qx, qy, QR_SIZE, QR_SIZE)
    }

    // ── Header divider ────────────────────────────────────────────────────
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(PAD, HDR_H - 1, LW - PAD * 2, 1)

    // ── Helper: draw a card ───────────────────────────────────────────────
    function drawCard(result: PromiseSettledResult<HTMLImageElement>, x: number, y: number, w: number, h: number, label: string) {
      ctx.save()
      const r = 4
      ctx.beginPath()
      ctx.moveTo(x + r, y);         ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h);     ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r);         ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.clip()
      if (result.status === 'fulfilled') {
        ctx.drawImage(result.value, x, y, w, h)
      } else {
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(x, y, w, h)
        ctx.fillStyle = '#4b5563'
        ctx.font = '7px sans-serif'
        ctx.fillText(label, x + 3, y + h / 2)
      }
      ctx.restore()
    }

    // ── Helper: draw a section label ──────────────────────────────────────
    function drawLabel(text: string, y: number) {
      ctx.fillStyle = '#eab308'
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.fillText(text.toUpperCase(), PAD, y)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(PAD, y + 5, LW - PAD * 2, 1)
    }

    let curY = HDR_H + PAD

    // ── Digi-Egg section ──────────────────────────────────────────────────
    if (eggCards.length > 0) {
      drawLabel('Digi-Egg Deck', curY)
      curY += LABEL_H
      eggImgs.forEach((result, idx) => {
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        drawCard(result, PAD + col * (EGG_W + GAP), curY + row * (EGG_H + GAP), EGG_W, EGG_H, eggCards[idx].cardnumber)
      })
      curY += eggRows * (EGG_H + GAP) - GAP + SEC_GAP * 2
    }

    // ── Main Deck section ─────────────────────────────────────────────────
    if (mainCards.length > 0) {
      drawLabel('Main Deck', curY)
      curY += LABEL_H
      mainImgs.forEach((result, idx) => {
        const col = idx % COLS
        const row = Math.floor(idx / COLS)
        drawCard(result, PAD + col * (CARD_W + GAP), curY + row * (CARD_H + GAP), CARD_W, CARD_H, mainCards[idx].cardnumber)
      })
    }

    previewUrl.value = canvas.toDataURL('image/webp', 0.92)
  } catch (e) {
    console.error('Export image failed', e)
  } finally {
    generating.value = false
  }
}

function downloadImage() {
  if (!previewUrl.value) return
  const a = document.createElement('a')
  a.href = previewUrl.value
  a.download = `${props.deck.name.replace(/\s+/g, '_')}.webp`
  a.click()
}

async function copyToClipboard() {
  if (!previewUrl.value) return
  try {
    const res  = await fetch(previewUrl.value)
    const blob = await res.blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch (e) {
    console.error('Copy failed', e)
  }
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
        :style="{ maxWidth: step === 'preview' ? '860px' : '420px' }"
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

        <!-- ─── SETTINGS ──────────────────────────────────────────────── -->
        <div v-if="step === 'settings'" class="p-6">
          <h2 class="text-lg font-bold text-ds-soft-white">Export Image</h2>
          <p class="text-sm text-ds-slate/60 mt-0.5 mb-6">Generate a shareable image of your deck</p>

          <!-- Quality -->
          <p class="text-xs font-semibold text-ds-slate/50 uppercase tracking-wider mb-2">Quality</p>
          <div class="border border-ds-gold/40 bg-ds-gold/10 rounded-xl px-4 py-3 mb-5 text-center">
            <p class="font-semibold text-ds-soft-white text-sm">Standard</p>
            <p class="text-xs text-ds-slate/60">Full HD WebP</p>
          </div>

          <!-- Background -->
          <p class="text-xs font-semibold text-ds-slate/50 uppercase tracking-wider mb-2">Background</p>
          <div class="grid grid-cols-2 gap-2 mb-3">
            <button
              @click="background = 'default'"
              class="py-2.5 rounded-xl text-sm font-semibold border transition-colors"
              :class="background === 'default'
                ? 'bg-ds-navy text-ds-soft-white border-ds-neon/40'
                : 'bg-ds-midnight text-ds-slate hover:text-ds-soft-white border-transparent'"
            >Default</button>
            <button
              @click="background = 'color'"
              class="py-2.5 rounded-xl text-sm font-semibold border transition-colors flex items-center justify-center gap-2"
              :class="background === 'color'
                ? 'bg-ds-navy text-ds-soft-white border-ds-neon/40'
                : 'bg-ds-midnight text-ds-slate hover:text-ds-soft-white border-transparent'"
            >
              <span
                v-if="background === 'color'"
                class="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                :style="{ background: bgColor }"
              ></span>
              Color
            </button>
          </div>
          <div v-if="background === 'color'" class="flex items-center gap-3 mb-5">
            <input
              type="color"
              v-model="bgColor"
              class="w-9 h-9 rounded-lg border border-ds-neon/30 bg-ds-midnight cursor-pointer p-0.5"
            />
            <span class="text-sm text-ds-slate font-mono">{{ bgColor }}</span>
          </div>
          <div v-else class="mb-5"></div>

          <!-- Sort Order -->
          <p class="text-xs font-semibold text-ds-slate/50 uppercase tracking-wider mb-2">Sort Order</p>
          <div class="space-y-1.5 mb-2">
            <div
              v-for="(lvl, i) in sortLevels"
              :key="i"
              class="flex items-center gap-2 bg-ds-midnight/70 rounded-lg px-3 py-2"
            >
              <!-- Up/down grip -->
              <div class="flex flex-col gap-0 text-ds-slate/40 shrink-0">
                <button @click="moveUp(i)" :disabled="i === 0" class="disabled:opacity-30 hover:text-ds-slate transition-colors">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
                  </svg>
                </button>
                <svg class="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>

              <span class="text-ds-slate/40 text-xs w-4 shrink-0">{{ i + 1 }}</span>
              <span class="flex-1 text-sm text-ds-soft-white font-medium">{{ lvl.field }}</span>

              <!-- Direction toggle -->
              <button
                @click="toggleDir(i)"
                :title="lvl.dir === 'asc' ? 'Ascending – click to reverse' : 'Descending – click to reverse'"
                class="text-ds-slate hover:text-ds-soft-white transition-colors shrink-0"
              >
                <svg v-if="lvl.dir === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              <!-- Remove -->
              <button @click="removeSortLevel(i)" class="text-ds-slate/40 hover:text-red-400 transition-colors shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Add sort level -->
          <div class="relative mb-6">
            <button
              v-if="availableToAdd.length > 0"
              @click="showAddSort = !showAddSort"
              class="flex items-center gap-1.5 text-sm text-ds-slate hover:text-ds-soft-white transition-colors py-1"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              Add sort level
            </button>
            <div
              v-if="showAddSort"
              class="absolute top-full left-0 mt-1 bg-ds-navy border border-ds-neon/30 rounded-xl shadow-xl z-10 py-1 min-w-36"
            >
              <button
                v-for="field in availableToAdd"
                :key="field"
                @click="addSortLevel(field)"
                class="w-full text-left px-4 py-2 text-sm text-ds-soft-white/80 hover:bg-ds-midnight hover:text-ds-soft-white transition-colors"
              >{{ field }}</button>
            </div>
          </div>

          <!-- Display Options -->
          <p class="text-xs font-semibold text-ds-slate/50 uppercase tracking-wider mb-2">Display Options</p>
          <div class="border border-ds-neon/20 rounded-xl overflow-hidden mb-6">
            <div class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="text-sm font-medium text-ds-soft-white">Show QR Code</p>
                <p class="text-xs text-ds-slate/60 mt-0.5">Included automatically in the image</p>
              </div>
              <span class="text-xs text-ds-gold font-medium px-2 py-1 bg-ds-gold/10 rounded-lg">Always On</span>
            </div>
          </div>

          <!-- Generate Preview -->
          <BaseButton
            variant="cta"
            size="lg"
            class="w-full"
            @click="generatePreview"
          >
            <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></template>
            Generate Preview
          </BaseButton>
        </div>

        <!-- ─── PREVIEW ──────────────────────────────────────────────── -->
        <div v-else class="p-6">
          <BaseButton variant="ghost" size="sm" @click="step = 'settings'" class="mb-4">
            <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg></template>
            Back to settings
          </BaseButton>

          <h2 class="text-lg font-bold text-ds-soft-white mb-0.5">Export Image</h2>
          <p class="text-sm text-ds-slate/60 mb-4">Preview your deck image before downloading</p>

          <!-- Preview canvas -->
          <div class="rounded-xl overflow-hidden bg-ds-midnight border border-ds-neon/20 mb-5 min-h-48 flex items-center justify-center">
            <div v-if="generating" class="flex flex-col items-center gap-3 py-12 text-ds-slate/50">
              <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span class="text-sm">Generating image…</span>
            </div>
            <img
              v-else-if="previewUrl"
              :src="previewUrl"
              alt="Deck preview"
              class="w-full rounded-xl"
            />
          </div>

          <!-- Actions -->
          <div class="grid grid-cols-2 gap-3">
            <BaseButton
              variant="cta"
              size="lg"
              :disabled="!previewUrl"
              @click="downloadImage"
            >
              <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></template>
              Download Image
            </BaseButton>
            <BaseButton
              variant="secondary"
              size="lg"
              :disabled="!previewUrl"
              @click="copyToClipboard"
            >
              <template #icon><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></template>
              Copy to Clipboard
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
