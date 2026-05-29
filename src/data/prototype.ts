export type Accent = 'violet' | 'cyan' | 'gold' | 'emerald'
export type Rarity = 'Commun' | 'Rare' | 'Épique' | 'Légendaire'
export type Archetype = 'Mage' | 'Guerrier' | 'Archer'

export type StatKey = 'power' | 'range' | 'survival' | 'mobility'

export type Doctrine = {
  id: string
  name: string
  summary: string
  focus: string
  modifiers: Record<StatKey, number>
  survivalBonus: number
  lootBias: 'damage' | 'survival' | 'mobility'
}

export type PlayerProfile = {
  name: string
  title: string
  heroName: string
  level: number
  region: string
  doctrine: string
  gold: number
  shards: number
  bestSurvival: number
  rank: string
}

export type EquippedItem = {
  id: string
  slot: string
  name: string
  rarity: Rarity
  tag: string
  bonus: string
  score: number
  archetype?: Archetype
  stats: Record<StatKey, number>
}

export type InventoryItem = EquippedItem & {
  summary: string
}

export type LootTemplate = Omit<InventoryItem, 'id'>

export const statMeta: Record<StatKey, { label: string; accent: Accent }> = {
  power: { label: 'Puissance', accent: 'violet' },
  range: { label: 'Portée', accent: 'cyan' },
  survival: { label: 'Survie', accent: 'gold' },
  mobility: { label: 'Mobilité', accent: 'emerald' },
}

export const baseStats: Record<StatKey, number> = {
  power: 10,
  range: 10,
  survival: 10,
  mobility: 10,
}

export const playerProfile: PlayerProfile = {
  name: 'Alan#097',
  title: 'Architecte des expéditions',
  heroName: 'Lys',
  level: 1,
  region: 'Ruines d’ambre',
  doctrine: 'Kite agressif',
  gold: 248,
  shards: 17,
  bestSurvival: 252,
  rank: 'Top 18%',
}

export const equippedItems: EquippedItem[] = [
  {
    id: 'eq-staff-astral',
    slot: 'Arme',
    name: 'Bâton astral brut',
    rarity: 'Rare',
    tag: 'Mage',
    bonus: '+18% dégâts de projectiles',
    score: 118,
    archetype: 'Mage',
    stats: { power: 8, range: 6, survival: -2, mobility: 0 },
  },
  {
    id: 'eq-cape-braise',
    slot: 'Armure',
    name: 'Cape de braise',
    rarity: 'Épique',
    tag: 'Survie',
    bonus: 'Bouclier à 30% PV',
    score: 121,
    stats: { power: 1, range: 0, survival: 6, mobility: 0 },
  },
  {
    id: 'eq-eye-watcher',
    slot: 'Relique',
    name: 'Œil du veilleur',
    rarity: 'Rare',
    tag: 'Scout',
    bonus: '+2 portée et vision élite',
    score: 109,
    stats: { power: 0, range: 4, survival: 1, mobility: 0 },
  },
  {
    id: 'eq-boots-falcon',
    slot: 'Bottes',
    name: 'Pas du faucon',
    rarity: 'Commun',
    tag: 'Mobilité',
    bonus: '+8% vitesse de déplacement',
    score: 90,
    stats: { power: 0, range: 0, survival: 0, mobility: 4 },
  },
  {
    id: 'eq-ring-mana',
    slot: 'Anneau',
    name: 'Spire de mana',
    rarity: 'Rare',
    tag: 'Mana',
    bonus: 'Récupération de mana accélérée',
    score: 104,
    stats: { power: 2, range: 1, survival: 0, mobility: 0 },
  },
  {
    id: 'eq-helm-ember',
    slot: 'Casque',
    name: 'Visière d’étincelle',
    rarity: 'Commun',
    tag: 'Focus',
    bonus: '+6% précision',
    score: 88,
    stats: { power: 1, range: 1, survival: 1, mobility: 0 },
  },
]

