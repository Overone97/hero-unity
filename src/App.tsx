import { useMemo, useState } from 'react'
import './App.css'
import { APP_NAME, APP_TAGLINE } from './config/app'
import {
  baseStats,
  equippedItems as initialEquippedItems,
  expeditionEvents,
  inventoryItems as initialInventoryItems,
  lootTable,
  playerProfile as initialPlayerProfile,
  statMeta,
  type Archetype,
  type EquippedItem,
  type InventoryItem,
  type PlayerProfile,
  type StatKey,
} from './data/prototype'

type ExpeditionResult = {
  survivalSeconds: number
  stageReached: number
  kills: number
  goldEarned: number
  shardsEarned: number
  loot: InventoryItem
  lines: string[]
}

function App() {
  const [profile, setProfile] = useState<PlayerProfile>(initialPlayerProfile)
  const [equipped, setEquipped] = useState<EquippedItem[]>(initialEquippedItems)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventoryItems)
  const [selectedItemId, setSelectedItemId] = useState(initialInventoryItems[0]?.id ?? '')
  const [expeditionLog, setExpeditionLog] = useState<string[]>(expeditionEvents)
  const [lastResult, setLastResult] = useState<ExpeditionResult | null>(null)

  const selectedItem = useMemo(
    () => inventory.find((item) => item.id === selectedItemId) ?? inventory[0] ?? null,
    [inventory, selectedItemId],
  )

  const archetype = useMemo<Archetype>(() => {
    const weapon = equipped.find((item) => item.slot === 'Arme')
    return weapon?.archetype ?? 'Mage'
  }, [equipped])

  const totalStats = useMemo(() => {
    const aggregated: Record<StatKey, number> = { ...baseStats }

    for (const item of equipped) {
      for (const key of Object.keys(item.stats) as StatKey[]) {
        aggregated[key] += item.stats[key]
      }
    }

    return aggregated
  }, [equipped])

  const statCards = useMemo(
    () =>
      (Object.keys(statMeta) as StatKey[]).map((key) => ({
        key,
        label: statMeta[key].label,
        accent: statMeta[key].accent,
        value: String(totalStats[key]).padStart(2, '0'),
      })),
    [totalStats],
  )

  const buildPower = totalStats.power + totalStats.range + totalStats.survival + totalStats.mobility

  function handleEquipSelected() {
    if (!selectedItem) return

    const previous = equipped.find((item) => item.slot === selectedItem.slot)

    setEquipped((current) =>
      current.map((item) => (item.slot === selectedItem.slot ? stripSummary(selectedItem) : item)),
    )

    setInventory((current) => {
      const next = current.filter((item) => item.id !== selectedItem.id)

      if (previous) {
        return [
          {
            ...previous,
            summary: `Ancien équipement retiré du héros. ${previous.bonus}.`,
          },
          ...next,
        ]
      }

      return next
    })

    setExpeditionLog((current) => [
      `Équipé: ${selectedItem.name} sur le slot ${selectedItem.slot}`,
      `Archétype actuel: ${selectedItem.archetype ?? archetype}`,
      ...current.slice(0, 5),
    ])
  }

  function handleLaunchExpedition() {
    const result = simulateExpedition({ archetype, totalStats, inventoryCount: inventory.length })

    setProfile((current) => ({
      ...current,
      gold: current.gold + result.goldEarned,
      shards: current.shards + result.shardsEarned,
      bestSurvival: Math.max(current.bestSurvival, result.survivalSeconds),
      rank: rankFromSeconds(Math.max(current.bestSurvival, result.survivalSeconds)),
    }))

    setInventory((current) => {
      const next = [result.loot, ...current]
      setSelectedItemId(result.loot.id)
      return next
    })

    setExpeditionLog(result.lines)
    setLastResult(result)
  }

  return (
    <main className="shell">
      <div className="hud-version">v{__APP_VERSION__}</div>

      <section className="hero-panel glass">
        <div className="hero-copy">
          <p className="eyebrow">Hub joueur — prototype jouable</p>
          <h1>{APP_NAME}</h1>
          <p className="pitch">{APP_TAGLINE}</p>

          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={handleLaunchExpedition}>
              Lancer l’expédition auto
            </button>
            <button type="button" className="secondary-button">
              Voir le classement
            </button>
          </div>
        </div>

        <div className="account-card glass-dark">
          <div className="account-header">
            <div className={`account-avatar archetype-${normalizeClassName(archetype)}`}>
              <span>{profile.heroName.slice(0, 1)}</span>
            </div>
            <div>
              <span className="label">Compte joueur</span>
              <strong>{profile.name}</strong>
              <p>{profile.title}</p>
            </div>
          </div>

          <div className="account-metrics">
            <div>
              <span className="label">Rang</span>
              <strong>{profile.rank}</strong>
            </div>
            <div>
              <span className="label">Meilleure survie</span>
              <strong>{formatDuration(profile.bestSurvival)}</strong>
            </div>
            <div>
              <span className="label">Or</span>
              <strong>{profile.gold}</strong>
            </div>
            <div>
              <span className="label">Éclats</span>
              <strong>{profile.shards}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid hub-grid">
        <aside className="left-column">
          <article className="panel glass profile-panel">
            <div className="section-title">
              <span className="badge">Profil héros</span>
              <h2>
                {profile.heroName}, niveau {profile.level}
              </h2>
            </div>

            <div className="hero-summary">
              <div>
                <span className="label">Zone favorite</span>
                <strong>{profile.region}</strong>
              </div>
              <div>
                <span className="label">Doctrine active</span>
                <strong>{profile.doctrine}</strong>
              </div>
              <div>
                <span className="label">Archétype</span>
                <strong>{archetype}</strong>
              </div>
              <div>
                <span className="label">Puissance de build</span>
                <strong>{buildPower}</strong>
              </div>
            </div>

            <div className="stats-grid stats-grid-four">
              {statCards.map((stat) => (
                <div key={stat.key} className={`stat-card ${stat.accent}`}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="panel glass expedition-panel">
            <div className="section-title">
              <span className="badge badge-hot">Journal</span>
              <h2>Retour d’expédition</h2>
            </div>
            <div className="timeline-card compact">
              {expeditionLog.map((entry) => (
                <div key={entry} className="timeline-row">
                  <span className="timeline-dot"></span>
                  <p>{entry}</p>
                </div>
              ))}
            </div>
          </article>
        </aside>

        <section className="panel glass equipment-panel">
          <div className="panel-heading-row">
            <div className="section-title">
              <span className="badge badge-soft">Équipement</span>
              <h2>Slots actifs du héros</h2>
            </div>
            <p className="muted-copy">
              Le stuff change vraiment le build maintenant: stats, style et archétype visuel.
            </p>
          </div>

          <div className="equipment-hero-layout">
            <div className={`hero-stage glass-dark archetype-${normalizeClassName(archetype)}`}>
              <div className="hero-stage-aura"></div>
              <div className="hero-stage-body">
                <div className="hero-stage-weapon"></div>
                <div className="hero-stage-core"></div>
                <div className="hero-stage-shadow"></div>
              </div>
              <div className="hero-stage-copy">
                <span className="label">Silhouette active</span>
                <strong>{archetype}</strong>
                <p>
                  {archetype === 'Mage'
                    ? 'Fragile, longue portée, gros burst.'
                    : archetype === 'Guerrier'
                      ? 'Corps à corps solide, pression constante.'
                      : 'Mobile, précis, très bon pour les runs nerveux.'}
                </p>
              </div>
            </div>

            <div className="equipment-grid">
              {equipped.map((item) => (
                <button key={item.slot} type="button" className="equip-slot">
                  <div className="equip-icon">{item.slot.slice(0, 1)}</div>
                  <div className="equip-copy">
                    <span className="label">{item.slot}</span>
                    <strong>{item.name}</strong>
                    <p>{item.bonus}</p>
                  </div>
                  <span className={`rarity-chip rarity-${normalizeRarity(item.rarity)}`}>{item.rarity}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel glass expedition-sim-panel">
          <div className="panel-heading-row">
            <div className="section-title">
              <span className="badge badge-hot">Simulation</span>
              <h2>Première expédition auto</h2>
            </div>
            <p className="muted-copy">
              Le résultat dépend déjà de ton archétype, de tes stats et du nombre d’objets disponibles.
            </p>
          </div>

          <div className="simulation-grid">
            <div className="simulation-arena glass-dark">
              <div className="sim-enemy enemy-a"></div>
              <div className="sim-enemy enemy-b"></div>
              <div className="sim-enemy enemy-c"></div>
              <div className={`sim-hero archetype-${normalizeClassName(archetype)}`}>
                <div className="sim-weapon"></div>
                <div className="sim-core"></div>
              </div>
            </div>

            <div className="sim-result-card glass-dark">
              <span className="label">Dernier run</span>
              {lastResult ? (
                <>
                  <strong>{formatDuration(lastResult.survivalSeconds)} de survie</strong>
                  <div className="sim-result-stats">
                    <span>Palier {lastResult.stageReached}</span>
                    <span>{lastResult.kills} kills</span>
                    <span>+{lastResult.goldEarned} or</span>
                    <span>+{lastResult.shardsEarned} éclats</span>
                  </div>
                  <p>Loot obtenu: {lastResult.loot.name}</p>
                </>
              ) : (
                <>
                  <strong>Aucune expédition lancée</strong>
                  <p>Appuie sur “Lancer l’expédition auto” pour générer un run et du loot.</p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="panel glass inventory-panel">
          <div className="panel-heading-row">
            <div className="section-title">
              <span className="badge">Inventaire</span>
              <h2>Loot disponible</h2>
            </div>
            <p className="muted-copy">Clique un objet puis équipe-le pour remplacer le slot correspondant.</p>
          </div>

          <div className="inventory-layout">
            <div className="inventory-list">
              {inventory.map((item) => {
                const isSelected = item.id === selectedItem?.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`inventory-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <div className="inventory-topline">
                      <span className={`rarity-chip rarity-${normalizeRarity(item.rarity)}`}>{item.rarity}</span>
                      <span className="score-chip">Score {item.score}</span>
                    </div>
                    <strong>{item.name}</strong>
                    <div className="inventory-meta">
                      <span>{item.slot}</span>
                      <span>{item.tag}</span>
                    </div>
                    <p>{item.bonus}</p>
                  </button>
                )
              })}
            </div>

            {selectedItem ? (
              <article className="inspect-card glass-dark">
                <span className={`rarity-chip rarity-${normalizeRarity(selectedItem.rarity)}`}>
                  {selectedItem.rarity}
                </span>
                <h3>{selectedItem.name}</h3>
                <div className="inspect-meta">
                  <span>{selectedItem.slot}</span>
                  <span>{selectedItem.tag}</span>
                  <span>Score {selectedItem.score}</span>
                </div>
                <p className="inspect-bonus">{selectedItem.bonus}</p>
                <p className="inspect-summary">{selectedItem.summary}</p>
                <div className="delta-grid">
                  {(Object.keys(statMeta) as StatKey[]).map((key) => (
                    <div key={key} className="delta-row">
                      <span>{statMeta[key].label}</span>
                      <strong>{formatDelta(selectedItem.stats[key])}</strong>
                    </div>
                  ))}
                </div>
                <button type="button" className="primary-button full-width" onClick={handleEquipSelected}>
                  Équiper à la place
                </button>
              </article>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  )
}

function stripSummary(item: InventoryItem): EquippedItem {
  const { summary, ...equippedItem } = item
  void summary
  return equippedItem
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function formatDelta(value: number) {
  return `${value > 0 ? '+' : ''}${value}`
}

function rankFromSeconds(seconds: number) {
  if (seconds >= 360) return 'Top 6%'
  if (seconds >= 300) return 'Top 10%'
  if (seconds >= 240) return 'Top 14%'
  return 'Top 18%'
}

function simulateExpedition({
  archetype,
  totalStats,
  inventoryCount,
}: {
  archetype: Archetype
  totalStats: Record<StatKey, number>
  inventoryCount: number
}): ExpeditionResult {
  const archetypeBonus = archetype === 'Mage' ? 18 : archetype === 'Guerrier' ? 14 : 16
  const survivalSeconds = Math.max(
    95,
    totalStats.power * 4 + totalStats.range * 3 + totalStats.survival * 5 + totalStats.mobility * 3 + archetypeBonus,
  )
  const stageReached = Math.max(3, Math.floor(survivalSeconds / 42))
  const kills = Math.floor(survivalSeconds * (archetype === 'Guerrier' ? 0.72 : archetype === 'Mage' ? 0.66 : 0.79))
  const goldEarned = 18 + Math.floor(survivalSeconds / 7)
  const shardsEarned = 2 + Math.floor(stageReached / 2)
  const loot = generateLoot(archetype, totalStats, inventoryCount)

  return {
    survivalSeconds,
    stageReached,
    kills,
    goldEarned,
    shardsEarned,
    loot,
    lines: [
      `${archetype} lancé dans les ${stageReached >= 7 ? 'Profondeurs de silex' : 'Ruines d’ambre'}`,
      `${kills} ennemis éliminés avant la chute du héros`,
      `Palier ${stageReached} atteint — survie ${formatDuration(survivalSeconds)}`,
      `Butin trouvé: ${loot.name} (${loot.rarity})`,
      `Récompenses: +${goldEarned} or, +${shardsEarned} éclats`,
    ],
  }
}

function generateLoot(
  archetype: Archetype,
  totalStats: Record<StatKey, number>,
  inventoryCount: number,
): InventoryItem {
  const preferred = lootTable.find((item) => item.archetype === archetype)
  const fallbackIndex = (totalStats.power + totalStats.mobility + inventoryCount) % lootTable.length
  const template = preferred ?? lootTable[fallbackIndex]

  return {
    ...template,
    id: `${normalizeClassName(template.name)}-${Date.now()}`,
    score: template.score + Math.floor((totalStats.power + totalStats.range) / 8),
  }
}

function normalizeRarity(rarity: string) {
  return normalizeClassName(rarity)
}

function normalizeClassName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export default App
