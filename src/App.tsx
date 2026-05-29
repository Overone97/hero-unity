import { useMemo, useState } from 'react'
import './App.css'
import { APP_NAME, APP_TAGLINE } from './config/app'
import {
  equippedItems,
  expeditionEvents,
  inventoryItems,
  playerProfile,
  stats,
} from './data/prototype'

function App() {
  const [selectedItemId, setSelectedItemId] = useState(inventoryItems[0]?.id ?? '')

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedItemId) ?? inventoryItems[0],
    [selectedItemId],
  )

  return (
    <main className="shell">
      <div className="hud-version">v{__APP_VERSION__}</div>

      <section className="hero-panel glass">
        <div className="hero-copy">
          <p className="eyebrow">Hub joueur — prototype jouable</p>
          <h1>{APP_NAME}</h1>
          <p className="pitch">{APP_TAGLINE}</p>

          <div className="hero-actions">
            <button type="button" className="primary-button">
              Lancer l’expédition
            </button>
            <button type="button" className="secondary-button">
              Voir le classement
            </button>
          </div>
        </div>

        <div className="account-card glass-dark">
          <div className="account-header">
            <div className="account-avatar">
              <span>{playerProfile.heroName.slice(0, 1)}</span>
            </div>
            <div>
              <span className="label">Compte joueur</span>
              <strong>{playerProfile.name}</strong>
              <p>{playerProfile.title}</p>
            </div>
          </div>

          <div className="account-metrics">
            <div>
              <span className="label">Rang</span>
              <strong>{playerProfile.rank}</strong>
            </div>
            <div>
              <span className="label">Meilleure survie</span>
              <strong>{playerProfile.bestSurvival}</strong>
            </div>
            <div>
              <span className="label">Or</span>
              <strong>{playerProfile.gold}</strong>
            </div>
            <div>
              <span className="label">Éclats</span>
              <strong>{playerProfile.shards}</strong>
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
                {playerProfile.heroName}, niveau {playerProfile.level}
              </h2>
            </div>

            <div className="hero-summary">
              <div>
                <span className="label">Zone favorite</span>
                <strong>{playerProfile.region}</strong>
              </div>
              <div>
                <span className="label">Doctrine active</span>
                <strong>{playerProfile.doctrine}</strong>
              </div>
            </div>

            <div className="stats-grid stats-grid-four">
              {stats.map((stat) => (
                <div key={stat.label} className={`stat-card ${stat.accent}`}>
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
              {expeditionEvents.map((entry) => (
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
              Ici, on construit la classe du perso sans écran de sélection figé. Le stuff décide.
            </p>
          </div>

          <div className="equipment-grid">
            {equippedItems.map((item) => (
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

        <section className="panel glass inventory-panel">
          <div className="panel-heading-row">
            <div className="section-title">
              <span className="badge">Inventaire</span>
              <h2>Loot disponible</h2>
            </div>
            <p className="muted-copy">Clique un objet pour voir ce qu’il apporterait au build.</p>
          </div>

          <div className="inventory-layout">
            <div className="inventory-list">
              {inventoryItems.map((item) => {
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
                <button type="button" className="primary-button full-width">
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

function normalizeRarity(rarity: string) {
  return rarity
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export default App
