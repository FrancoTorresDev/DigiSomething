<script setup lang="ts">
import { computed } from 'vue'
import type { DigimonCard } from '@/models/Card'
import { useDeckStore } from '@/stores/deckStore'

const props = defineProps<{
  card: DigimonCard | null
  visible: boolean
  allowAdd?: boolean
}>()

const emit = defineEmits<{
  close: []
  'add-to-deck': [card: DigimonCard]
}>()

const deck = useDeckStore()
const canAdd = computed(() => {
  if (!props.allowAdd || !props.card) return false
  const entry = deck.activeDeck?.cards.find(e => e.card.cardnumber === props.card!.cardnumber)
  return (entry?.quantity ?? 0) < 4
})

const COLOR_STYLE: Record<string, string> = {
  Red: 'border-red-500 bg-red-950/40',
  Blue: 'border-blue-500 bg-blue-950/40',
  Yellow: 'border-yellow-400 bg-yellow-950/40',
  Green: 'border-green-500 bg-green-950/40',
  Black: 'border-gray-600 bg-gray-900/60',
  Purple: 'border-purple-500 bg-purple-950/40',
  White: 'border-gray-300 bg-gray-800/60'
}

const TIMING_DEFINITIONS: Record<string, string> = {
  'On Play':            'Triggers when this card is played.',
  'When Attacking':     'Triggers when this Digimon declares an attack.',
  'When Digivolving':   'Triggers when a Digimon digivolves using this card.',
  'When Moving':        'Triggers when this Digimon moves from the breeding area to the battle area.',
  'Breeding':           'This Digimon is in the breeding area.',
  'Your Turn':          'Effect applies only during your turn.',
  "Opponent's Turn":    "Effect applies only during your opponent's turn.",
  'All Turns':          "Effect applies during both players' turns.",
  'End of Your Turn':   'Triggers at the end of your turn.',
  'Start of Your Turn': 'Triggers at the start of your turn.',
  'Security':           'Triggers when this card is revealed from a security check.',
  'Main':               'You may activate this during your Main Phase.',
  'Counter':            "Can be activated during your opponent's turn when they attack.",
  'On Deletion':          'Triggers when this Digimon is deleted.',
  'End of All Turns':      "Triggers at the end of each player's turn.",
  'End of Opponent\'s Turn': "Triggers at the end of your opponent's turn.",
  'Start of Opponent\'s Turn': "Triggers at the start of your opponent's turn.",
  'Once Per Turn':         'This effect can only be used once per turn.',
  'Once Per Attack':       'This effect can only be used once per attack.',
  'When Destroyed':        'Triggers when this Digimon is destroyed.',
  'Hand':                  'Effect is used from the hand.',
}