export const inventoryItems: InventoryItem[] = [
  {
    id: 'item-arc-sylve',
    name: 'Arc de sylve nerveuse',
    slot: 'Arme',
    rarity: 'Épique',
    score: 127,
    tag: 'Archer',
    archetype: 'Archer',
    bonus: '+22% vitesse d’attaque',
    summary: 'Transforme le build en distance rapide, plus fragile mais bien plus nerveux.',
    stats: { power: 5, range: 8, survival: -1, mobility: 3 },
  },
  {
    id: 'item-epee-cendre',
    name: 'Lame de cendre lourde',
    slot: 'Arme',
    rarity: 'Rare',
    score: 119,
    tag: 'Guerrier',
    archetype: 'Guerrier',
    bonus: 'Frappes de zone courtes',
    summary: 'Passe le héros en mêlée frontale avec un vrai côté bruiser.',
    stats: { power: 7, range: -4, survival: 4, mobility: -1 },
  },
  {
    id: 'item-casque-verre',
    name: 'Heaume de verre runique',
    slot: 'Casque',
    rarity: 'Rare',
    score: 108,
    tag: 'Critique',
    bonus: '+12% chance critique',
    summary: 'Pièce agressive pour builds burst, pas pour les peureux.',
    stats: { power: 4, range: 0, survival: -1, mobility: 0 },
  },
  {
    id: 'item-bottes-foudre',
    name: 'Sandales de foudre',
    slot: 'Bottes',
    rarity: 'Légendaire',
    score: 141,
    tag: 'Dash',
    bonus: 'Esquive automatique toutes les 8s',
    summary: 'Très forte pièce défensive, probablement méta pour le ladder.',
    stats: { power: 0, range: 0, survival: 3, mobility: 8 },
  },
  {
    id: 'item-amulette-ambre',
    name: 'Amulette d’ambre figée',
    slot: 'Relique',
    rarity: 'Commun',
    score: 84,
    tag: 'Farm',
    bonus: '+9% or gagné',
    summary: 'Moins sexy, mais rentable pour progresser au début.',
    stats: { power: 0, range: 1, survival: 1, mobility: 1 },
  },
  {
    id: 'item-ring-abyssal',
    name: 'Anneau abyssal fissuré',
    slot: 'Anneau',
    rarity: 'Épique',
    score: 132,
    tag: 'Chaos',
    bonus: 'Nova noire à chaque élite',
    summary: 'Objet très flashy, parfait pour vendre le jeu visuellement.',
    stats: { power: 6, range: 2, survival: 0, mobility: 0 },
  },
]

export const expeditionEvents = [
  'Dernière expédition: 04:12 de survie',
  'Palier 6 atteint dans les Ruines d’ambre',
  '1 objet épique trouvé sur le boss coffre',
  'Prochain objectif: dépasser le top 15%',
]

export const doctrines: Doctrine[] = [
  {
    id: 'kite-agressif',
    name: 'Kite agressif',
    summary: 'Prend la distance, punition rapide, peu de marge si le run déraille.',
    focus: 'DPS / portée',
    modifiers: { power: 2, range: 3, survival: -1, mobility: 2 },
    survivalBonus: 10,
    lootBias: 'damage',
  },
  {
    id: 'bastion-prudent',
    name: 'Bastion prudent',
    summary: 'Joue plus proprement, avance moins vite, tient mieux les paliers hauts.',
    focus: 'Survie / stabilité',
    modifiers: { power: -1, range: 0, survival: 4, mobility: 0 },
    survivalBonus: 24,
    lootBias: 'survival',
  },
  {
    id: 'chasseur-fulgurant',
    name: 'Chasseur fulgurant',
    summary: 'Très mobile, nettoie vite, excellent pour les runs flashy.',
    focus: 'Mobilité / exécution',
    modifiers: { power: 1, range: 1, survival: 0, mobility: 4 },
    survivalBonus: 14,
    lootBias: 'mobility',
  },
]

export const lootTable: LootTemplate[] = [
  {
    name: 'Grimoire d’orage plié',
    slot: 'Arme',
    rarity: 'Légendaire',
    score: 149,
    tag: 'Mage',
    archetype: 'Mage',
    bonus: 'Chaîne d’éclairs sur critique',
    summary: 'Très gros plafond de dégâts. Demande une bonne survie autour.',
    stats: { power: 10, range: 7, survival: -3, mobility: 0 },
  },
  {
    name: 'Plastron du bastion rouge',
    slot: 'Armure',
    rarity: 'Rare',
    score: 116,
    tag: 'Tank',
    bonus: '+18% armure effective',
    summary: 'Pièce stable qui rallonge les runs sans faire rêver visuellement.',
    stats: { power: 0, range: 0, survival: 7, mobility: -1 },
  },
  {
    name: 'Carquois à ressort noir',
    slot: 'Relique',
    rarity: 'Épique',
    score: 129,
    tag: 'Archer',
    bonus: 'Tir supplémentaire toutes les 5 attaques',
    summary: 'Excellent pour un build arc, surtout si la portée suit.',
    stats: { power: 3, range: 4, survival: 0, mobility: 2 },
  },
  {
    name: 'Casque du prédateur doux',
    slot: 'Casque',
    rarity: 'Rare',
    score: 112,
    tag: 'Vision',
    bonus: 'Focus automatique des élites',
    summary: 'Améliore la prise de décision perçue du héros.',
    stats: { power: 2, range: 2, survival: 1, mobility: 0 },
  },
  {
    name: 'Bottes de braise vive',
    slot: 'Bottes',
    rarity: 'Épique',
    score: 130,
    tag: 'Dash',
    bonus: 'Traînée brûlante à l’esquive',
    summary: 'Ajoute du mouvement et du spectacle. Bon signe pour le viral.',
    stats: { power: 1, range: 0, survival: 1, mobility: 7 },
  },
  {
    name: 'Anneau de voracité calme',
    slot: 'Anneau',
    rarity: 'Rare',
    score: 117,
    tag: 'Drain',
    bonus: '3% vol de vie sur boss',
    summary: 'Un bel item de stabilité pour les runs longs.',
    stats: { power: 3, range: 0, survival: 4, mobility: 0 },
  },
]
