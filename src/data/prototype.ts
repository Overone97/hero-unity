export type Stat = {
  label: string
  value: string
  accent: string
}

export type LoadoutItem = {
  slot: string
  name: string
  tag: string
}

export const stats: Stat[] = [
  { label: 'Puissance', value: '18', accent: 'violet' },
  { label: 'Portée', value: '11', accent: 'cyan' },
  { label: 'Survie', value: '14', accent: 'gold' },
]

export const loadout: LoadoutItem[] = [
  { slot: 'Arme', name: 'Bâton astral brut', tag: 'Mage' },
  { slot: 'Armure', name: 'Cape de braise', tag: 'Rare' },
  { slot: 'Relique', name: 'Œil du veilleur', tag: 'Scout' },
]

export const timeline = [
  'Spawn dans les Ruines d’ambre',
  'Premier élite vaincu au palier 4',
  '2 objets trouvés, 1 doctrine activée',
  'Mort face au boss “Gardien du Silex”',
]
