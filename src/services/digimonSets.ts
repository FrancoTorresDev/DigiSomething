const IMAGE_BASE = 'https://images.digimoncard.io/images/cards'
const WIKI_CDN = 'https://static.wikia.nocookie.net/digimoncardgame/images'
// In dev, proxy through Vite to avoid localhost referrer being blocked by the CDN
const w = (path: string) =>
  import.meta.env.DEV
    ? `/wiki-images/${path}/revision/latest`
    : `${WIKI_CDN}/${path}/revision/latest`

export interface DigimonSet {
  code: string        // e.g. "BT-01"
  name: string        // display name e.g. "New Evolution"
  /** Exact string used in API `set_name` array, format: "CODE: Name" */
  apiSeries: string
  type: 'Booster' | 'Starter' | 'Extra' | 'Other'
  releaseDate: string // YYYY-MM for sorting
  keyCard: string     // card number used as thumbnail image
  packImage?: string  // fandom wiki pack art URL
}

export function setCardImgUrl(keyCard: string): string {
  return `${IMAGE_BASE}/${keyCard}.jpg`
}

/** Returns the best available image URL for a set (pack art or fallback card) */
export function setImgUrl(set: DigimonSet): string {
  return set.packImage ?? setCardImgUrl(set.keyCard)
}

