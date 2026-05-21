# DigiSomething — Project Guidelines

## Stack
- **Vue 3** with `<script setup>` + TypeScript (Composition API throughout — no Options API)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no `tailwind.config.js`, use CSS theme variables)
- **Pinia** for state management — stores live in `src/stores/`
- **Vue Router 4** — routes defined in `src/router/index.ts`
- **Firebase 9+** (modular SDK) — auth + Firestore, configured in `src/services/firebase.ts`
- **Vite** dev server at `http://localhost:5173`

## Path Alias
`@` maps to `src/`. Always use `@/` imports instead of relative paths across folder boundaries.

## Architecture
```
src/
  views/        # Route-level pages (one per route)
  components/   # Reusable SFCs, grouped by domain (cards/, deck/, filters/, layout/)
  composables/  # useXxx() hooks for reusable reactive logic
  stores/       # Pinia stores (authStore, cardStore, deckStore, metaStore)
  services/     # API calls, Firebase helpers, static data (digimonApi, digimonSets, firebase, ...)
  models/       # TypeScript interfaces (Card.ts, Deck.ts, User.ts)
  router/       # Vue Router config
```

## Digimon Card API — Critical Behavior
- **Endpoint**: `GET /digimon-api/search.php` (proxied to `digimoncard.io/api-public`)
- **All filter params are ignored**: `num`, `page`, `series`, `sort` — the API always returns **all ~8800+ cards**
- **Never rely on server-side filtering**. Always fetch all cards and filter client-side
- **Set name format** in `card.set_name`: `"BT-01: Booster New Evolution"` (code + colon + name)
- **Set filtering pattern**: `cards.filter(c => c.set_name?.startsWith(code + ':'))`
- `card.set_name` in the raw API response is an array; `mapCard()` in `digimonApi.ts` takes the first element

## Card Images
- Card art: `https://images.digimoncard.io/images/cards/{cardNumber}.jpg`
  - Dev proxy: `/card-images/{cardNumber}.jpg`
- **Set/pack box art**: use Fandom wiki CDN — `https://static.wikia.nocookie.net/digimoncardgame/images/{hash}/{filename}/revision/latest`
  - URLs are pre-computed in `src/services/digimonSets.ts` via the `w()` helper
  - Always use `setImgUrl(set)` (falls back to card image if `packImage` is undefined)
  - **Always add `referrerpolicy="no-referrer"`** on `<img>` tags pointing to the Fandom CDN — it blocks requests that include a `localhost` Referer header
- Retrieve new Fandom wiki image URLs via: `https://digimoncardgame.fandom.com/api.php?action=query&titles=File:{filename}&prop=imageinfo&iiprop=url&format=json`

## Set Data (`src/services/digimonSets.ts`)
- `DigimonSet` interface: `{ code, name, apiSeries, type, releaseDate, keyCard, packImage? }`
- `SORTED_SETS` — all 79 sets sorted most-recent first
- `setImgUrl(set)` — returns `packImage` if available, else card image CDN URL
- `TYPE_BADGE` — Tailwind class map for Booster/Starter/Extra/Other badges

## UI Conventions
- Dark theme: `bg-gray-950` page background, `bg-gray-900` cards/panels, `border-gray-800` borders
- Accent colors: yellow (`text-yellow-400`) for set codes / highlights; type badges use colored borders
- Card grids: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- `loading="lazy"` on all card/set images; always add `@error` handler to hide broken images
- Navbar dropdowns follow the pattern in `src/components/layout/Navbar.vue` (ref + click-outside)

## Deck Builder
- Deck slots stored in Firestore via `deckService.ts`
- `useDeckValidator.ts` composable handles deck legality rules
- Cover image = first card added to the deck

## Dev Commands
```bash
npm run dev      # Start Vite dev server
npm run build    # Type-check + build
npm run lint     # ESLint
```

## What to Avoid
- Do NOT add Options API components
- Do NOT use `any` type — use proper interfaces from `src/models/`
- Do NOT add server-side filtering params to digimoncard.io API calls (they are ignored)
- Do NOT hardcode Fandom wiki CDN hash paths without querying the MediaWiki API first
