import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { APP_NAME, APP_TAGLINE } from './config/app'
import {
  baseStats,
  doctrines,
  equippedItems as initialEquippedItems,
  expeditionEvents,
  inventoryItems as initialInventoryItems,
  lootTable,
  playerProfile as initialPlayerProfile,
  statMeta,
  type Archetype,
  type Doctrine,
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
  dangerRating: string
  outcomeLabel: string
  doctrineImpact: string
}

type TimelineStep = {
  id: string
  title: string
  detail: string
  state: 'pending' | 'active' | 'done'
}

function App() {
  const [profile, setProfile] = useState<PlayerProfile>(initialPlayerProfile)
  const [equipped, setEquipped] = useState<EquippedItem[]>(initialEquippedItems)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventoryItems)
  const [selectedItemId, setSelectedItemId] = useState(initialInventoryItems[0]?.id ?? '')
  const [selectedDoctrineId, setSelectedDoctrineId] = useState(doctrines[0].id)
  const [expeditionLog, setExpeditionLog] = useState<string[]>(expeditionEvents)
  const [lastResult, setLastResult] = useState<ExpeditionResult | null>(null)
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>(buildIdleTimeline())
  const [isSimulating, setIsSimulating] = useState(false)
  const timerRef = useRef<number | null>(null)

  const selectedItem = useMemo(
    () => inventory.find((item) => item.id === selectedItemId) ?? inventory[0] ?? null,
    [inventory, selectedItemId],
  )

  const selectedDoctrine = useMemo<Doctrine>(
    () => doctrines.find((doctrine) => doctrine.id === selectedDoctrineId) ?? doctrines[0],
    [selectedDoctrineId],
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

    for (const key of Object.keys(selectedDoctrine.modifiers) as StatKey[]) {
      aggregated[key] += selectedDoctrine.modifiers[key]
    }

    return aggregated
  }, [equipped, selectedDoctrine])

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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [])

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
      `Doctrine conservée: ${selectedDoctrine.name}`,
      ...current.slice(0, 4),
    ])
  }

  function handleLaunchExpedition() {
    if (isSimulating) return

    const result = simulateExpedition({
      archetype,
      totalStats,
      inventoryCount: inventory.length,
      doctrine: selectedDoctrine,
    })

    const animatedSteps = buildAnimatedTimeline(result, selectedDoctrine)
    setTimelineSteps(
      animatedSteps.map((step, index) => ({
        ...step,
        state: index === 0 ? 'active' : 'pending',
      })),
    )
    setIsSimulating(true)
    setLastResult(null)

    let currentStep = 0
    timerRef.current = window.setInterval(() => {
      currentStep += 1

      setTimelineSteps((current) =>
        current.map((step, index) => ({
          ...step,
          state: index < currentStep ? 'done' : index === currentStep ? 'active' : 'pending',
        })),
      )

      if (currentStep >= animatedSteps.length) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }

        setIsSimulating(false)
        setTimelineSteps(animatedSteps.map((step) => ({ ...step, state: 'done' })))

        setProfile((current) => ({
          ...current,
          doctrine: selectedDoctrine.name,
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
    }, 650)
  }

  const survivalPercent = Math.min(100, Math.round((profile.bestSurvival / 420) * 100))

  return (
    <main className="shell">
      <div className="hud-version">v{__APP_VERSION__}</div>

      <section className="hero-panel glass">
        <div className="hero-copy">
          <p className="eyebrow">Hub joueur — prototype jouable</p>
          <h1>{APP_NAME}</h1>
          <p className="pitch">{APP_TAGLINE}</p>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleLaunchExpedition}
              disabled={isSimulating}
            >
              {isSimulating ? 'Expédition en cours…' : 'Lancer l’expédition auto'}
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
                <strong>{selectedDoctrine.name}</strong>
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

          <article className="panel glass doctrine-panel">
            <div className="section-title">
              <span className="badge badge-soft">Doctrine</span>
              <h2>Choix de combat</h2>
            </div>
            <div className="doctrine-list">
              {doctrines.map((doctrine) => {
                const isActive = doctrine.id === selectedDoctrine.id
                return (
                  <button
                    key={doctrine.id}
                    type="button"
                    className={`doctrine-card ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedDoctrineId(doctrine.id)}
                    disabled={isSimulating}
                  >
                    <div className="doctrine-topline">
                      <strong>{doctrine.name}</strong>
                      <span className="score-chip">{doctrine.focus}</span>
                    </div>
                    <p>{doctrine.summary}</p>
                  </button>
                )
              })}
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
              <h2>Expédition auto animée</h2>
            </div>
            <p className="muted-copy">
              La doctrine influe maintenant sur le run, et la timeline raconte visuellement la progression.
            </p>
          </div>

          <div className="simulation-grid">
            <div className="simulation-stack">
              <div className="simulation-arena glass-dark">
                <div className={`sim-pulse ${isSimulating ? 'running' : ''}`}></div>
                <div className="sim-enemy enemy-a"></div>
                <div className="sim-enemy enemy-b"></div>
                <div className="sim-enemy enemy-c"></div>
                <div className={`sim-hero archetype-${normalizeClassName(archetype)} ${isSimulating ? 'running' : ''}`}>
                  <div className="sim-weapon"></div>
                  <div className="sim-core"></div>
                </div>
              </div>

              <div className="animated-timeline glass-dark">
                {timelineSteps.map((step) => (
                  <div key={step.id} className={`animated-step ${step.state}`}>
                    <span className="animated-dot"></span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="sim-result-card glass-dark">
              <span className="label">Dernier run</span>
              {lastResult ? (
                <>
                  <strong>{lastResult.outcomeLabel}</strong>
                  <p className="highlight-line">{formatDuration(lastResult.survivalSeconds)} de survie</p>
                  <div className="sim-result-stats readable">
                    <span>Palier {lastResult.stageReached}</span>
                    <span>{lastResult.kills} kills</span>
                    <span>+{lastResult.goldEarned} or</span>
                    <span>+{lastResult.shardsEarned} éclats</span>
                  </div>
                  <div className="result-bars">
                    <div>
                      <div className="bar-header">
                        <span>Danger</span>
                        <strong>{lastResult.dangerRating}</strong>
                      </div>
                      <div className="progress-track"><div className="progress-fill danger" style={{ width: `${Math.min(100, lastResult.stageReached * 12)}%` }}></div></div>
                    </div>
                    <div>
                      <div className="bar-header">
                        <span>Record joueur</span>
                        <strong>{survivalPercent}%</strong>
                      </div>
                      <div className="progress-track"><div className="progress-fill record" style={{ width: `${survivalPercent}%` }}></div></div>
                    </div>
                  </div>
                  <p>{lastResult.doctrineImpact}</p>
                  <p>Loot obtenu: {lastResult.loot.name}</p>
                </>
              ) : (
                <>
                  <strong>Aucune expédition lancée</strong>
                  <p>Choisis une doctrine puis lance le run pour voir une timeline animée.</p>
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

function buildIdleTimeline(): TimelineStep[] {
  return [
    { id: 'idle-1', title: 'Préparation', detail: 'Le héros attend les ordres du hub.', state: 'done' },
    { id: 'idle-2', title: 'Doctrine', detail: 'Choisis un style de combat pour influencer le run.', state: 'done' },
    { id: 'idle-3', title: 'Expédition', detail: 'Le prochain lancement animera cette timeline.', state: 'active' },
  ]
}

function buildAnimatedTimeline(result: ExpeditionResult, doctrine: Doctrine): TimelineStep[] {
  return [
    { id: 'step-1', title: 'Déploiement', detail: `${doctrine.name} enclenchée dans les Ruines d’ambre.`, state: 'pending' },
    { id: 'step-2', title: 'Premier contact', detail: `${Math.floor(result.kills * 0.28)} ennemis balayés proprement.`, state: 'pending' },
    { id: 'step-3', title: 'Montée en pression', detail: `Le héros atteint le palier ${Math.max(2, result.stageReached - 1)}.`, state: 'pending' },
    { id: 'step-4', title: 'Pic de run', detail: `${result.doctrineImpact}`, state: 'pending' },
    { id: 'step-5', title: 'Chute et butin', detail: `${result.loot.name} récupéré avant le retour au hub.`, state: 'pending' },
  ]
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
  doctrine,
}: {
  archetype: Archetype
  totalStats: Record<StatKey, number>
  inventoryCount: number
  doctrine: Doctrine
}): ExpeditionResult {
  const archetypeBonus = archetype === 'Mage' ? 18 : archetype === 'Guerrier' ? 14 : 16
  const survivalSeconds = Math.max(
    95,
    totalStats.power * 4 +
      totalStats.range * 3 +
      totalStats.survival * 5 +
      totalStats.mobility * 3 +
      archetypeBonus +
      doctrine.survivalBonus,
  )
  const stageReached = Math.max(3, Math.floor(survivalSeconds / 40))
  const kills = Math.floor(survivalSeconds * (archetype === 'Guerrier' ? 0.72 : archetype === 'Mage' ? 0.66 : 0.79))
  const goldEarned = 18 + Math.floor(survivalSeconds / 7)
  const shardsEarned = 2 + Math.floor(stageReached / 2)
  const loot = generateLoot(archetype, totalStats, inventoryCount, doctrine)
  const dangerRating = stageReached >= 8 ? 'Extrême' : stageReached >= 6 ? 'Élevé' : 'Modéré'
  const outcomeLabel = stageReached >= 8 ? 'Run monstrueux' : stageReached >= 6 ? 'Run solide' : 'Run correct'
  const doctrineImpact =
    doctrine.id === 'bastion-prudent'
      ? 'La doctrine prudente a clairement prolongé la survie.'
      : doctrine.id === 'chasseur-fulgurant'
        ? 'La mobilité de la doctrine a accéléré le rythme du run.'
        : 'La pression offensive a permis un bon nettoyage des vagues.'

  return {
    survivalSeconds,
    stageReached,
    kills,
    goldEarned,
    shardsEarned,
    loot,
    dangerRating,
    outcomeLabel,
    doctrineImpact,
    lines: [
      `${archetype} lancé avec la doctrine ${doctrine.name}`,
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
  doctrine: Doctrine,
): InventoryItem {
  const preferred =
    doctrine.lootBias === 'survival'
      ? lootTable.find((item) => item.stats.survival >= 4)
      : doctrine.lootBias === 'mobility'
        ? lootTable.find((item) => item.stats.mobility >= 5)
        : lootTable.find((item) => item.archetype === archetype)

  const fallbackIndex =
    (totalStats.power + totalStats.mobility + totalStats.range + inventoryCount) % lootTable.length
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