const ABILITY_DEFINITIONS: Record<string, string> = {
  'Fortitude':      'When this Digimon with digivolution cards is deleted, you may play this card without paying the cost.',
  'Vortex':         "At the end of your turn, this Digimon may attack an opponent's Digimon. With this effect, it can attack the turn it was played.",
  'Alliance':       "When this Digimon attacks, by suspending 1 of your other Digimon, this Digimon gains Security Attack +1 and the suspended Digimon's DP for the attack.",
  'Armor Purge':    "When this Digimon would be deleted, by trashing this Digimon's top stacked card, it isn't deleted.",
  'Piercing':       "When this Digimon attacks and deletes your opponent's Digimon in battle, it checks security before the attack ends.",
  'Rush':           'This Digimon can attack the turn it was played.',
  'Progress':       "While attacking, your opponent's effects don't affect this Digimon.",
  'Save':           'You may place this card under any of your Tamers.',
  'Material Save':  "When this Digimon would be deleted, you may place cards in its DigiXros requirements from its digivolution cards under 1 of your Tamers.",
  'Partition':      "When this Digimon with the specified digivolution cards would leave the battle area other than by your effects or battle, you may play 1 each of the specified cards without paying the cost.",
  'Raid':           "When this Digimon attacks, you may change the attack target to 1 of your opponent's unsuspended Digimon with the highest DP.",
  'Evade':          "When this Digimon would be deleted, by suspending this Digimon, it isn't deleted.",
  'Iceclad':        "Other than against Security Digimon, compare the number of digivolution cards instead of DP in this Digimon's battles.",
  'Decode':         "When this Digimon would leave the battle area other than in battle, you may play 1 Digimon card from its digivolution cards without paying the cost.",
  'Barrier':        "When this Digimon would be deleted in battle, by trashing your top security card, it isn't deleted.",
  'Overclock':      "At the end of your turn, by deleting 1 of your Tokens or Digimon with the specified trait, this Digimon attacks a player without suspending.",
  'Digisorption':   'When this card in your hand would be digivolved into, by suspending 1 of your Digimon, reduce the digivolution cost.',
  'Decoy':          "When your opponent's effects would delete any of your other Digimon, by deleting this Digimon, 1 of those Digimon isn't deleted.",
  'Collision':      "During this Digimon's attack, give all of your opponent's Digimon Blocker, and the opponent blocks if able.",
  'Fragment':       "When this Digimon would be deleted, by trashing any of its digivolution cards, it isn't deleted.",
  'Retaliation':    'When only this Digimon is deleted in battle, delete the Digimon it battled.',
  'Scapegoat':      "When this Digimon would be deleted other than by your effects, by deleting 1 of your other Digimon, it isn't deleted.",
  'Execute':        "At the end of your turn, this Digimon may attack. At the end of that attack, delete this Digimon. Your opponent's unsuspended Digimon can also be attacked.",
  'MindLink':       "Place this Tamer as any Digimon's bottom digivolution card if there are no Tamer cards in its digivolution cards.",
  'Blocker':        "When an opponent's Digimon attacks, you may suspend this Digimon to change the attack target to this Digimon.",
  'Jamming':        "This Digimon is not deleted after battle when it attacks a Security Digimon.",
  'Reboot':         "Unsuspend this Digimon during your opponent's unsuspend phase.",
  'Security Attack':"This Digimon checks additional security cards when it attacks.",
  'Blinking':       "When this Digimon attacks, it temporarily leaves the battle area and returns at the end of the attack.",
  'Gravity Strike': "This Digimon cannot be blocked by Digimon with lower DP.",
  'DigiXros':       "When this Digimon would be played, you may place specified cards from the hand or battle area under it. Each placed card reduces the play cost.",
  'Burst Digivolve':"Digivolve at cost 0 by returning the specified card to hand. At the end of the turn, trash this Digimon's top stacked card.",
  'App Fusion':     'If 2 specified link cards are linked together, stack the link card on top and digivolve.',
  'Link+':          "Add X to this Digimon's maximum links.",
  'Link':           'Plug this card from the hand or battle area sideways into the specified Digimon in the battle area.',
}

function getTimingDef(text: string): string {
  return TIMING_DEFINITIONS[text] ?? ''
}

function getAbilityDef(text: string): string {
  if (ABILITY_DEFINITIONS[text]) return ABILITY_DEFINITIONS[text]
  const key = Object.keys(ABILITY_DEFINITIONS).find(k => text.startsWith(k))
  return key ? ABILITY_DEFINITIONS[key] : ''
}

