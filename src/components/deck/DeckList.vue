<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '@/stores/deckStore'
import { useDeckValidator } from '@/composables/useDeckValidator'
import { useAuthStore } from '@/stores/authStore'
import DeckThumbnail from './DeckThumbnail.vue'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import { getCardByNumber } from '@/services/digimonApi'
import type { DigimonCard } from '@/models/Card'
import type { DeckCard } from '@/models/Deck'
import BaseButton from '@/components/ui/BaseButton.vue'

const deck = useDeckStore()
const auth = useAuthStore()
const router = useRouter()
const { isValid, validationMessages } = useDeckValidator()

const digiEggCards = computed(() =>
  deck.activeDeck.cards.filter((e) => e.card.type === 'Digi-Egg')
)

const mainDeckCards = computed(() =>
  deck.activeDeck.cards.filter((e) => e.card.type !== 'Digi-Egg')
)

const isDraggingOverEggs = ref(false)
const isDraggingOverMain = ref(false)
const loginLoading = ref(false)
const loginError = ref('')
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)

// Save modal
const showSaveModal = ref(false)
const saveName = ref('')
const saveDescription = ref('')
const saveVideoUrl = ref('')
const saveVisibility = ref<'draft' | 'private' | 'public'>('draft')
const saveCoverImage = ref('')
const saveError = ref('')
const savingDeck = ref(false)

const visibilityOptions: { key: 'draft' | 'private' | 'public'; label: string; hint: string }[] = [
  { key: 'draft',   label: 'Draft',   hint: "Doesn't need to be a valid deck. Not accessible by others." },
  { key: 'private', label: 'Private', hint: 'Only you can see this deck.' },
  { key: 'public',  label: 'Public',  hint: 'Visible to everyone on the site.' },
]

async function openSaveModal() {
  loginError.value = ''
  if (!auth.isLoggedIn) {
    loginLoading.value = true
    try {
      await auth.login()
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      loginError.value = err.code ?? err.message ?? 'Sign-in failed'
      console.error('[DeckList] login error:', e)
      loginLoading.value = false
      return
    }
    loginLoading.value = false
  }
  // Existing deck: skip the modal and update directly
  if (deck.activeDeck.id) {
    savingDeck.value = true
    try {
      await deck.saveDeck()
      router.push({ name: 'deck-detail', params: { id: deck.activeDeck.id } })
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      loginError.value = err.code ?? err.message ?? 'Update failed'
    } finally {
      savingDeck.value = false
    }
    return
  }
  saveName.value = deck.activeDeck.name || 'My Awesome Deck'
  saveDescription.value = deck.activeDeck.description ?? ''
  saveVideoUrl.value = deck.activeDeck.videoUrl ?? ''
  saveVisibility.value = deck.activeDeck.isPublic ? 'public' : 'draft'
  saveCoverImage.value = deck.activeDeck.coverCardImage ?? ''
  saveError.value = ''
  showSaveModal.value = true
}

async function handleSave() {
  saveError.value = ''
  if (!saveName.value.trim()) {
    saveError.value = 'Name is required.'
    return
  }
  if (saveVideoUrl.value.trim()) {
    const url = saveVideoUrl.value.trim()
    const isYoutube = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(url)
    const isTwitch = /^https?:\/\/(www\.)?twitch\.tv/.test(url)
    if (!isYoutube && !isTwitch) {
      saveError.value = 'Only YouTube and Twitch links are allowed.'
      return
    }
  }
  deck.activeDeck.name = saveName.value.trim()
  deck.activeDeck.description = saveDescription.value.trim()
  deck.activeDeck.videoUrl = saveVideoUrl.value.trim()
  deck.activeDeck.isPublic = saveVisibility.value === 'public'
  deck.activeDeck.coverCardImage = saveCoverImage.value || undefined
  savingDeck.value = true
  try {
    await deck.saveDeck()
    showSaveModal.value = false
    router.push({ name: 'deck-detail', params: { id: deck.activeDeck.id } })
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    saveError.value = err.code ?? err.message ?? 'Save failed'
    console.error('[DeckList] save error:', e)
  } finally {
    savingDeck.value = false
  }
}

const showImportModal = ref(false)
const importText = ref('')
const importLoading = ref(false)
const importError = ref('')
const importMode = ref<'digimeta' | 'text'>('digimeta')

const importHelpText = computed(() =>
  importMode.value === 'digimeta'
    ? 'Paste the exported deck array from digimonmeta.com below.'
    : 'Paste one card per line using: quantity name set-code.'
)

