export default function Documentation() {
  return (
    <div className="module-layout">
      <div className="module-hero">
        <h1 className="hero-title">Documentation</h1>
        <p className="hero-sub">Guide méthodologique et technique de l'application.</p>
      </div>

      <div className="doc-grid">
        <section className="glass doc-card">
          <h2 className="doc-section-title">◎ Module A — Explorateur ETF</h2>
          <p>
            Recherchez les ETF disponibles depuis la base de données locale, enrichie via
            <code>yfinance</code>. Les cours historiques sont mis en cache 24h pour limiter les
            appels API. Trois périodes sont disponibles : 1 an, 3 ans, 10 ans.
          </p>
          <ul>
            <li><strong>GET /etf/</strong> — recherche par ticker, nom ou indice</li>
            <li><strong>GET /etf/{'{ticker}'}/historique?period=1y</strong> — OHLCV + adj_close</li>
            <li><strong>GET /etf/{'{ticker}'}</strong> — métadonnées ETF</li>
          </ul>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">◈ Module B — Simulateur DCA</h2>
          <p>
            Le <em>Dollar-Cost Averaging</em> (investissement programmé) consiste à investir
            un montant fixe chaque mois, quel que soit le prix. Cette stratégie réduit
            l'impact de la volatilité.
          </p>
          <h3>Algorithme DCA</h3>
          <ul>
            <li>Mois 0 : achat avec <code>capital_initial + versement_mensuel</code></li>
            <li>Chaque mois suivant : achat au prix de clôture du dernier jour ouvré</li>
            <li>TER appliqué mensuellement : <code>valeur_nette = valeur_brute × (1 − TER/12)</code></li>
            <li>Référence Livret A calculée au taux nominal annuel de 3%</li>
          </ul>
          <h3>Métriques calculées</h3>
          <ul>
            <li><strong>CAGR</strong> — taux de croissance annuel composé</li>
            <li><strong>Gain net</strong> — valeur nette finale − capital total investi</li>
          </ul>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">◇ Module C — Régression OLS</h2>
          <p>
            La régression linéaire ordinaire (OLS) modélise la tendance long-terme d'un ETF :
            <code>Prix = β₀ + β₁ × t + ε</code>
          </p>
          <h3>Indicateurs statistiques</h3>
          <ul>
            <li><strong>R²</strong> — proportion de la variance expliquée par le modèle</li>
            <li><strong>p-valeur</strong> — probabilité d'observer β₁ si la tendance est nulle</li>
            <li><strong>Durbin-Watson</strong> — détection d'autocorrélation des résidus (≈2 = OK)</li>
            <li><strong>IC 95%</strong> — intervalle de confiance à 95% de la droite OLS</li>
          </ul>
          <h3>Limites importantes</h3>
          <p>
            Une tendance passée ne prédit pas l'avenir. La régression linéaire ignore la
            non-linéarité, les cycles économiques et les chocs externes. Ce module est
            strictement éducatif et ne constitue pas un conseil en investissement.
          </p>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">⚙ Architecture technique</h2>
          <table className="data-table">
            <thead>
              <tr><th>Couche</th><th>Technologie</th></tr>
            </thead>
            <tbody>
              <tr><td>API Backend</td><td>Python 3.11 + FastAPI</td></tr>
              <tr><td>Base de données</td><td>PostgreSQL 16 + SQLAlchemy 2</td></tr>
              <tr><td>Données marché</td><td>yfinance ≥ 1.3</td></tr>
              <tr><td>Statistiques</td><td>statsmodels, scikit-learn</td></tr>
              <tr><td>Frontend</td><td>React 18 + Vite + TypeScript</td></tr>
              <tr><td>Graphiques</td><td>Recharts + SVG custom</td></tr>
              <tr><td>Tests</td><td>pytest (22 tests)</td></tr>
            </tbody>
          </table>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">⚠ Avertissement légal</h2>
          <p>
            Cette application est réalisée dans le cadre du module <em>Projet DATA</em> (M2 MIAGE,
            Université Paris-Saclay, encadrant : Nicolas LEGEAY). Elle utilise exclusivement des
            données historiques réelles provenant de Yahoo Finance.
          </p>
          <p>
            <strong>Les résultats de simulation et les projections ne constituent pas un conseil
            en investissement.</strong> Les performances passées ne présagent pas des performances futures.
          </p>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">ETF disponibles</h2>
          <table className="data-table">
            <thead>
              <tr><th>Ticker</th><th>Indice</th><th>TER</th><th>PEA</th></tr>
            </thead>
            <tbody>
              <tr><td>CW8.PA</td><td>MSCI World</td><td>0.25%</td><td>Oui</td></tr>
              <tr><td>RS2K.PA</td><td>Russell 2000</td><td>0.35%</td><td>Oui</td></tr>
              <tr><td>ESE.PA</td><td>S&amp;P 500 ESG</td><td>0.15%</td><td>Oui</td></tr>
              <tr><td>OBLI.PA</td><td>Euro Govt Bond</td><td>0.14%</td><td>Non</td></tr>
              <tr><td>PANX.PA</td><td>Nasdaq-100</td><td>0.30%</td><td>Oui</td></tr>
              <tr><td>PAEEM.PA</td><td>MSCI EM</td><td>0.45%</td><td>Oui</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