function highlightEffect(text: string, context: 'main' | 'source' = 'main'): string {
  if (!text) return ''

  // Pre-process: join consecutive ability-only lines onto one line so badges sit side by side
  const ABILITY_LINE = /^(\s*＜[^＞]+＞(\s*\([^)]*\))?\s*)+$/
  const grouped = text.split('\n').reduce<string[]>((acc, line) => {
    const trimmed = line.trim()
    const isAbility = trimmed.length > 0 && ABILITY_LINE.test(trimmed)
    const last = acc[acc.length - 1]
    const lastIsAbility = last !== undefined && last.trim().length > 0 && ABILITY_LINE.test(last.trim())
    if (isAbility && lastIsAbility) {
      acc[acc.length - 1] += ' ' + trimmed
    } else {
      acc.push(line)
    }
    return acc
  }, [])

  const escaped = grouped.join('\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')

  // [Timing Trigger] → badge; card-name refs like [Negamon] are left as plain text
  const TIMING_KEYS = new Set(Object.keys(TIMING_DEFINITIONS))
  const TIMING_PREFIX = /^(When |On |Start of |End of |Once Per |All Turns|Your Turn|Opponent|Counter|Main$|Breeding$|Security$)/
  const withTiming = escaped.replace(/\[([^\]]+)\]/g, (full, t: string) => {
    if (!TIMING_KEYS.has(t) && !TIMING_PREFIX.test(t)) return `<span class="kw-cardref">${t}</span>` // card name ref → purple badge
    const def = getTimingDef(t)
    const title = def ? ` title="${def}"` : ''
    const isBreeding = t === 'Breeding'
    const isHand = t === 'Hand'
    const isOncePer = t === 'Once Per Turn' || t === 'Once Per Attack'
    const isSecurity = t === 'Security' && context === 'main'
    const cls = (isBreeding || isHand || isSecurity) ? 'kw-security'
      : isOncePer ? 'kw-onceper'
      : 'kw-timing'
    return `<span class="${cls}"${title}>${t}</span>`
  })

  // Build ability span: DigiXros → green, others → orange
  const abilitySpan = (kw: string, desc?: string) => {
    const rawDef = desc
      ? desc.replace(/＜([^＞]+)＞/g, '$1').trim()
      : getAbilityDef(kw.trim())
    const title = rawDef ? ` title="${rawDef.replace(/"/g, '&quot;')}"` : ''
    const kwNorm = kw.trim().replace(/[\s\-]/g, '').toLowerCase()
    const cls = kwNorm.startsWith('digixros') || kwNorm.startsWith('digicros') || kwNorm.startsWith('assembly')
      ? 'kw-digixros'
      : 'kw-ability'
    return `<span class="${cls}"${title}>${kw}</span>`
  }

  const withAbility = withTiming
    .replace(/＜([^＞]+)＞(?:[ \t]*\(([^)]+)\))?/g, (_, kw: string, desc?: string) => abilitySpan(kw, desc))
    .replace(/&lt;([^&]+)&gt;(?:[ \t]*\(([^)]+)\))?/g, (_, kw: string, desc?: string) => abilitySpan(kw, desc))
    .replace(/〈([^〉]+)〉(?:[ \t]*\(([^)]+)\))?/g, (_, kw: string, desc?: string) => abilitySpan(kw, desc))

  return withAbility
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible && card"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="relative max-w-4xl w-full rounded-2xl border bg-gray-950 p-6 shadow-2xl flex flex-col sm:flex-row gap-6"
          :class="card ? (COLOR_STYLE[card.color] ?? 'border-gray-700') : ''"
        >
          <!-- Close button -->
          <button
            @click="emit('close')"
            class="absolute top-4 right-4 text-gray-500 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>

          <!-- Card image -->
          <div class="w-full sm:w-80 shrink-0">
            <img
              v-if="card.imgurl"
              :src="card.imgurl"
              :alt="card.name"
              class="w-full rounded-xl shadow-lg"
            />
          </div>

          <!-- Card details -->
          <div class="flex-1 min-w-0">
            <h2 class="text-xl font-bold text-white mb-0.5 pr-8">{{ card.name }}</h2>
            <p class="text-sm text-gray-500 mb-4">{{ card.cardnumber }} · {{ card.set_name }}</p>

            <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              <div v-if="card.type" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Type</span>
                <span class="text-sm text-white">{{ card.type }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Color</span>
                <span class="text-sm text-white">{{ card.color }}</span>
              </div>
              <div v-if="card.level" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Level</span>
                <span class="text-sm text-white">Lv.{{ card.level }}</span>
              </div>
              <div v-if="card.dp" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">DP</span>
                <span class="text-sm text-white">{{ card.dp }}</span>
              </div>
              <div v-if="card.playCost != null" class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Play Cost</span>
                <span class="text-sm text-white">{{ card.playCost }}</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-gray-500 uppercase tracking-wider">Rarity</span>
                <span class="text-sm text-white">{{ card.rarity }}</span>
              </div>
            </div>

            <div v-if="card.mainEffect" class="mb-3">
              <p class="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Effect</p>
              <div class="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed" v-html="highlightEffect(card.mainEffect, 'main')" />
            </div>
            <div v-if="card.sourceEffect" class="mb-4">
              <p class="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Source Effect</p>
              <div class="bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed" v-html="highlightEffect(card.sourceEffect.replace(/^Security Effect\s*/i, ''), 'source')" />
            </div>

            <button
              v-if="canAdd"
              @click="emit('add-to-deck', card)"
              class="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              + Add to Deck
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

:deep(.kw-timing) {
  display: inline-block;
  background: #1d4ed8;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 3px;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
  letter-spacing: 0.02em;
  cursor: help;
}

/* [Security] — dark pink */
:deep(.kw-security) {
  display: inline-block;
  background: #9d174d;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 3px;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
  letter-spacing: 0.02em;
  cursor: help;
}

/* Keyword abilities: 〈Rush〉, 〈Blocker〉, etc. — orange */
:deep(.kw-ability) {
  display: inline-block;
  background: #b45309;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 3px;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
  letter-spacing: 0.02em;
  cursor: help;
}

/* DigiXros keyword — green */
:deep(.kw-digixros) {
  display: inline-block;
  background: #15803d;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 3px;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
  letter-spacing: 0.02em;
  cursor: help;
}

/* Card name reference — purple */
:deep(.kw-cardref) {
  display: inline-block;
  background: #6b21a8;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 3px;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

/* Once Per Turn / Once Per Attack — dark orange */
:deep(.kw-onceper) {
  display: inline-block;
  background: #9a3412;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  margin-right: 3px;
  line-height: 1.6;
  vertical-align: middle;
  white-space: nowrap;
  letter-spacing: 0.02em;
  cursor: help;
}
</style>