const importPlaceholder = computed(() =>
  importMode.value === 'digimeta'
    ? '["Exported from digimonmeta.com", "BT24-003", ...]'
    : `// DeckList\n4 DemiVeemon BT12-002\n4 Veemon BT12-021\n2 Davis Motomiya BT3-093`
)

function parseDigimetaImport(input: string): { counts: Map<string, number>; skippedLines: number } | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    importError.value = 'Invalid Digimeta format. Paste the full exported JSON array.'
    return null
  }
  if (!Array.isArray(parsed)) {
    importError.value = 'Expected a JSON array.'
    return null
  }

  const ids = (parsed as string[]).filter(
    (id) => typeof id === 'string' && !id.startsWith('Exported from')
  )
  if (ids.length === 0) {
    importError.value = 'No card IDs found in import data.'
    return null
  }

  const counts = new Map<string, number>()
  for (const id of ids) {
    const code = id.trim().toUpperCase()
    counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return { counts, skippedLines: 0 }
}

function parseTextImport(input: string): { counts: Map<string, number>; skippedLines: number } | null {
  const lines = input.split(/\r?\n/)
  const counts = new Map<string, number>()
  let skippedLines = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^(\/\/|#)/.test(line)) continue
    if (/^decklist$/i.test(line)) continue

    const qtyMatch = line.match(/^(\d+)\s+(.+)$/)
    if (!qtyMatch) {
      skippedLines++
      continue
    }

    const quantity = Number(qtyMatch[1])
    const remainder = qtyMatch[2].trim()
    const codeMatch = remainder.match(/([A-Za-z]{1,4}\d{0,2}-\d{2,3})\s*$/i)
    if (!codeMatch || quantity <= 0) {
      skippedLines++
      continue
    }

    const code = codeMatch[1].toUpperCase()
    counts.set(code, (counts.get(code) ?? 0) + quantity)
  }

  if (counts.size === 0) {
    importError.value = 'No valid card lines found. Use format like: 4 Veemon BT12-021'
    return null
  }

  return { counts, skippedLines }
}

async function handleImport() {
  importError.value = ''

  const parsed = importMode.value === 'digimeta'
    ? parseDigimetaImport(importText.value)
    : parseTextImport(importText.value)

  if (!parsed) return

  importLoading.value = true
  const notFound: string[] = []
  const entries: DeckCard[] = []
  for (const [cardnumber, quantity] of parsed.counts) {
    try {
      const card = await getCardByNumber(cardnumber)
      if (card) {
        entries.push({ card, quantity })
      } else {
        notFound.push(cardnumber)
      }
    } catch {
      notFound.push(cardnumber)
    }
  }
  importLoading.value = false
  if (entries.length === 0) {
    importError.value = 'No cards could be found. Check the import data.'
    return
  }
  deck.loadDeck({
    id: deck.activeDeck.id,
    ownerId: deck.activeDeck.ownerId,
    name: deck.activeDeck.name,
    cards: entries,
    isPublic: deck.activeDeck.isPublic,
    votes: deck.activeDeck.votes
  })
  const notes: string[] = []
  if (parsed.skippedLines > 0) {
    notes.push(`Skipped ${parsed.skippedLines} invalid line${parsed.skippedLines > 1 ? 's' : ''}`)
  }
  if (notFound.length > 0) {
    notes.push(`Not found: ${notFound.join(', ')}`)
  }

  if (notes.length > 0) {
    importError.value = `Imported ${entries.length} card groups. ${notes.join('. ')}`
  } else {
    showImportModal.value = false
    importText.value = ''
    importMode.value = 'digimeta'
  }
}

function openCard(card: DigimonCard) {
  selectedCard.value = card
  showModal.value = true
}

function onEggDragOver(e: DragEvent) {
  e.preventDefault()
  if (!isDraggingOverEggs.value) isDraggingOverEggs.value = true
}

function onEggDragLeave(e: DragEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    isDraggingOverEggs.value = false
  }
}

function onMainDragOver(e: DragEvent) {
  e.preventDefault()
  if (!isDraggingOverMain.value) isDraggingOverMain.value = true
}

function onMainDragLeave(e: DragEvent) {
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
    isDraggingOverMain.value = false
  }
}

function onGlobalDrop(e: DragEvent) {
  e.preventDefault()
  const overEggs = isDraggingOverEggs.value
  const overMain = isDraggingOverMain.value
  isDraggingOverEggs.value = false
  isDraggingOverMain.value = false
  const data = e.dataTransfer?.getData('text/plain')
  if (!data) return
  try {
    const card = JSON.parse(data) as DigimonCard
    const isEgg = card.type === 'Digi-Egg'
    // Enforce zone: egg zone rejects non-eggs, main zone rejects eggs
    if (overEggs && !isEgg) return
    if (overMain && isEgg) return
    deck.addCard(card)
  } catch { /* ignore malformed data */ }
}
</script>