export const DIGIMON_SETS: DigimonSet[] = [
  // ── Booster Packs (BT) ──────────────────────────────────────────
  { code: 'BT-25', name: 'Dual Revolution',          apiSeries: 'BT-25: BOOSTER DUAL REVOLUTION',       type: 'Booster', releaseDate: '2026-04', keyCard: 'BT25-001', packImage: w('3/3c/BT-25-Booster_Pack-EN.png') },
  { code: 'BT-24', name: 'Time Stranger',            apiSeries: 'BT-24: BOOSTER TIME STRANGER',         type: 'Booster', releaseDate: '2026-01', keyCard: 'BT24-001', packImage: w('c/c0/BT-24-Booster_Pack-EN.png') },
  { code: 'BT-23', name: "Hackers' Slumber",         apiSeries: "BT-23: BOOSTER HACKERS' SLUMBER",      type: 'Booster', releaseDate: '2025-10', keyCard: 'BT23-001', packImage: w('1/1c/BT-23-Booster_Pack-EN.png') },
  { code: 'BT-22', name: 'Cyber Eden',               apiSeries: 'BT-22: BOOSTER CYBER EDEN',            type: 'Booster', releaseDate: '2025-07', keyCard: 'BT22-001', packImage: w('0/06/BT-22-Booster_Pack-EN.png') },
  { code: 'BT-21', name: 'World Convergence',        apiSeries: 'BT-21: BOOSTER WORLD CONVERGENCE',     type: 'Booster', releaseDate: '2025-04', keyCard: 'BT21-001', packImage: w('3/38/BT-21-Booster_Pack-EN.png') },
  { code: 'BT-20', name: 'Over the X',               apiSeries: 'BT-20: Booster Over the X',            type: 'Booster', releaseDate: '2025-01', keyCard: 'BT20-001', packImage: w('1/14/BT-20-Booster_Pack-JP.png') },
  { code: 'BT-19', name: 'Xros Evolution',           apiSeries: 'BT-19: Booster Xros Evolution',        type: 'Booster', releaseDate: '2024-10', keyCard: 'BT19-001', packImage: w('c/c8/BT-19-Booster_Pack-JP.png') },
  { code: 'BT-18', name: 'Elemental Successor',      apiSeries: 'BT-18: Booster Elemental Successor',   type: 'Booster', releaseDate: '2024-07', keyCard: 'BT18-001', packImage: w('2/2d/BT-18-Booster_Pack-JP.png') },
  { code: 'BT-17', name: 'Secret Crisis',            apiSeries: 'BT-17: Booster Secret Crisis',         type: 'Booster', releaseDate: '2024-04', keyCard: 'BT17-001', packImage: w('4/44/BT-17-Booster_Pack-EN.png') },
  { code: 'BT-16', name: 'Beginning Observer',       apiSeries: 'BT-16: Booster Beginning Observer',    type: 'Booster', releaseDate: '2024-01', keyCard: 'BT16-001', packImage: w('0/0b/BT-16-Booster_Pack-EN.png') },
  { code: 'BT-15', name: 'Exceed Apocalypse',        apiSeries: 'BT-15: Booster Exceed Apocalypse',     type: 'Booster', releaseDate: '2023-10', keyCard: 'BT15-001', packImage: w('b/b3/BT-15-Booster_Pack-EN.png') },
  { code: 'BT-14', name: 'Blast Ace',                apiSeries: 'BT-14: Booster Blast Ace',             type: 'Booster', releaseDate: '2023-07', keyCard: 'BT14-001', packImage: w('d/d3/BT-14-Booster_Pack-EN.png') },
  { code: 'BT-13', name: 'Versus Royal Knights',     apiSeries: 'BT-13: Booster Versus Royal Knights',  type: 'Booster', releaseDate: '2023-04', keyCard: 'BT13-001', packImage: w('d/d3/BT-13-Booster_Pack-EN.png') },
  { code: 'BT-12', name: 'Across Time',              apiSeries: 'BT-12: Booster Across Time',           type: 'Booster', releaseDate: '2023-01', keyCard: 'BT12-001', packImage: w('8/8c/BT-12-Booster_Pack-EN.png') },
  { code: 'BT-11', name: 'Dimensional Phase',        apiSeries: 'BT-11: Booster Dimensional Phase',     type: 'Booster', releaseDate: '2022-10', keyCard: 'BT11-001', packImage: w('e/e3/BT-11-Booster_Pack-EN.png') },
  { code: 'BT-10', name: 'Xros Encounter',           apiSeries: 'BT-10: Booster Xros Encounter',        type: 'Booster', releaseDate: '2022-07', keyCard: 'BT10-001', packImage: w('7/7c/BT-10-Booster_Pack-EN.png') },
  { code: 'BT-09', name: 'X Record',                 apiSeries: 'BT-09: Booster X Record',              type: 'Booster', releaseDate: '2022-04', keyCard: 'BT9-001',  packImage: w('8/83/BT-09-Booster_Pack-EN.png') },
  { code: 'BT-08', name: 'New Awakening',            apiSeries: 'BT-08: Booster New Awakening',         type: 'Booster', releaseDate: '2022-01', keyCard: 'BT8-001',  packImage: w('b/b6/BT-08-Booster_Pack-EN.png') },
  { code: 'BT-07', name: 'Next Adventure',           apiSeries: 'BT-07: Booster Next Adventure',        type: 'Booster', releaseDate: '2021-10', keyCard: 'BT7-001',  packImage: w('c/c4/BT-07-Booster_Pack-EN.png') },
  { code: 'BT-06', name: 'Double Diamond',           apiSeries: 'BT-06: Booster Double Diamond',        type: 'Booster', releaseDate: '2021-07', keyCard: 'BT6-001',  packImage: w('a/ac/BT-06-Booster_Pack-EN.png') },
  { code: 'BT-05', name: 'Battle of Omni',           apiSeries: 'BT-05: Booster Battle Of Omni',        type: 'Booster', releaseDate: '2021-04', keyCard: 'BT5-001',  packImage: w('d/d5/BT-05-Booster_Pack-EN.png') },
  { code: 'BT-04', name: 'Great Legend',             apiSeries: 'BT-04: Booster Great Legend',          type: 'Booster', releaseDate: '2021-01', keyCard: 'BT4-001',  packImage: w('5/56/BT-04-Booster_Pack-EN.png') },
  { code: 'BT-03', name: 'Union Impact',             apiSeries: 'BT-03: Booster Union Impact',          type: 'Booster', releaseDate: '2020-11', keyCard: 'BT3-001',  packImage: w('f/f0/BT-03-Booster_Pack-JP.png') },
  { code: 'BT-02', name: 'Ultimate Power',           apiSeries: 'BT-02: Booster Ultimate Power',        type: 'Booster', releaseDate: '2020-07', keyCard: 'BT2-001',  packImage: w('c/c5/BT-02-Booster_Pack-JP.png') },
  { code: 'BT-01', name: 'New Evolution',            apiSeries: 'BT-01: Booster New Evolution',         type: 'Booster', releaseDate: '2020-04', keyCard: 'BT1-001',  packImage: w('d/d3/BT-01-Booster_Pack-JP.png') },
  // ── Extra / Theme Boosters (EX) ─────────────────────────────────
  { code: 'EX-12', name: 'Digital World Shambala',   apiSeries: 'EX-12: EXTRA BOOSTER DIGITAL WORLD SHAMBALA', type: 'Extra', releaseDate: '2026-01', keyCard: 'EX12-001', packImage: w('0/0e/EX-12-Booster_Pack-EN.png') },
  { code: 'EX-11', name: 'Dawn of Liberator',        apiSeries: 'EX-11: EXTRA BOOSTER DAWN OF LIBERATOR',     type: 'Extra', releaseDate: '2025-10', keyCard: 'EX11-001', packImage: w('8/8f/EX-11-Booster_Pack-EN.png') },
  { code: 'EX-10', name: 'Sinister Order',           apiSeries: 'EX-10: EXTRA BOOSTER SINISTER ORDER',        type: 'Extra', releaseDate: '2025-07', keyCard: 'EX10-001', packImage: w('b/b2/EX-10-Booster_Pack-EN.png') },
  { code: 'EX-09', name: 'Versus Monsters',          apiSeries: 'EX-09: EXTRA BOOSTER VERSUS MONSTERS',       type: 'Extra', releaseDate: '2025-04', keyCard: 'EX9-001',  packImage: w('d/dd/EX-09-Booster_Pack-EN.png') },
  { code: 'EX-08', name: 'Chain of Liberation',      apiSeries: 'EX-08: Extra Booster Chain of Liberation',   type: 'Extra', releaseDate: '2024-10', keyCard: 'EX8-001',  packImage: w('0/0e/EX-8-Booster_Pack-EN.png') },
  { code: 'EX-07', name: 'Digimon Liberator',        apiSeries: 'EX-07: Extra Booster Digimon Liberator',     type: 'Extra', releaseDate: '2024-07', keyCard: 'EX7-001',  packImage: w('e/e8/EX-7-Booster_Pack-EN.png') },
  { code: 'EX-06', name: 'Infernal Ascension',       apiSeries: 'EX-06: Theme Booster Infernal Ascension',    type: 'Extra', releaseDate: '2024-01', keyCard: 'EX6-001',  packImage: w('8/8c/EX-6-Booster_Pack-EN.png') },
  { code: 'EX-05', name: 'Animal Colosseum',         apiSeries: 'EX-05: Theme Booster Animal Colosseum',      type: 'Extra', releaseDate: '2023-10', keyCard: 'EX5-001',  packImage: w('0/09/EX-05-Booster_Pack-EN.png') },
  { code: 'EX-04', name: 'Alternative Being',        apiSeries: 'EX-04: Theme Booster Alternative Being',     type: 'Extra', releaseDate: '2023-04', keyCard: 'EX4-001',  packImage: w('8/81/EX-04-Booster_Pack-EN.png') },
  { code: 'EX-03', name: 'Draconic Roar',            apiSeries: 'EX-03: Theme Booster Draconic Roar',         type: 'Extra', releaseDate: '2022-10', keyCard: 'EX3-001',  packImage: w('d/de/EX-03-Booster_Pack-EN.png') },
  { code: 'EX-02', name: 'Digital Hazard',           apiSeries: 'EX-02: Theme Booster Digital Hazard',        type: 'Extra', releaseDate: '2022-04', keyCard: 'EX2-001',  packImage: w('2/20/EX-02-Booster_Pack-EN.png') },
  { code: 'EX-01', name: 'Classic Collection',       apiSeries: 'EX-01: Theme Booster Classic Collection',    type: 'Extra', releaseDate: '2021-10', keyCard: 'EX1-001',  packImage: w('9/9b/EX-01-Booster_Pack-EN.png') },
  // ── Starter Decks (ST) ──────────────────────────────────────────
  { code: 'ST-24', name: 'Digimon Data Squad',       apiSeries: 'ST-24: STARTER DECK DIGIMON DATA SQUAD',     type: 'Starter', releaseDate: '2025-10', keyCard: 'ST24-01', packImage: w('3/3a/ST-24-EN.png') },
  { code: 'ST-23', name: 'Digimon Beatbreak',        apiSeries: 'ST-23: STARTER DECK DIGIMON BEATBREAK',      type: 'Starter', releaseDate: '2025-10', keyCard: 'ST23-01', packImage: w('d/df/ST-23-EN.png') },
  { code: 'ST-22', name: 'Amethyst Mandala',         apiSeries: 'ST-22: ADVANCED DECK SET AMETHYST MANDALA',  type: 'Starter', releaseDate: '2025-04', keyCard: 'ST22-01', packImage: w('7/72/ST-22-EN.png') },
  { code: 'ST-21', name: 'Hero of Hope',             apiSeries: 'ST-21: STARTER DECK HERO OF HOPE',           type: 'Starter', releaseDate: '2025-01', keyCard: 'ST21-01', packImage: w('5/52/ST-21-EN.png') },
  { code: 'ST-20', name: 'Protector of Light',       apiSeries: 'ST-20: STARTER DECK PROTECTOR OF LIGHT',     type: 'Starter', releaseDate: '2025-01', keyCard: 'ST20-01', packImage: w('0/0a/ST-20-EN.png') },
  { code: 'ST-19', name: 'Fable Waltz',              apiSeries: 'ST-19: Starter Deck Fable Waltz',            type: 'Starter', releaseDate: '2024-10', keyCard: 'ST19-01', packImage: w('2/27/ST-19-EN.png') },
  { code: 'ST-18', name: 'Guardian Vortex',          apiSeries: 'ST-18: Starter Deck Guardian Vortex',        type: 'Starter', releaseDate: '2024-07', keyCard: 'ST18-01', packImage: w('c/ce/ST-18-EN.png') },
  { code: 'ST-17', name: 'Double Typhoon',           apiSeries: 'ST-17: Advanced Deck Set Double Typhoon',    type: 'Starter', releaseDate: '2023-07', keyCard: 'ST17-01', packImage: w('9/99/ST-17-EN.png') },
  { code: 'ST-16', name: 'Wolf of Friendship',       apiSeries: 'ST-16: Starter Deck Wolf of Friendship',     type: 'Starter', releaseDate: '2023-04', keyCard: 'ST16-01', packImage: w('4/4c/ST-16-EN.png') },
  { code: 'ST-15', name: 'Dragon of Courage',        apiSeries: 'ST-15: Starter Deck Dragon of Courage',      type: 'Starter', releaseDate: '2023-04', keyCard: 'ST15-01', packImage: w('0/02/ST-15-EN.png') },
  { code: 'ST-14', name: 'Beelzemon',                apiSeries: 'ST-14: Advanced Deck Set Beelzemon',         type: 'Starter', releaseDate: '2022-10', keyCard: 'ST14-01', packImage: w('6/6a/ST-14-EN.png') },
  { code: 'ST-13', name: 'RagnaLoardmon',            apiSeries: 'ST-13: Starter Deck RagnaLoardmon',          type: 'Starter', releaseDate: '2022-07', keyCard: 'ST13-01', packImage: w('b/bb/ST-13-EN.png') },
  { code: 'ST-12', name: 'Jesmon',                   apiSeries: 'ST-12: Starter Deck Jesmon',                 type: 'Starter', releaseDate: '2022-07', keyCard: 'ST12-01', packImage: w('3/32/ST-12-EN.png') },
  { code: 'ST-11', name: 'Special Entry Deck',       apiSeries: 'ST-11: Starter Deck Special Entry Deck',     type: 'Starter', releaseDate: '2022-01', keyCard: 'ST11-01' },
  { code: 'ST-10', name: 'Parallel World Tactician', apiSeries: 'ST-10: Starter Deck Parallel World Tactician', type: 'Starter', releaseDate: '2022-01', keyCard: 'ST10-01', packImage: w('9/9c/ST-10-EN.png') },
  { code: 'ST-9',  name: 'Ultimate Ancient Dragon',  apiSeries: 'ST-9: Starter Deck Ultimate Ancient Dragon',  type: 'Starter', releaseDate: '2022-01', keyCard: 'ST9-01',  packImage: w('7/70/ST-9-EN.png') },
  { code: 'ST-8',  name: 'UlforceVeedramon',         apiSeries: 'ST-8: Starter Deck UlforceVeedramon',        type: 'Starter', releaseDate: '2021-10', keyCard: 'ST8-01',  packImage: w('b/b5/ST-8-EN.png') },
  { code: 'ST-7',  name: 'Gallantmon',               apiSeries: 'ST-7: Starter Deck Gallantmon',              type: 'Starter', releaseDate: '2021-10', keyCard: 'ST7-01',  packImage: w('c/c1/ST-7-EN.png') },
  { code: 'ST-6',  name: 'Venomous Violet',          apiSeries: 'ST-6: Starter Deck Venomous Violet',         type: 'Starter', releaseDate: '2020-11', keyCard: 'ST6-01',  packImage: w('8/88/ST-6-EN.png') },
  { code: 'ST-5',  name: 'Machine Black',            apiSeries: 'ST-5: Starter Deck Machine Black',           type: 'Starter', releaseDate: '2020-11', keyCard: 'ST5-01',  packImage: w('1/1b/ST-5-EN.png') },
  { code: 'ST-4',  name: 'Giga Green',               apiSeries: 'ST-4: Starter Deck Giga Green',              type: 'Starter', releaseDate: '2020-07', keyCard: 'ST4-01',  packImage: w('9/90/ST-4-EN.png') },
  { code: 'ST-3',  name: "Heaven's Yellow",          apiSeries: "ST-3: Starter Deck Heaven's Yellow",         type: 'Starter', releaseDate: '2020-04', keyCard: 'ST3-01',  packImage: w('c/c2/ST-3-EN.png') },
  { code: 'ST-2',  name: 'Cocytus Blue',             apiSeries: 'ST-2: Starter Deck Cocytus Blue',            type: 'Starter', releaseDate: '2020-04', keyCard: 'ST2-01',  packImage: w('c/c8/ST-2-EN.png') },
  { code: 'ST-1',  name: 'Gaia Red',                 apiSeries: 'ST-1: Starter Deck Gaia Red',                type: 'Starter', releaseDate: '2020-04', keyCard: 'ST1-01',  packImage: w('5/55/ST-1-EN.png') },
  // ── Other (Limited / Resurgence / Advanced Booster) ─────────────
  { code: 'LM-09', name: 'Distancia Cero',           apiSeries: 'LM-09: LIMITED CARD PACK DISTANCIA CERO',    type: 'Other', releaseDate: '2026-01', keyCard: 'LM9-001', packImage: w('c/ce/LM-09-Booster_Pack-EN.png') },
  { code: 'LM-08', name: 'Final Crest',              apiSeries: 'LM-08: LIMITED CARD PACK FINAL CREST',       type: 'Other', releaseDate: '2025-10', keyCard: 'LM8-001', packImage: w('5/55/LM-08-Booster_Pack-EN.png') },
  { code: 'LM-07', name: 'Another Knight',           apiSeries: 'LM-07: LIMITED CARD PACK ANOTHER KNIGHT',    type: 'Other', releaseDate: '2025-07', keyCard: 'LM7-001', packImage: w('6/65/LM-07-Booster_Pack-EN.png') },
  { code: 'LM-06', name: 'Billion Bullet',           apiSeries: 'LM-06: LIMITED CARD PACK BILLION BULLET',    type: 'Other', releaseDate: '2025-04', keyCard: 'LM6-001', packImage: w('2/2c/LM-06-Booster_Pack-EN.png') },
  { code: 'LM-05', name: 'Final Elysion',            apiSeries: 'LM-05: Limited Card Pack Final Elysion',     type: 'Other', releaseDate: '2024-10', keyCard: 'LM5-001' },
  { code: 'LM-04', name: 'Torrid Weiss',             apiSeries: 'LM-04: Limited Card Pack Torrid Weiss',      type: 'Other', releaseDate: '2024-07', keyCard: 'LM4-001', packImage: w('4/44/LM-04-Booster_Pack-JP.png') },
  { code: 'LM-03', name: 'Limited Card Set 2024',    apiSeries: 'LM-03: Limited Card Set 2024',               type: 'Other', releaseDate: '2024-01', keyCard: 'LM3-001', packImage: w('d/db/LM-03-Booster_Pack-JP.png') },
  { code: 'LM-02', name: 'DeathXmon',                apiSeries: 'LM-02: Limited Card Pack DeathXmon',         type: 'Other', releaseDate: '2023-07', keyCard: 'LM2-001', packImage: w('f/fd/LM-02-Booster_Pack-JP.png') },
  { code: 'LM-01', name: 'Digimon Ghost Game',       apiSeries: 'LM-01: Limited Card Pack Digimon Ghost Game', type: 'Other', releaseDate: '2023-01', keyCard: 'LM1-001', packImage: w('5/5a/LM-01-Booster_Pack-JP.png') },
  { code: 'RB-01', name: 'Resurgence Booster',       apiSeries: 'RB-01: Resurgence Booster',                  type: 'Other', releaseDate: '2023-01', keyCard: 'RB1-001', packImage: w('8/8e/RB-01-Booster_Pack-EN.png') },
  { code: 'AD-01', name: 'Digimon Generation',       apiSeries: 'AD-01: ADVANCED BOOSTER DIGIMON GENERATION', type: 'Other', releaseDate: '2025-07', keyCard: 'AD1-001', packImage: w('8/89/AD-01-Booster_Pack-EN.png') },
]

// Sorted most-recent first
export const SORTED_SETS = [...DIGIMON_SETS].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))

export const TYPE_BADGE: Record<DigimonSet['type'], string> = {
  Booster: 'bg-ds-royal/15 text-ds-royal border border-ds-royal/40',
  Starter: 'bg-ds-cyan/15 text-ds-cyan border border-ds-cyan/40',
  Extra:   'bg-ds-gold/15 text-ds-gold border border-ds-gold/40',
  Other:   'bg-ds-slate/15 text-ds-slate border border-ds-slate/40',
}
