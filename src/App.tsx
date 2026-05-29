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
  speed: number
}

type LiveProjectile = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

type LiveBattle = {
  heroX: number
  heroY: number
  heroHP: number
  heroFacing: 'left' | 'right'
  attackFlash: boolean
  elapsedLabel: string
  kills: number
  wave: number
  enemies: LiveEnemy[]
  projectiles: LiveProjectile[]
  floatingText: string
  state: 'running' | 'dying' | 'finished'
}

type BattleRuntime = {
  result: ExpeditionResult
  tick: number
  maxTicks: number
  wave: number
  nextEnemyId: number
  nextProjectileId: number
  heroX: number
  heroY: number
  heroHP: number
  kills: number
  cooldown: number
  wavePause: number
  enemies: LiveEnemy[]
  projectiles: LiveProjectile[]
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
  const runtimeRef = useRef<BattleRuntime | null>(null)

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
      return [{ ...previous, summary: `Ancien équipement retiré du héros. ${previous.bonus}.` }, ...next]
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

    runtimeRef.current = {
      result,
      tick: 0,
      maxTicks: Math.max(120, Math.floor(result.survivalSeconds * 1.9)),
      wave: 1,
      nextEnemyId: 1,
      nextProjectileId: 1,
      heroX: 26,
      heroY: 54,
      heroHP: 100,
      kills: 0,
      cooldown: 0,
      wavePause: 0,
      enemies: createWaveEnemies(1, 1),
      projectiles: [],
    }

    setShowExpeditionWindow(true)
    setIsSimulating(true)
    setLastResult(null)
    setTimelineSteps(buildAnimatedTimeline(result, selectedDoctrine, 1))
    setBattle(snapshotFromRuntime(runtimeRef.current, archetype, 'Un ennemi approche', true))

    battleTimerRef.current = window.setInterval(runBattleTick, 90)
  }

  function runBattleTick() {
    const runtime = runtimeRef.current
    if (!runtime) return

    runtime.tick += 1
    const progress = Math.min(1, runtime.tick / runtime.maxTicks)
    const elapsedSeconds = Math.round(runtime.result.survivalSeconds * progress)

    if (runtime.wavePause > 0) {
      runtime.wavePause -= 1
    } else {
      updateHero(runtime)
      updateEnemies(runtime)
      updateProjectiles(runtime)
      maybeShoot(runtime)
      maybeAdvanceWave(runtime)
    }

    const state: LiveBattle['state'] = runtime.heroHP <= 0 ? 'finished' : progress > 0.92 ? 'dying' : 'running'
    const floatingText = getFloatingText(runtime, progress)

    setBattle(snapshotFromRuntime(runtime, archetype, floatingText, runtime.tick % 3 === 0, state, elapsedSeconds))
    setTimelineSteps(updateTimelineStates(runtime))

    const forcedEnd = progress >= 1 && runtime.heroHP > 0
    if (forcedEnd) {
      runtime.heroHP = 0
    }

    if (runtime.heroHP <= 0 || progress >= 1) {
      clearAllTimers()
      finalizeRun(runtime.result, runtime.kills, runtime.wave)
    }
  }

  function updateHero(runtime: BattleRuntime) {
    const target = getPrimaryTarget(runtime.enemies)
    if (!target) return

    const preferredDistance = archetype === 'Guerrier' ? 12 : archetype === 'Mage' ? 26 : 22
    const dx = target.x - runtime.heroX
    const dy = target.y - runtime.heroY
    const distance = Math.max(1, Math.hypot(dx, dy))
    const moveSpeed = 0.9 + totalStats.mobility * 0.03

    if (distance > preferredDistance + 2) {
      runtime.heroX += (dx / distance) * moveSpeed
      runtime.heroY += (dy / distance) * moveSpeed * 0.55
    } else if (distance < preferredDistance - 4) {
      runtime.heroX -= (dx / distance) * moveSpeed * 0.8
      runtime.heroY -= (dy / distance) * moveSpeed * 0.45
    }

    runtime.heroX = clamp(runtime.heroX, 14, 72)
    runtime.heroY = clamp(runtime.heroY, 18, 84)
  }

  function updateEnemies(runtime: BattleRuntime) {
    const heroThreat = archetype === 'Guerrier' ? 3.4 : 2.6

    runtime.enemies = runtime.enemies
      .map((enemy) => {
        const dx = runtime.heroX - enemy.x
        const dy = runtime.heroY - enemy.y
        const distance = Math.max(1, Math.hypot(dx, dy))
        const speed = enemy.speed + runtime.wave * 0.02
        const nextX = enemy.x + (dx / distance) * speed
        const nextY = enemy.y + (dy / distance) * speed
        let hp = enemy.hp

        if (distance < enemy.size * 0.13 + heroThreat) {
          runtime.heroHP = Math.max(0, runtime.heroHP - (0.55 + runtime.wave * 0.08))
          hp -= archetype === 'Guerrier' ? 2.4 : 0
        }

        return {
          ...enemy,
          x: nextX,
          y: nextY,
          hp,
        }
      })
      .filter((enemy) => {
        if (enemy.hp <= 0) {
          runtime.kills += 1
          return false
        }
        return true
      })
  }

  function maybeShoot(runtime: BattleRuntime) {
    if (runtime.cooldown > 0) {
      runtime.cooldown -= 1
      return
    }

    const target = getPrimaryTarget(runtime.enemies)
    if (!target) return

    const dx = target.x - runtime.heroX
    const dy = target.y - runtime.heroY
    const distance = Math.max(1, Math.hypot(dx, dy))
    const projectileSpeed = archetype === 'Archer' ? 3.8 : archetype === 'Mage' ? 3.3 : 4.1

    if (distance < 42) {
      runtime.projectiles.push({
        id: `proj-${runtime.nextProjectileId++}`,
        x: runtime.heroX,
        y: runtime.heroY,
        vx: (dx / distance) * projectileSpeed,
        vy: (dy / distance) * projectileSpeed,
      })
      runtime.cooldown = archetype === 'Archer' ? 4 : archetype === 'Mage' ? 6 : 5
    }
  }

  function updateProjectiles(runtime: BattleRuntime) {
    const nextProjectiles: LiveProjectile[] = []

    for (const projectile of runtime.projectiles) {
      const moved = {
        ...projectile,
        x: projectile.x + projectile.vx,
        y: projectile.y + projectile.vy,
      }

      let hit = false
      for (const enemy of runtime.enemies) {
        const distance = Math.hypot(moved.x - enemy.x, moved.y - enemy.y)
        if (distance < enemy.size * 0.16 + 1.6) {
          enemy.hp -= getProjectileDamage(totalStats.power, archetype)
          hit = true
          break
        }
      }

      if (!hit && moved.x >= 0 && moved.x <= 105 && moved.y >= 0 && moved.y <= 105) {
        nextProjectiles.push(moved)
      }
    }

    runtime.projectiles = nextProjectiles
  }

  function maybeAdvanceWave(runtime: BattleRuntime) {
    if (runtime.enemies.length > 0) return

    if (runtime.wave >= runtime.result.stageReached) {
      runtime.heroHP = 0
      return
    }

    runtime.wave += 1
    runtime.wavePause = 7
    runtime.cooldown = 0
    runtime.projectiles = []
    runtime.enemies = createWaveEnemies(runtime.wave, runtime.nextEnemyId)
    runtime.nextEnemyId += runtime.enemies.length
    setTimelineSteps(buildAnimatedTimeline(runtime.result, selectedDoctrine, runtime.wave))
  }

  function finalizeRun(baseResult: ExpeditionResult, liveKills: number, liveWave: number) {
    const result: ExpeditionResult = {
      ...baseResult,
      kills: Math.max(liveKills, baseResult.kills),
      stageReached: Math.max(liveWave, baseResult.stageReached),
      lines: [
        `${archetype} lancé avec la doctrine ${selectedDoctrine.name}`,
        `${Math.max(liveKills, baseResult.kills)} ennemis réellement éliminés`,
        `Vague ${Math.max(liveWave, baseResult.stageReached)} atteinte — survie ${formatDuration(baseResult.survivalSeconds)}`,
        `Butin trouvé: ${baseResult.loot.name} (${baseResult.loot.rarity})`,
        `Récompenses: +${baseResult.goldEarned} or, +${baseResult.shardsEarned} éclats`,
      ],
    }

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

    setBattle((current) =>
      current
        ? {
            ...current,
            heroHP: 0,
            attackFlash: false,
            floatingText: 'Défaite',
            state: 'finished',
          }
        : current,
    )

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
              Monte ton build, choisis une doctrine, puis envoie ton héros survivre vague après vague.
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
            <p className="muted-copy">Le build influence vraiment la cadence, la portée et la survie.</p>
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
            <p className="muted-copy">Le combat progresse maintenant par vraies vagues 1, puis 2, puis 3, etc.</p>
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
                    <span>Vague {lastResult.stageReached}</span>
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
                  <p>Lance une expédition pour voir un vrai focus cible par cible.</p>
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
                    <span>Vague {battle.wave}</span>
                    <span>Doctrine {selectedDoctrine.name}</span>
                  </div>
                </div>

                <div className="battle-stats-box glass">
                  <div className="bar-header"><span>Vie</span><strong>{Math.max(0, Math.round(battle.heroHP))}%</strong></div>
                  <div className="progress-track"><div className="progress-fill hp" style={{ width: `${Math.max(0, battle.heroHP)}%` }}></div></div>
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

function snapshotFromRuntime(
  runtime: BattleRuntime,
  archetype: Archetype,
  floatingText: string,
  attackFlash: boolean,
  state: LiveBattle['state'] = 'running',
  elapsedSeconds = 0,
): LiveBattle {
  return {
    heroX: runtime.heroX,
    heroY: runtime.heroY,
    heroHP: runtime.heroHP,
    heroFacing: ((getPrimaryTarget(runtime.enemies)?.x ?? 100) > runtime.heroX ? 'right' : 'left'),
    attackFlash,
    elapsedLabel: formatDuration(elapsedSeconds),
    kills: runtime.kills,
    wave: runtime.wave,
    enemies: runtime.enemies.map((enemy) => ({ ...enemy })),
    projectiles: runtime.projectiles.map((projectile) => ({ ...projectile })),
    floatingText:
      state === 'finished'
        ? 'Défaite'
        : archetype === 'Guerrier' && attackFlash
          ? 'Impact'
          : floatingText,
    state,
  }
}

function getPrimaryTarget(enemies: LiveEnemy[]) {
  return [...enemies].sort((a, b) => a.x - b.x)[0]
}

function getFloatingText(runtime: BattleRuntime, progress: number) {
  if (runtime.wavePause > 0) return `Vague ${runtime.wave} en approche`
  if (progress < 0.15) return 'Ouverture du combat'
  if (runtime.enemies.length === 1) return 'Duel'
  if (runtime.enemies.length === 2) return 'Double menace'
  if (runtime.enemies.length >= 3) return `Pression x${runtime.enemies.length}`
  return 'Nettoyage'
}

function updateTimelineStates(runtime: BattleRuntime): TimelineStep[] {
  return buildAnimatedTimeline(runtime.result, doctrines[0], runtime.wave).map((step, index, arr) => ({
    ...step,
    state: index < Math.min(runtime.wave, arr.length) - 1 ? 'done' : index === Math.min(runtime.wave, arr.length) - 1 ? 'active' : 'pending',
  })) as TimelineStep[]
}

function buildIdleTimeline(): TimelineStep[] {
  return [
    { id: 'idle-1', title: 'Chargement du héros', detail: 'Le build attend dans le menu principal.', state: 'done' },
    { id: 'idle-2', title: 'Choix de doctrine', detail: 'Détermine le style du prochain run.', state: 'done' },
    { id: 'idle-3', title: 'Combat live', detail: 'Le prochain lancement ouvrira le combat en direct.', state: 'active' },
  ]
}

function buildAnimatedTimeline(result: ExpeditionResult, doctrine: Doctrine, wave: number): TimelineStep[] {
  return [
    { id: 'step-1', title: 'Vague 1', detail: `Premier duel sous ${doctrine.name}.`, state: wave >= 1 ? 'active' : 'pending' },
    { id: 'step-2', title: 'Vague 2', detail: 'Deux ennemis mettent la pression.', state: wave >= 2 ? 'active' : 'pending' },
    { id: 'step-3', title: 'Vague 3', detail: 'Le run devient vraiment sérieux.', state: wave >= 3 ? 'active' : 'pending' },
    { id: 'step-4', title: 'Vagues hautes', detail: `Objectif actuel: atteindre la vague ${result.stageReached}.`, state: wave >= 4 ? 'active' : 'pending' },
    { id: 'step-5', title: 'Chute', detail: result.doctrineImpact, state: 'pending' },
  ]
}

function createWaveEnemies(wave: number, startIndex: number): LiveEnemy[] {
  const count = Math.min(6, wave)
  return Array.from({ length: count }, (_, index) => ({
    id: `enemy-${startIndex + index}`,
    x: 78 + index * 6,
    y: 24 + ((index * 21 + wave * 7) % 44),
    size: 34 + (index % 3) * 8,
    hp: 52 + wave * 16 + index * 10,
    maxHp: 52 + wave * 16 + index * 10,
    speed: 0.34 + wave * 0.03 + index * 0.02,
  }))
}

function getProjectileDamage(power: number, archetype: Archetype) {
  if (archetype === 'Guerrier') return 26 + power * 0.9
  if (archetype === 'Archer') return 20 + power * 0.72
  return 24 + power * 0.82
}

function stripSummary(item: InventoryItem): EquippedItem {
  const { summary, ...equippedItem } = item
  void summary
  return equippedItem
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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
      `Vague ${stageReached} atteinte — survie ${formatDuration(survivalSeconds)}`,
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
