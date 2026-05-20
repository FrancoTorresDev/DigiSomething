<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDeckStore } from '@/stores/deckStore'
import { useDeckValidator } from '@/composables/useDeckValidator'
import { useAuthStore } from '@/stores/authStore'
import DeckThumbnail from './DeckThumbnail.vue'
import CardDetailModal from '@/components/cards/CardDetailModal.vue'
import { getCardByNumber } from '@/services/digimonApi'
import type { DigimonCard } from '@/models/Card'
import type { DeckCard } from '@/models/Deck'

const deck = useDeckStore()
const auth = useAuthStore()
const { isValid, validationMessages } = useDeckValidator()

const digiEggCards = computed(() =>
  deck.activeDeck.cards.filter((e) => e.card.type === 'Digi-Egg')
)

const mainDeckCards = computed(() =>
  deck.activeDeck.cards.filter((e) => e.card.type !== 'Digi-Egg')
)

const isDraggingOverEggs = ref(false)
const isDraggingOverMain = ref(false)
const saveLoading = ref(false)
const loginError = ref('')
const selectedCard = ref<DigimonCard | null>(null)
const showModal = ref(false)

const showImportModal = ref(false)
const importText = ref('')
const importLoading = ref(false)
const importError = ref('')

async function handleImport() {
  importError.value = ''
  let parsed: unknown
  try {
    parsed = JSON.parse(importText.value)
  } catch {
    importError.value = 'Invalid format. Paste the full exported JSON array.'
    return
  }
  if (!Array.isArray(parsed)) {
    importError.value = 'Expected a JSON array.'
    return
  }
  const ids = (parsed as string[]).filter(
    (id) => typeof id === 'string' && !id.startsWith('Exported from')
  )
  if (ids.length === 0) {
    importError.value = 'No card IDs found in import data.'
    return
  }
  const counts = new Map<string, number>()
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  importLoading.value = true
  const notFound: string[] = []
  const entries: DeckCard[] = []
  for (const [cardnumber, quantity] of counts) {
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
  if (notFound.length > 0) {
    importError.value = `Imported ${entries.length} cards. Not found: ${notFound.join(', ')}`
  } else {
    showImportModal.value = false
    importText.value = ''
  }
}

function openCard(card: DigimonCard) {
  selectedCard.value = card
  showModal.value = true
}

async function handleSave() {
  loginError.value = ''
  if (!auth.isLoggedIn) {
    saveLoading.value = true
    try {
      await auth.login()
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      loginError.value = err.code ?? err.message ?? 'Sign-in failed'
      console.error('[DeckList] login error:', e)
      saveLoading.value = false
      return
    }
    saveLoading.value = false
  }
  try {
    await deck.saveDeck()
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string }
    loginError.value = err.code ?? err.message ?? 'Save failed'
    console.error('[DeckList] save error:', e)
  }
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
    class="flex flex-col h-full bg-gray-950 transition-colors duration-150"
    @dragover.prevent
    @drop="onGlobalDrop"
  >

    <!-- Header: deck name + counts -->
    <div class="px-4 py-3 border-b border-gray-800 shrink-0">
      <input
        v-model="deck.activeDeck.name"
        class="w-full bg-transparent text-white font-semibold text-sm border-b border-transparent hover:border-gray-700 focus:border-yellow-500 outline-none transition-colors pb-0.5"
        placeholder="Deck name..."
      />
      <p class="text-xs mt-2 flex items-center gap-2">
        <span :class="deck.mainDeckTotal === 50 ? 'text-green-400' : 'text-gray-500'">
          Main {{ deck.mainDeckTotal }}/50
        </span>
        <span class="text-gray-700">·</span>
        <span :class="deck.digiEggTotal > 0 ? 'text-yellow-400' : 'text-gray-600'">
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
            :class="deck.digiEggTotal >= 5 ? 'text-yellow-400' : 'text-gray-600'"
          >{{ deck.digiEggTotal }}/5</span>
        </div>

        <div v-if="digiEggCards.length" class="relative grid grid-cols-8 gap-1">
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
          :class="isDraggingOverEggs ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30' : 'border-gray-800 text-gray-700'"
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
            :class="deck.mainDeckTotal === 50 ? 'text-green-400' : 'text-gray-600'"
          >{{ deck.mainDeckTotal }}/50</span>
        </div>

        <div v-if="mainDeckCards.length" class="relative grid grid-cols-8 gap-1">
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
          :class="isDraggingOverMain ? 'border-blue-500 text-blue-400 bg-blue-950/30' : 'border-gray-800 text-gray-700'"
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
    <div class="px-4 py-3 border-t border-gray-800 shrink-0 space-y-2.5">
      <label class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer w-fit select-none">
        <input v-model="deck.activeDeck.isPublic" type="checkbox" class="accent-yellow-500" />
        Make Public
      </label>

      <div class="flex gap-1.5">
        <button
          @click="showImportModal = true"
          class="flex-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg py-1.5 transition-colors"
        >
          Import
        </button>
        <button
          class="flex-1 text-xs text-gray-600 border border-gray-800 rounded-lg py-1.5 cursor-not-allowed"
          title="Coming soon"
          disabled
        >
          Export
        </button>
        <button
          @click="deck.clearDeck()"
          class="flex-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg py-1.5 transition-colors"
        >
          Clear
        </button>
      </div>

      <p v-if="loginError" class="text-red-400 text-xs text-center">{{ loginError }}</p>

      <button
        @click="handleSave"
        :disabled="deck.loading || saveLoading"
        class="w-full font-bold text-sm py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
        :class="auth.isLoggedIn
          ? 'bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-800 disabled:text-gray-600 text-gray-950'
          : 'bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 text-white'"
      >
        <span v-if="saveLoading">Signing in…</span>
        <span v-else-if="deck.loading">Saving…</span>
        <span v-else-if="!auth.isLoggedIn" class="flex items-center justify-center gap-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 0 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
          </svg>
          Sign in &amp; Save
        </span>
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

  <!-- Import Modal -->
  <Teleport to="body">
    <div
      v-if="showImportModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      @click.self="showImportModal = false; importError = ''; importText = ''"
    >
      <div class="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-white font-semibold text-base">Import from digimonmeta.com</h2>
          <button
            @click="showImportModal = false; importError = ''; importText = ''"
            class="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >&times;</button>
        </div>
        <p class="text-xs text-gray-500">
          Paste the exported deck array from digimonmeta.com below.
        </p>
        <textarea
          v-model="importText"
          :disabled="importLoading"
          rows="8"
          placeholder='["Exported from digimonmeta.com", "BT24-003", ...]'
          class="w-full bg-gray-800 text-gray-200 text-xs rounded-lg p-3 border border-gray-700 focus:border-yellow-500 outline-none resize-none font-mono disabled:opacity-50"
        />
        <p v-if="importError" class="text-xs" :class="importError.startsWith('Imported') ? 'text-yellow-400' : 'text-red-400'">
          {{ importError }}
        </p>
        <div class="flex gap-2 justify-end">
          <button
            @click="showImportModal = false; importError = ''; importText = ''"
            class="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleImport"
            :disabled="importLoading || !importText.trim()"
            class="text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 rounded-lg px-4 py-2 transition-colors"
          >
            <span v-if="importLoading">Importing…</span>
            <span v-else>Import Deck</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
