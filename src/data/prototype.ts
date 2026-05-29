export type Stat = {
  label: string
  value: string
  accent: 'violet' | 'cyan' | 'gold' | 'emerald'
}

export type EquippedItem = {
  slot: string
  name: string
  rarity: 'Commun' | 'Rare' | 'Épique' | 'Légendaire'
  tag: string
  bonus: string
}

export type InventoryItem = {
  id: string
  name: string
  slot: string
  rarity: 'Commun' | 'Rare' | 'Épique' | 'Légendaire'
  score: number
  tag: string
  bonus: string
  summary: string
}

export const playerProfile = {
  name: 'Alan#097',
  title: 'Architecte des expéditions',
  heroName: 'Lys',
  level: 1,
  region: 'Ruines d’ambre',
  doctrine: 'Kite agressif',
  gold: 248,
  shards: 17,
  bestSurvival: '04:12',
  rank: 'Top 18%',
}

export const stats: Stat[] = [
  { label: 'Puissance', value: '18', accent: 'violet' },
  { label: 'Portée', value: '11', accent: 'cyan' },
  { label: 'Survie', value: '14', accent: 'gold' },
  { label: 'Mobilité', value: '09', accent: 'emerald' },
]

export const equippedItems: EquippedItem[] = [
  {
    slot: 'Arme',
    name: 'Bâton astral brut',
    rarity: 'Rare',
    tag: 'Mage',
    bonus: '+18% dégâts de projectiles',
  },
  {
    slot: 'Armure',
    name: 'Cape de braise',
    rarity: 'Épique',
    tag: 'Survie',
    bonus: 'Bouclier à 30% PV',
  },
  {
    slot: 'Relique',
    name: 'Œil du veilleur',
    rarity: 'Rare',
    tag: 'Scout',
    bonus: '+2 portée et vision élite',
  },
  {
    slot: 'Bottes',
    name: 'Pas du faucon',
    rarity: 'Commun',
    tag: 'Mobilité',
    bonus: '+8% vitesse de déplacement',
  },
  {
    slot: 'Anneau',
    name: 'Spire de mana',
    rarity: 'Rare',
    tag: 'Mana',
    bonus: 'Récupération de mana accélérée',
  },
  {
    slot: 'Totem',
    name: 'Vide',
    rarity: 'Commun',
    tag: 'Slot libre',
    bonus: 'Ajoute une synergie de build',
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
    bonus: '+22% vitesse d’attaque',
    summary: 'Transforme le build en distance rapide, plus fragile mais plus nerveux.',
  },
  {
    id: 'item-epee-cendre',
    name: 'Lame de cendre lourde',
    slot: 'Arme',
    rarity: 'Rare',
    score: 119,
    tag: 'Guerrier',
    bonus: 'Frappes de zone courtes',
    summary: 'Passe le héros en mêlée frontale avec de meilleurs dégâts soutenus.',
  },
  {
    id: 'item-casque-verre',
    name: 'Heaume de verre runique',
    slot: 'Casque',
    rarity: 'Rare',
    score: 108,
    tag: 'Critique',
    bonus: '+12% chance critique',
    summary: 'Pièce agressive pour builds burst, peu tolérante si le perso est mal placé.',
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
  },
  {
    id: 'item-totem-abyssal',
    name: 'Totem abyssal fissuré',
    slot: 'Totem',
    rarity: 'Épique',
    score: 132,
    tag: 'Chaos',
    bonus: 'Nova noire à chaque élite',
    summary: 'Objet très flashy, parfait pour vendre le jeu visuellement.',
  },
]

export const expeditionEvents = [
  'Dernière expédition: 04:12 de survie',
  'Palier 6 atteint dans les Ruines d’ambre',
  '1 objet épique trouvé sur le boss coffre',
  'Prochain objectif: dépasser le top 15%',
]
