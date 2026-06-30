<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LoginButton from './LoginButton.vue'
import { useAuthStore } from '@/stores/authStore'

const auth = useAuthStore()
const route = useRoute()
const deckOpen    = ref(false)
const cardsOpen   = ref(false)
const mobileOpen  = ref(false)
const mobileDecks = ref(false)
const mobileCards = ref(false)

const deckRoutes  = ['/deck-builder', '/community-decks', '/profile']
const cardRoutes  = ['/gallery', '/sets']
const deckActive  = () => deckRoutes.some(r => route.path.startsWith(r))
const cardsActive = () => cardRoutes.some(r => route.path.startsWith(r))

function closeMobile() {
  mobileOpen.value  = false
  mobileDecks.value = false
  mobileCards.value = false
}

watch(() => route.path, () => {
  closeMobile()
})

watch(mobileOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <nav
    class="fixed top-0 inset-x-0 z-50 bg-ds-navy/95 backdrop-blur border-b border-ds-neon/20 h-16 flex items-stretch px-3 sm:px-6 gap-3 sm:gap-8"
  >
    <RouterLink to="/gallery" class="shrink-0 flex items-center hover:opacity-80 transition-opacity">
      <img src="/logo.png" alt="DigiSomething" class="h-8 sm:h-9 w-auto" />
    </RouterLink>

    <!-- Desktop nav links -->
    <div class="hidden md:flex items-stretch gap-6 flex-1">
      <RouterLink
        to="/news"
        class="nav-link relative h-full flex items-center text-sm font-display text-ds-slate hover:text-ds-soft-white transition-colors whitespace-nowrap"
        active-class="nav-link--active"
      >
        News
      </RouterLink>

      <!-- Cards dropdown -->
      <div class="relative" @mouseenter="cardsOpen = true" @mouseleave="cardsOpen = false">
        <button
          class="nav-link relative h-full flex items-center gap-1 text-sm font-display transition-colors whitespace-nowrap"
          :class="cardsActive() ? 'nav-link--active' : 'text-ds-slate hover:text-ds-soft-white'"
        >
          Cards
          <svg class="w-3 h-3 transition-transform" :class="cardsOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition name="dropdown">
          <div
            v-if="cardsOpen"
            class="absolute left-0 top-full mt-1 w-64 bg-ds-navy border border-ds-neon/30 rounded-xl shadow-2xl overflow-hidden"
          >
            <RouterLink
              to="/gallery"
              class="flex items-start gap-3 px-4 py-3 hover:bg-ds-midnight/60 transition-colors group"
              @click="cardsOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-ds-royal/20 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-ds-cyan" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-ds-soft-white">Cards</p>
                <p class="text-xs text-ds-slate">Browse all Digimon cards.</p>
              </div>
            </RouterLink>

            <RouterLink
              to="/sets"
              class="flex items-start gap-3 px-4 py-3 hover:bg-ds-midnight/60 transition-colors group"
              @click="cardsOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-ds-cyan/15 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-ds-cyan" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-ds-soft-white">Sets</p>
                <p class="text-xs text-ds-slate">Browse cards by set release.</p>
              </div>
            </RouterLink>
          </div>
        </Transition>
      </div>

      <!-- Decks dropdown -->
      <div class="relative" @mouseenter="deckOpen = true" @mouseleave="deckOpen = false">
        <button
          class="nav-link relative h-full flex items-center gap-1 text-sm font-display transition-colors whitespace-nowrap"
          :class="deckActive() ? 'nav-link--active' : 'text-ds-slate hover:text-ds-soft-white'"
        >
          Decks
          <svg class="w-3 h-3 transition-transform" :class="deckOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <Transition name="dropdown">
          <div
            v-if="deckOpen"
            class="absolute left-0 top-full mt-1 w-64 bg-ds-navy border border-ds-neon/30 rounded-xl shadow-2xl overflow-hidden"
          >
            <RouterLink
              to="/community-decks"
              class="flex items-start gap-3 px-4 py-3 hover:bg-ds-midnight/60 transition-colors group"
              @click="deckOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-ds-cyan/15 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-ds-cyan" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M5 7l2 11a2 2 0 002 2h6a2 2 0 002-2l2-11" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 11h6M10 15h4" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-ds-soft-white">Community Decks</p>
                <p class="text-xs text-ds-slate">Browse public deck lists.</p>
              </div>
            </RouterLink>

            <RouterLink
              to="/deck-builder"
              class="flex items-start gap-3 px-4 py-3 hover:bg-ds-midnight/60 transition-colors group"
              @click="deckOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-ds-gold/15 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-ds-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-ds-soft-white">Deck Builder</p>
                <p class="text-xs text-ds-slate">Build and edit your decks.</p>
              </div>
            </RouterLink>

            <RouterLink
              v-if="auth.isLoggedIn"
              to="/profile"
              class="flex items-start gap-3 px-4 py-3 hover:bg-ds-midnight/60 transition-colors group"
              @click="deckOpen = false"
            >
              <span class="mt-0.5 w-8 h-8 rounded-lg bg-ds-gold/15 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-ds-gold" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
                </svg>
              </span>
              <div>
                <p class="text-sm font-semibold text-ds-soft-white">My Decks</p>
                <p class="text-xs text-ds-slate">View your personal decks.</p>
              </div>
            </RouterLink>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Desktop login button -->
    <LoginButton class="hidden md:flex shrink-0 self-center" />

    <!-- Mobile right side: login + hamburger -->
    <div class="md:hidden flex items-center gap-1.5 ml-auto">
      <LoginButton class="shrink-0 self-center" />
      <button
        @click="mobileOpen = !mobileOpen"
        class="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg text-ds-slate hover:text-ds-soft-white transition-colors"
        aria-label="Toggle navigation"
      >
        <span
          class="block w-5 h-0.5 bg-current rounded transition-all duration-200"
          :class="mobileOpen ? 'translate-y-2 rotate-45' : ''"
        />
        <span
          class="block w-5 h-0.5 bg-current rounded transition-all duration-200"
          :class="mobileOpen ? 'opacity-0' : ''"
        />
        <span
          class="block w-5 h-0.5 bg-current rounded transition-all duration-200"
          :class="mobileOpen ? '-translate-y-2 -rotate-45' : ''"
        />
      </button>
    </div>
  </nav>

  <!-- Mobile menu drawer -->
  <Transition name="mobile-menu">
    <div
      v-if="mobileOpen"
      class="md:hidden fixed inset-0 top-16 z-40 flex"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-ds-midnight/80 backdrop-blur-sm"
        @click="closeMobile"
      />
      <!-- Drawer panel -->
      <div class="relative bg-ds-navy border-r border-ds-neon/20 w-full max-w-[22rem] h-full overflow-y-auto py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl flex flex-col gap-1">

        <!-- News -->
        <RouterLink
          to="/news"
          class="flex items-center gap-3 px-5 py-3 text-sm text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60 transition-colors"
          active-class="text-ds-soft-white bg-ds-midnight/40"
          @click="closeMobile"
        >
          <svg class="w-4 h-4 text-ds-cyan shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z"/>
          </svg>
          News
        </RouterLink>

        <div class="h-px bg-ds-neon/10 mx-4 my-1" />

        <!-- Cards section -->
        <button
          @click="mobileCards = !mobileCards"
          class="flex items-center justify-between gap-3 px-5 py-3 text-sm w-full text-left transition-colors"
          :class="cardsActive() ? 'text-ds-soft-white' : 'text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60'"
        >
          <span class="flex items-center gap-3">
            <svg class="w-4 h-4 text-ds-cyan shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            Cards
          </span>
          <svg class="w-3 h-3 transition-transform shrink-0" :class="mobileCards ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="mobileCards" class="pl-5 flex flex-col gap-0.5">
          <RouterLink
            to="/gallery"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60 rounded-lg transition-colors"
            active-class="text-ds-soft-white bg-ds-midnight/40"
            @click="closeMobile"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-ds-cyan shrink-0" />
            Card Library
          </RouterLink>
          <RouterLink
            to="/sets"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60 rounded-lg transition-colors"
            active-class="text-ds-soft-white bg-ds-midnight/40"
            @click="closeMobile"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-ds-cyan shrink-0" />
            Card Sets
          </RouterLink>
        </div>

        <div class="h-px bg-ds-neon/10 mx-4 my-1" />

        <!-- Decks section -->
        <button
          @click="mobileDecks = !mobileDecks"
          class="flex items-center justify-between gap-3 px-5 py-3 text-sm w-full text-left transition-colors"
          :class="deckActive() ? 'text-ds-soft-white' : 'text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60'"
        >
          <span class="flex items-center gap-3">
            <svg class="w-4 h-4 text-ds-gold shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M5 7l2 11a2 2 0 002 2h6a2 2 0 002-2l2-11" />
            </svg>
            Decks
          </span>
          <svg class="w-3 h-3 transition-transform shrink-0" :class="mobileDecks ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div v-if="mobileDecks" class="pl-5 flex flex-col gap-0.5">
          <RouterLink
            to="/community-decks"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60 rounded-lg transition-colors"
            active-class="text-ds-soft-white bg-ds-midnight/40"
            @click="closeMobile"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-ds-gold shrink-0" />
            Community Decks
          </RouterLink>
          <RouterLink
            to="/deck-builder"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60 rounded-lg transition-colors"
            active-class="text-ds-soft-white bg-ds-midnight/40"
            @click="closeMobile"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-ds-gold shrink-0" />
            Deck Builder
          </RouterLink>
          <RouterLink
            v-if="auth.isLoggedIn"
            to="/profile"
            class="flex items-center gap-3 px-4 py-2.5 text-sm text-ds-slate hover:text-ds-soft-white hover:bg-ds-midnight/60 rounded-lg transition-colors"
            active-class="text-ds-soft-white bg-ds-midnight/40"
            @click="closeMobile"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-ds-gold shrink-0" />
            My Decks
          </RouterLink>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Nav link base — spans full navbar height so ::after reaches the bottom */
.nav-link {
  color: inherit;
  text-decoration: none;
}
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -2px;
  right: -2px;
  height: 2px;
  background: transparent;
  border-radius: 1px;
  transition: background 0.2s, box-shadow 0.2s;
}

/* Active state */
.nav-link--active {
  color: #F5F8FF !important;
  text-shadow: 0 0 14px rgba(30, 220, 255, 0.65), 0 0 28px rgba(30, 220, 255, 0.25);
}
.nav-link--active::after {
  background: #1EDCFF;
  box-shadow: 0 0 8px rgba(30, 220, 255, 0.80), 0 0 20px rgba(30, 220, 255, 0.45);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.2s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}
</style>
