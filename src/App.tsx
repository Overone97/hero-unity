import './App.css'
import { APP_NAME, APP_TAGLINE } from './config/app'
import { loadout, stats, timeline } from './data/prototype'

function App() {
  return (
    <main className="shell">
      <div className="hud-version">v{__APP_VERSION__}</div>

      <section className="hero-panel glass">
        <div className="hero-copy">
          <p className="eyebrow">Prototype fondateur</p>
          <h1>{APP_NAME}</h1>
          <p className="pitch">{APP_TAGLINE}</p>
        </div>

        <div className="hero-status">
          <div>
            <span className="label">Héros actif</span>
            <strong>Lys, niveau 1</strong>
          </div>
          <div>
            <span className="label">Doctrine</span>
            <strong>Kite agressif</strong>
          </div>
          <button type="button" className="primary-button">
            Lancer l’expédition
          </button>
        </div>
      </section>

      <section className="content-grid">
        <aside className="left-column">
          <article className="panel glass character-card">
            <div className="section-title">
              <span className="badge">Build</span>
              <h2>Identité par l’équipement</h2>
            </div>

            <div className="stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className={`stat-card ${stat.accent}`}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </div>

            <div className="loadout-list">
              {loadout.map((item) => (
                <div key={item.slot} className="loadout-row">
                  <div>
                    <span className="label">{item.slot}</span>
                    <strong>{item.name}</strong>
                  </div>
                  <span className="chip">{item.tag}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel glass roadmap-card">
            <div className="section-title">
              <span className="badge badge-soft">Roadmap</span>
              <h2>Ce qu’on pose dès la V1</h2>
            </div>
            <ul>
              <li>Compte joueur + sauvegarde de build</li>
              <li>Expédition auto avec simulation lisible</li>
              <li>Loot orienté archétypes d’armes</li>
              <li>Version visible en jeu à chaque PR</li>
            </ul>
          </article>
        </aside>

        <section className="panel battle-panel glass" aria-label="Aperçu de l’expédition">
          <div className="battle-header">
            <div>
              <span className="badge badge-hot">Expédition live</span>
              <h2>Ruines d’ambre — difficulté I</h2>
            </div>
            <div className="battle-meta">
              <span>Survie estimée · 03:42</span>
              <span>Placement · Très bon</span>
            </div>
          </div>

          <div className="battlefield">
            <div className="aura aura-one"></div>
            <div className="aura aura-two"></div>
            <div className="grid-overlay"></div>
            <div className="hero-avatar">
              <div className="staff"></div>
              <div className="hero-core"></div>
              <div className="hero-shadow"></div>
            </div>
            <div className="enemy enemy-one"></div>
            <div className="enemy enemy-two"></div>
            <div className="enemy enemy-three"></div>
            <div className="projectile projectile-one"></div>
            <div className="projectile projectile-two"></div>
          </div>

          <div className="timeline-card">
            {timeline.map((entry) => (
              <div key={entry} className="timeline-row">
                <span className="timeline-dot"></span>
                <p>{entry}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