<template>
  <div
    class="flex flex-col h-full bg-ds-midnight transition-colors duration-150"
    @dragover.prevent
    @drop="onGlobalDrop"
  >

    <!-- Header: counts -->
    <div class="px-4 py-3 border-b border-ds-neon/20 shrink-0">
      <p class="text-xs flex items-center gap-2">
        <span :class="deck.mainDeckTotal === 50 ? 'text-green-400' : 'text-ds-slate/50'">
          Main {{ deck.mainDeckTotal }}/50
        </span>
        <span class="text-ds-slate/30">·</span>
        <span :class="deck.digiEggTotal > 0 ? 'text-ds-gold' : 'text-ds-slate/30'">
          Eggs {{ deck.digiEggTotal }}/5
        </span>
        <span v-if="isValid" class="text-green-400 ml-auto">✓ Ready</span>
      </p>
    </div>

    <!-- Scrollable deck content -->
    <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4 py-4">

      <!-- Digi-Egg Deck section -->
      <div
        class="px-4 rounded-lg transition-colors duration-150 shrink-0 min-h-[9rem]"
        :class="isDraggingOverEggs ? 'bg-yellow-950/30 ring-2 ring-inset ring-yellow-500/50' : ''"
        @dragover="onEggDragOver"
        @dragleave="onEggDragLeave"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-yellow-500">Digi-Egg Deck</span>
          <span
            class="text-[11px] tabular-nums font-mono"
            :class="deck.digiEggTotal >= 5 ? 'text-ds-gold' : 'text-ds-slate/30'"
          >{{ deck.digiEggTotal }}/5</span>
        </div>

        <div v-if="digiEggCards.length" class="relative grid grid-cols-5 sm:grid-cols-8 gap-1">
          <DeckThumbnail
            v-for="entry in digiEggCards"
            :key="entry.card.cardnumber"
            :entry="entry"
            @click="openCard(entry.card)"
            @increment="deck.addCard(entry.card)"
            @decrement="deck.removeCard(entry.card.cardnumber)"
          />
          <div
            v-if="isDraggingOverEggs"
            class="absolute inset-0 rounded-lg bg-yellow-950/60 flex items-center justify-center pointer-events-none"
          >
            <span class="text-yellow-400 text-sm font-semibold">+ Add Digi-Egg</span>
          </div>
        </div>
        <div
          v-else
          class="h-24 rounded-lg border-2 border-dashed transition-colors flex items-center justify-center text-xs"
          :class="isDraggingOverEggs ? 'border-ds-gold text-ds-gold bg-ds-gold/10' : 'border-ds-neon/20 text-ds-slate/30'"
        >
          <span>{{ isDraggingOverEggs ? '+ Drop Digi-Egg here' : 'Add Digi-Egg cards' }}</span>
        </div>
      </div>

      <!-- Main Deck section -->
      <div
        class="px-4 rounded-lg transition-colors duration-150 flex-1 min-h-[26rem]"
        :class="isDraggingOverMain ? 'bg-blue-950/30 ring-2 ring-inset ring-blue-500/50' : ''"
        @dragover="onMainDragOver"
        @dragleave="onMainDragLeave"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-semibold uppercase tracking-widest text-blue-400">Main Deck</span>
          <span
            class="text-[11px] tabular-nums font-mono"
            :class="deck.mainDeckTotal === 50 ? 'text-green-400' : 'text-ds-slate/30'"
          >{{ deck.mainDeckTotal }}/50</span>
        </div>

        <div v-if="mainDeckCards.length" class="relative grid grid-cols-5 sm:grid-cols-8 gap-1">
          <DeckThumbnail
            v-for="entry in mainDeckCards"
            :key="entry.card.cardnumber"
            :entry="entry"
            @click="openCard(entry.card)"
            @increment="deck.addCard(entry.card)"
            @decrement="deck.removeCard(entry.card.cardnumber)"
          />
          <div
            v-if="isDraggingOverMain"
            class="absolute inset-0 rounded-lg bg-blue-950/60 flex items-center justify-center pointer-events-none"
          >
            <span class="text-blue-400 text-sm font-semibold">+ Add to Main Deck</span>
          </div>
        </div>
        <div
          v-else
          class="h-[22rem] rounded-lg border-2 border-dashed transition-colors flex items-center justify-center text-xs"
          :class="isDraggingOverMain ? 'border-ds-royal text-ds-royal bg-ds-royal/10' : 'border-ds-neon/20 text-ds-slate/30'"
        >
          <span>{{ isDraggingOverMain ? '+ Drop card here' : 'Click cards to add them' }}</span>
        </div>
      </div>

      <!-- Validation messages -->
      <ul v-if="validationMessages.length" class="px-4 space-y-1">
        <li
          v-for="msg in validationMessages"
          :key="msg"
          class="text-xs text-yellow-500 flex gap-1"
        >
          <span class="shrink-0">⚠</span>
          <span>{{ msg }}</span>
        </li>
      </ul>
    </div>

    <!-- Footer actions -->
    <div class="px-4 py-3 border-t border-ds-neon/20 shrink-0 space-y-2.5">
      <div class="flex gap-1.5">
        <BaseButton variant="ghost" size="sm" class="flex-1" @click="showImportModal = true">Import</BaseButton>
        <BaseButton variant="ghost" size="sm" class="flex-1" @click="deck.clearDeck()">Clear</BaseButton>
      </div>

      <p v-if="loginError" class="text-red-400 text-xs text-center">{{ loginError }}</p>

      <button
        @click="openSaveModal"
        :disabled="deck.loading || loginLoading"
        class="w-full font-bold text-sm py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
        :class="auth.isLoggedIn
          ? 'bg-ds-gold hover:bg-ds-gold/80 disabled:bg-ds-navy disabled:text-ds-slate/40 text-ds-midnight'
          : 'bg-ds-royal hover:bg-ds-royal/80 disabled:bg-ds-navy disabled:text-ds-slate/40 text-ds-soft-white'"
      >
        <span v-if="loginLoading">Signing in…</span>
        <span v-else-if="deck.loading">Loading…</span>
        <span v-else-if="!auth.isLoggedIn" class="flex items-center justify-center gap-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 0 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
          </svg>
          Sign in &amp; Save
        </span>
        <span v-else-if="deck.activeDeck.id">Update Deck</span>
        <span v-else>Save Deck</span>
      </button>
    </div>
  </div>

  <CardDetailModal
    :card="selectedCard"
    :visible="showModal"
    :allow-add="true"
    @close="showModal = false"
    @add-to-deck="deck.addCard($event); showModal = false"
  />

  <!-- Modals -->
  <Teleport to="body">
    <!-- Save Deck Modal -->
    <div
      v-if="showSaveModal"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-3 sm:p-4"
      @click.self="showSaveModal = false"
    >
      <div class="bg-ds-navy border border-ds-neon/30 rounded-2xl sm:rounded-xl p-4 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[90svh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-ds-soft-white font-semibold text-base">{{ deck.activeDeck.id ? 'Update Deck' : 'Save Deck' }}</h2>
            <p class="text-xs text-ds-slate/60 mt-0.5">{{ deck.activeDeck.id ? 'Save changes as a new version' : 'Save your deck to your collection' }}</p>
          </div>
          <BaseButton variant="ghost" iconOnly size="sm" @click="showSaveModal = false">&times;</BaseButton>
        </div>

        <!-- Cover card picker -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-medium text-ds-soft-white/80">Cover Digimon</label>
          <div v-if="deck.activeDeck.cards.filter(e => e.card.type !== 'Digi-Egg').length" class="flex gap-1.5 overflow-x-auto pb-1">
            <button
              v-for="entry in deck.activeDeck.cards.filter(e => e.card.type !== 'Digi-Egg')"
              :key="entry.card.cardnumber"
              type="button"
              @click="saveCoverImage = entry.card.imgurl"
              class="shrink-0 w-12 rounded overflow-hidden border-2 transition-colors"
              :class="saveCoverImage === entry.card.imgurl ? 'border-ds-gold' : 'border-transparent hover:border-ds-neon/40'"
            >
              <img :src="entry.card.imgurl" :alt="entry.card.name" class="w-full aspect-[2/3] object-cover" />
            </button>
          </div>
          <p v-else class="text-[11px] text-ds-slate/40">Add cards to your deck first</p>
          <p v-if="deck.activeDeck.cards.filter(e => e.card.type !== 'Digi-Egg').length" class="text-[11px] text-ds-slate/40">Click a card to use it as the deck cover</p>
        </div>

        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-ds-soft-white/80">Name <span class="text-ds-gold">*</span></label>
          <input
            v-model="saveName"
            type="text"
            placeholder="My Awesome Deck"
            class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-gold outline-none"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-ds-soft-white/80">Description</label>
          <textarea
            v-model="saveDescription"
            rows="3"
            placeholder="Deck strategy and notes..."
            class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-gold outline-none resize-none"
          />
        </div>

        <!-- Video URL -->
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-ds-soft-white/80">Video URL</label>
          <input
            v-model="saveVideoUrl"
            type="url"
            placeholder="YouTube or Twitch link"
            class="bg-ds-midnight text-ds-soft-white text-sm rounded-lg px-3 py-2 border border-ds-neon/30 focus:border-ds-gold outline-none"
          />
          <p class="text-[11px] text-ds-slate/40">Only YouTube and Twitch links are allowed</p>
        </div>

        <!-- Visibility -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-medium text-ds-soft-white/80">Visibility</label>
          <div class="flex rounded-lg border border-ds-neon/30 overflow-hidden">
            <button
              v-for="opt in visibilityOptions"
              :key="opt.key"
              @click="saveVisibility = opt.key"
              class="flex-1 text-xs py-2 font-medium transition-colors"
              :class="saveVisibility === opt.key
                ? 'bg-ds-navy text-ds-soft-white'
                : 'text-ds-slate hover:text-ds-soft-white hover:bg-ds-navy/50'"
            >
              {{ opt.label }}
            </button>
          </div>
          <p class="text-[11px] text-ds-slate/50">
            {{ visibilityOptions.find(o => o.key === saveVisibility)?.hint }}
          </p>
        </div>

        <p v-if="saveError" class="text-xs text-red-400">{{ saveError }}</p>

        <div class="flex gap-2 justify-end pt-1">
          <BaseButton variant="secondary" size="sm" @click="showSaveModal = false">Cancel</BaseButton>
          <button
            @click="handleSave"
            :disabled="savingDeck || !saveName.trim()"
            class="text-xs font-semibold bg-ds-gold hover:bg-ds-gold/80 disabled:bg-ds-navy disabled:text-ds-slate/40 text-ds-midnight rounded-lg px-4 py-2 transition-colors"
          >
            <span v-if="savingDeck">Saving…</span>
            <span v-else>{{ deck.activeDeck.id ? 'Update Deck' : 'Save Deck' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div
      v-if="showImportModal"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-3 sm:p-4"
      @click.self="showImportModal = false; importError = ''; importText = ''; importMode = 'digimeta'"
    >
      <div class="bg-ds-navy border border-ds-neon/30 rounded-2xl sm:rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[90svh] overflow-y-auto">
        <div class="flex items-center justify-between">
          <h2 class="text-ds-soft-white font-semibold text-base">Import Deck</h2>
          <BaseButton variant="ghost" iconOnly size="sm" @click="showImportModal = false; importError = ''; importText = ''; importMode = 'digimeta'">&times;</BaseButton>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="importMode = 'digimeta'; importError = ''; importText = ''"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            :class="importMode === 'digimeta'
              ? 'bg-ds-cyan/20 border-ds-cyan/50 text-ds-cyan'
              : 'bg-ds-midnight border-ds-neon/20 text-ds-slate hover:text-ds-soft-white hover:border-ds-neon/40'"
          >
            Digimeta.com Import
          </button>
          <button
            @click="importMode = 'text'; importError = ''; importText = ''"
            class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            :class="importMode === 'text'
              ? 'bg-ds-gold/20 border-ds-gold/50 text-ds-gold'
              : 'bg-ds-midnight border-ds-neon/20 text-ds-slate hover:text-ds-soft-white hover:border-ds-neon/40'"
          >
            Text Import
          </button>
        </div>

        <p class="text-xs text-ds-slate/60">{{ importHelpText }}</p>
        <textarea
          v-model="importText"
          :disabled="importLoading"
          rows="8"
          :placeholder="importPlaceholder"
          class="w-full bg-ds-midnight text-ds-soft-white text-xs rounded-lg p-3 border border-ds-neon/30 focus:border-ds-gold outline-none resize-none font-mono disabled:opacity-50"
        />
        <p v-if="importError" class="text-xs" :class="importError.startsWith('Imported') ? 'text-yellow-400' : 'text-red-400'">
          {{ importError }}
        </p>
        <div class="flex gap-2 justify-end">
          <BaseButton variant="secondary" size="sm" @click="showImportModal = false; importError = ''; importText = ''; importMode = 'digimeta'">Cancel</BaseButton>
          <button
            @click="handleImport"
            :disabled="importLoading || !importText.trim()"
            class="text-xs font-semibold bg-ds-gold hover:bg-ds-gold/80 disabled:bg-ds-navy disabled:text-ds-slate/40 text-ds-midnight rounded-lg px-4 py-2 transition-colors"
          >
            <span v-if="importLoading">Importing…</span>
            <span v-else>Import Deck</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
