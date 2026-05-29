import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { APP_NAME } from './config/app'
import {
  baseStats,
  doctrines,
  equippedItems as initialEquippedItems,
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

type LiveEnemy = {
  id: string
  x: number
  y: number
  hp: number
  maxHp: number
  size: number
}

type LiveProjectile = {
  id: string
  x: number
  y: number
  tx: number
  ty: number
}

type LiveBattle = {
  heroX: number
  heroY: number
  heroHP: number
  heroFacing: 'left' | 'right'
  attackFlash: boolean
  elapsedLabel: string
  kills: number
  stage: number
  enemies: LiveEnemy[]
  projectiles: LiveProjectile[]
  floatingText: string
  state: 'running' | 'dying' | 'finished'
}

function App() {
  const [profile, setProfile] = useState<PlayerProfile>(initialPlayerProfile)
  const [equipped, setEquipped] = useState<EquippedItem[]>(initialEquippedItems)
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventoryItems)
  const [selectedItemId, setSelectedItemId] = useState(initialInventoryItems[0]?.id ?? '')
  const [selectedDoctrineId, setSelectedDoctrineId] = useState(doctrines[0].id)
  const [lastResult, setLastResult] = useState<ExpeditionResult | null>(null)
  const [timelineSteps, setTimelineSteps] = useState<TimelineStep[]>(buildIdleTimeline())
  const [isSimulating, setIsSimulating] = useState(false)
  const [showExpeditionWindow, setShowExpeditionWindow] = useState(false)
  const [battle, setBattle] = useState<LiveBattle | null>(null)

  const battleTimerRef = useRef<number | null>(null)
  const finishTimerRef = useRef<number | null>(null)
  const battleStateRef = useRef<{
    tick: number
    maxTicks: number
    result: ExpeditionResult | null
    enemies: LiveEnemy[]
    projectiles: LiveProjectile[]
    nextProjectileId: number
    nextEnemyId: number
    killCount: number
  } | null>(null)

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
  const survivalPercent = Math.min(100, Math.round((profile.bestSurvival / 420) * 100))

  useEffect(() => () => clearAllTimers(), [])

  function clearAllTimers() {
    if (battleTimerRef.current) {
      window.clearInterval(battleTimerRef.current)
      battleTimerRef.current = null
    }
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
  }

  function handleEquipSelected() {
    if (!selectedItem) return

    const previous = equipped.find((item) => item.slot === selectedItem.slot)

    setEquipped((current) =>
      current.map((item) => (item.slot === selectedItem.slot ? stripSummary(selectedItem) : item)),
    )

    setInventory((current) => {
      const next = current.filter((item) => item.id !== selectedItem.id)
      if (!previous) return next
      return [
        { ...previous, summary: `Ancien équipement retiré du héros. ${previous.bonus}.` },
        ...next,
      ]
    })
  }

  function handleLaunchExpedition() {
    if (isSimulating) return

    clearAllTimers()

    const result = simulateExpedition({
      archetype,
      totalStats,
      inventoryCount: inventory.length,
      doctrine: selectedDoctrine,
    })

    const maxTicks = Math.max(42, Math.min(80, Math.floor(result.survivalSeconds / 3)))
    const enemies = spawnEnemies(4, 0)

    battleStateRef.current = {
      tick: 0,
      maxTicks,
      result,
      enemies,
      projectiles: [],
      nextProjectileId: 0,
      nextEnemyId: enemies.length,
      killCount: 0,
    }

    setShowExpeditionWindow(true)
    setIsSimulating(true)
    setLastResult(null)
    setTimelineSteps(buildAnimatedTimeline(result, selectedDoctrine).map((step, index) => ({
      ...step,
      state: index === 0 ? 'active' : 'pending',
    })))

    setBattle({
      heroX: 24,
      heroY: 56,
      heroHP: 100,
      heroFacing: 'right',
      attackFlash: false,
      elapsedLabel: '00:00',
      kills: 0,
      stage: 1,
      enemies,
      projectiles: [],
      floatingText: 'Déploiement',
      state: 'running',
    })

    battleTimerRef.current = window.setInterval(runBattleTick, 110)
  }

  function runBattleTick() {
    const state = battleStateRef.current
    if (!state || !state.result) return

    state.tick += 1
    const progress = Math.min(1, state.tick / state.maxTicks)
    const result = state.result
    const stage = Math.max(1, Math.min(result.stageReached, 1 + Math.floor(progress * result.stageReached)))
    const elapsedSeconds = Math.round(result.survivalSeconds * progress)
    const heroX = 22 + progress * 44 + Math.sin(state.tick / 5) * 3
    const heroY = 54 + Math.sin(state.tick / 3.5) * 5
    const heroHP = Math.max(0, 100 - Math.round(progress * 100))

    if (state.tick % 4 === 0 && state.enemies.length > 0) {
      const target = state.enemies[state.tick % state.enemies.length]
      state.projectiles.push({
        id: `p-${state.nextProjectileId++}`,
        x: heroX + 2,
        y: heroY - 2,
        tx: target.x,
        ty: target.y,
      })
    }

    state.projectiles = state.projectiles
      .map((projectile) => {
        const dx = projectile.tx - projectile.x
        const dy = projectile.ty - projectile.y
        const distance = Math.max(1, Math.hypot(dx, dy))
        const step = 6 + totalStats.range * 0.08
        return {
          ...projectile,
          x: projectile.x + (dx / distance) * step,
          y: projectile.y + (dy / distance) * step,
        }
      })
      .filter((projectile) => projectile.x < 110 && projectile.y > -10 && projectile.y < 110)

    const updatedEnemies: LiveEnemy[] = []
    const remainingProjectiles: LiveProjectile[] = []

    for (const projectile of state.projectiles) {
      let hit = false
      for (const enemy of state.enemies) {
        const hitDistance = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y)
        if (!hit && hitDistance < enemy.size * 0.18 + 2) {
          enemy.hp -= 22 + totalStats.power * 0.7
          hit = true
        }
      }
      if (!hit) remainingProjectiles.push(projectile)
    }

    for (const enemy of state.enemies) {
      const pushX = enemy.x - progress * 8 - Math.sin((state.tick + enemy.size) / 7)
      const pushY = enemy.y + Math.cos((state.tick + enemy.size) / 9) * 1.8
      if (enemy.hp <= 0) {
        state.killCount += 1
        continue
      }
      updatedEnemies.push({ ...enemy, x: pushX, y: pushY })
    }

    if (updatedEnemies.length < 3) {
      const refill = spawnEnemies(1 + ((state.tick / 9) % 2), progress, state.nextEnemyId)
      state.nextEnemyId += refill.length
      updatedEnemies.push(...refill)
    }

    state.enemies = updatedEnemies
    state.projectiles = remainingProjectiles

    const floatingText =
      progress < 0.18
        ? 'Engagement'
        : progress < 0.45
          ? `Combo x${Math.max(2, Math.floor(state.killCount / 3) + 1)}`
          : progress < 0.72
            ? `Palier ${stage}`
            : progress < 0.92
              ? 'La pression monte'
              : 'Dernier souffle'

    setBattle({
      heroX,
      heroY,
      heroHP,
      heroFacing: progress > 0.78 ? 'left' : 'right',
      attackFlash: state.tick % 2 === 0,
      elapsedLabel: formatDuration(elapsedSeconds),
      kills: Math.min(result.kills, state.killCount),
      stage,
      enemies: updatedEnemies,
      projectiles: remainingProjectiles,
      floatingText,
      state: progress >= 0.93 ? 'dying' : 'running',
    })

    setTimelineSteps((current) =>
      current.map((step, index) => {
        const threshold = (index + 1) / current.length
        if (progress >= threshold) return { ...step, state: 'done' }
        if (progress >= threshold - 0.18) return { ...step, state: 'active' }
        return { ...step, state: 'pending' }
      }),
    )

    if (state.tick >= state.maxTicks) {
      clearAllTimers()
      setBattle((current) =>
        current
          ? {
              ...current,
              heroHP: 0,
              attackFlash: false,
              elapsedLabel: formatDuration(result.survivalSeconds),
              kills: result.kills,
              stage: result.stageReached,
              floatingText: 'Défaite',
              state: 'finished',
            }
          : current,
      )
      finalizeRun(result)
    }
  }

  function finalizeRun(result: ExpeditionResult) {
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

    setLastResult(result)
    setIsSimulating(false)
    setTimelineSteps((current) => current.map((step) => ({ ...step, state: 'done' })))

    finishTimerRef.current = window.setTimeout(() => {
      setShowExpeditionWindow(false)
    }, 1800)
  }

  return (
    <main className="shell">
      <div className="hud-version">v{__APP_VERSION__}</div>

      <section className="game-hero-shell glass">
        <div className="menu-scene">
          <div className={`menu-hero-card archetype-${normalizeClassName(archetype)}`}>
            <div className="menu-hero-glow"></div>
            <div className="menu-hero-body">
              <div className="menu-hero-weapon"></div>
              <div className="menu-hero-core"></div>
            </div>
            <div className="menu-hero-floor"></div>
          </div>

          <div className="menu-copy">
            <p className="eyebrow">Menu principal</p>
            <h1>{APP_NAME}</h1>
            <p className="game-pitch">
              Monte ton build, choisis une doctrine, puis balance ton héros dans l’arène jusqu’à la mort.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleLaunchExpedition}
                disabled={isSimulating}
              >
                {isSimulating ? 'Combat en direct…' : 'Jouer une expédition'}
              </button>
              <button type="button" className="secondary-button">Classement mondial</button>
            </div>
          </div>
        </div>

        <div className="top-strip">
          <div className="top-pill"><span>Héros</span><strong>{profile.heroName}</strong></div>
          <div className="top-pill"><span>Archétype</span><strong>{archetype}</strong></div>
          <div className="top-pill"><span>Doctrine</span><strong>{selectedDoctrine.name}</strong></div>
          <div className="top-pill"><span>Record</span><strong>{formatDuration(profile.bestSurvival)}</strong></div>
        </div>
      </section>

      <section className="content-grid game-layout">
        <aside className="left-column">
          <article className="panel glass profile-panel">
            <div className="section-title">
              <span className="badge">Profil héros</span>
              <h2>{profile.heroName}, niveau {profile.level}</h2>
            </div>

            <div className="hero-summary">
              <div><span className="label">Zone favorite</span><strong>{profile.region}</strong></div>
              <div><span className="label">Puissance</span><strong>{buildPower}</strong></div>
              <div><span className="label">Or</span><strong>{profile.gold}</strong></div>
              <div><span className="label">Éclats</span><strong>{profile.shards}</strong></div>
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
              <h2>Style de combat</h2>
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
        </aside>

        <section className="panel glass equipment-panel">
          <div className="panel-heading-row">
            <div className="section-title">
              <span className="badge badge-soft">Équipement</span>
              <h2>Build actuel</h2>
            </div>
            <p className="muted-copy">Moins dashboard, plus sélection de build de jeu vidéo.</p>
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
        </section>

        <section className="panel glass expedition-sim-panel">
          <div className="panel-heading-row">
            <div className="section-title">
              <span className="badge badge-hot">Expédition</span>
              <h2>Retour de run</h2>
            </div>
            <p className="muted-copy">La scène de combat tourne maintenant comme un vrai petit combat live.</p>
          </div>

          <div className="simulation-grid">
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

            <div className="sim-result-card glass-dark">
              <span className="label">Dernier run</span>
              {lastResult ? (
                <>
                  <strong>{lastResult.outcomeLabel}</strong>
                  <p className="highlight-line">{formatDuration(lastResult.survivalSeconds)} de survie</p>
                  <div className="sim-result-stats">
                    <span>Palier {lastResult.stageReached}</span>
                    <span>{lastResult.kills} kills</span>
                    <span>+{lastResult.goldEarned} or</span>
                    <span>+{lastResult.shardsEarned} éclats</span>
                  </div>
                  <div className="result-bars">
                    <div>
                      <div className="bar-header"><span>Danger</span><strong>{lastResult.dangerRating}</strong></div>
                      <div className="progress-track"><div className="progress-fill danger" style={{ width: `${Math.min(100, lastResult.stageReached * 12)}%` }}></div></div>
                    </div>
                    <div>
                      <div className="bar-header"><span>Record joueur</span><strong>{survivalPercent}%</strong></div>
                      <div className="progress-track"><div className="progress-fill record" style={{ width: `${survivalPercent}%` }}></div></div>
                    </div>
                  </div>
                  <p>{lastResult.doctrineImpact}</p>
                  <p>Loot obtenu: {lastResult.loot.name}</p>
                </>
              ) : (
                <>
                  <strong>Prêt pour le prochain run</strong>
                  <p>Lance une expédition pour ouvrir un vrai combat live.</p>
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
            <p className="muted-copy">Équipe un item pour changer ton style, tes stats et ta survie.</p>
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
                <span className={`rarity-chip rarity-${normalizeRarity(selectedItem.rarity)}`}>{selectedItem.rarity}</span>
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

      {showExpeditionWindow && battle ? (
        <div className="expedition-overlay">
          <div className="expedition-window glass-dark">
            <div className="expedition-window-head">
              <div>
                <span className="label">Fenêtre d’expédition</span>
                <h2>{profile.heroName} — combat live</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => !isSimulating && setShowExpeditionWindow(false)}
              >
                {isSimulating ? 'Combat…' : 'Fermer'}
              </button>
            </div>

            <div className="battle-window-grid">
              <div className={`battle-window-scene archetype-${normalizeClassName(archetype)} ${battle.state}`}>
                <div className="battle-scene-grid"></div>
                <div className="battle-floating-text">{battle.floatingText}</div>

                <div
                  className={`battle-hero ${battle.attackFlash ? 'attack' : ''} facing-${battle.heroFacing}`}
                  style={{ left: `${battle.heroX}%`, top: `${battle.heroY}%` }}
                >
                  <div className="battle-hero-weapon"></div>
                  <div className="battle-hero-core"></div>
                </div>

                {battle.enemies.map((enemy) => (
                  <div
                    key={enemy.id}
                    className="battle-enemy"
                    style={{ left: `${enemy.x}%`, top: `${enemy.y}%`, width: `${enemy.size}px`, height: `${enemy.size}px` }}
                  >
                    <div className="enemy-hp-bar"><div style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}></div></div>
                  </div>
                ))}

                {battle.projectiles.map((projectile) => (
                  <div
                    key={projectile.id}
                    className={`battle-projectile projectile-${normalizeClassName(archetype)}`}
                    style={{ left: `${projectile.x}%`, top: `${projectile.y}%` }}
                  ></div>
                ))}

                <div className="battle-vfx vfx-one"></div>
                <div className="battle-vfx vfx-two"></div>
              </div>

              <div className="battle-sidepanel">
                <div className="battle-stats-box glass">
                  <span className="label">État du run</span>
                  <strong>{battle.state === 'finished' ? 'Héros vaincu' : 'Combat en cours'}</strong>
                  <div className="battle-mini-stats">
                    <span>Temps {battle.elapsedLabel}</span>
                    <span>Kills {battle.kills}</span>
                    <span>Palier {battle.stage}</span>
                    <span>Doctrine {selectedDoctrine.name}</span>
                  </div>
                </div>

                <div className="battle-stats-box glass">
                  <div className="bar-header"><span>Vie</span><strong>{battle.heroHP}%</strong></div>
                  <div className="progress-track"><div className="progress-fill hp" style={{ width: `${battle.heroHP}%` }}></div></div>
                </div>

                <div className="battle-stats-box glass">
                  <span className="label">Équipement visible</span>
                  <div className="battle-loadout-list">
                    {equipped.slice(0, 4).map((item) => (
                      <div key={item.id} className="battle-loadout-row">
                        <span>{item.slot}</span>
                        <strong>{item.name}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function buildIdleTimeline(): TimelineStep[] {
  return [
    { id: 'idle-1', title: 'Chargement du héros', detail: 'Le build attend dans le menu principal.', state: 'done' },
    { id: 'idle-2', title: 'Choix de doctrine', detail: 'Détermine le style du prochain run.', state: 'done' },
    { id: 'idle-3', title: 'Combat live', detail: 'Le prochain lancement ouvrira le combat en direct.', state: 'active' },
  ]
}

function buildAnimatedTimeline(result: ExpeditionResult, doctrine: Doctrine): TimelineStep[] {
  return [
    { id: 'step-1', title: 'Déploiement', detail: `${doctrine.name} enclenchée.`, state: 'pending' },
    { id: 'step-2', title: 'Nettoyage', detail: `${Math.floor(result.kills * 0.28)} ennemis tombent vite.`, state: 'pending' },
    { id: 'step-3', title: 'Montée en tension', detail: `Le héros grimpe jusqu’au palier ${Math.max(2, result.stageReached - 1)}.`, state: 'pending' },
    { id: 'step-4', title: 'Moment critique', detail: result.doctrineImpact, state: 'pending' },
    { id: 'step-5', title: 'Dernier souffle', detail: `${result.loot.name} sauvé avant la mort.`, state: 'pending' },
  ]
}

function spawnEnemies(count: number, progress = 0, startIndex = 0): LiveEnemy[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `enemy-${startIndex + index}`,
    x: 66 + index * 8 - progress * 4,
    y: 26 + ((index * 19) % 42),
    size: 34 + ((index + 1) % 3) * 8,
    hp: 70 + ((index + 1) % 3) * 18,
    maxHp: 70 + ((index + 1) % 3) * 18,
  }))
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
  const kills = Math.floor(
    survivalSeconds * (archetype === 'Guerrier' ? 0.72 : archetype === 'Mage' ? 0.66 : 0.79),
  )
  const goldEarned = 18 + Math.floor(survivalSeconds / 7)
  const shardsEarned = 2 + Math.floor(stageReached / 2)
  const loot = generateLoot(archetype, totalStats, inventoryCount, doctrine)
  const dangerRating = stageReached >= 8 ? 'Extrême' : stageReached >= 6 ? 'Élevé' : 'Modéré'
  const outcomeLabel = stageReached >= 8 ? 'Run monstrueux' : stageReached >= 6 ? 'Run solide' : 'Run correct'
  const doctrineImpact =
    doctrine.id === 'bastion-prudent'
      ? 'La prudence a tenu le héros debout plus longtemps.'
      : doctrine.id === 'chasseur-fulgurant'
        ? 'La mobilité a rendu le run beaucoup plus nerveux.'
        : 'La pression offensive a nettoyé les vagues rapidement.'

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
