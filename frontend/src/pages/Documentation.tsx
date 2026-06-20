import { useT } from "../i18n";

export default function Documentation() {
  const t = useT();
  return (
    <div className="module-layout">
      <div className="module-hero">
        <h1 className="hero-title">{t("Documentation")}</h1>
        <p className="hero-sub">{t("Guide méthodologique et technique de l'application.")}</p>
      </div>

      <div className="doc-grid">
        <section className="glass doc-card">
          <h2 className="doc-section-title">{t("◎ Module A · Explorateur ETF")}</h2>
          <p>
            {t("Recherchez les ETF disponibles depuis la base de données locale, enrichie via")}{" "}
            <code>yfinance</code>.{" "}
            {t("Les cours historiques sont mis en cache 24h pour limiter les appels API. Trois périodes sont disponibles : 1 an, 3 ans, 10 ans.")}
          </p>
          <ul>
            <li><strong>GET /etf/</strong>{t(": recherche par ticker, nom ou indice")}</li>
            <li><strong>GET /etf/{'{ticker}'}/historique?period=1y</strong>{t(": OHLCV + adj_close")}</li>
            <li><strong>GET /etf/{'{ticker}'}</strong>{t(": métadonnées ETF")}</li>
          </ul>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">{t("◈ Module B · Simulateur DCA")}</h2>
          <p>
            {t("Le")} <em>Dollar-Cost Averaging</em>{" "}
            {t("(investissement programmé) consiste à investir un montant fixe chaque mois, quel que soit le prix. Cette stratégie réduit l'impact de la volatilité.")}
          </p>
          <h3>{t("Algorithme DCA")}</h3>
          <ul>
            <li>{t("Mois 0 : achat avec")} <code>capital_initial + versement_mensuel</code></li>
            <li>{t("Chaque mois suivant : achat au prix de clôture du dernier jour ouvré")}</li>
            <li>{t("TER appliqué mensuellement :")} <code>valeur_nette = valeur_brute × (1 − TER/12)</code></li>
            <li>{t("Référence Livret A calculée au taux nominal annuel de 3%")}</li>
          </ul>
          <h3>{t("Métriques calculées")}</h3>
          <ul>
            <li><strong>CAGR</strong>{t(": taux de croissance annuel composé")}</li>
            <li><strong>{t("Gain net")}</strong>{t(": valeur nette finale − capital total investi")}</li>
          </ul>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">{t("◇ Module C · Régression OLS")}</h2>
          <p>
            {t("La régression linéaire ordinaire (OLS) modélise la tendance long-terme d'un ETF :")}{" "}
            <code>Prix = β₀ + β₁ × t + ε</code>
          </p>
          <h3>{t("Indicateurs statistiques")}</h3>
          <ul>
            <li><strong>R²</strong>{t(": proportion de la variance expliquée par le modèle")}</li>
            <li><strong>p-valeur</strong>{t(": probabilité d'observer β₁ si la tendance est nulle")}</li>
            <li><strong>Durbin-Watson</strong>{t(": détection d'autocorrélation des résidus (≈2 = OK)")}</li>
            <li><strong>IC 95%</strong>{t(": intervalle de confiance à 95% de la droite OLS")}</li>
          </ul>
          <h3>{t("Limites importantes")}</h3>
          <p>
            {t("Une tendance passée ne prédit pas l'avenir. La régression linéaire ignore la non-linéarité, les cycles économiques et les chocs externes. Ce module est strictement éducatif et ne constitue pas un conseil en investissement.")}
          </p>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">{t("⚙ Architecture technique")}</h2>
          <table className="data-table">
            <thead>
              <tr><th>{t("Couche")}</th><th>{t("Technologie")}</th></tr>
            </thead>
            <tbody>
              <tr><td>{t("API Backend")}</td><td>Python 3.11 + FastAPI</td></tr>
              <tr><td>{t("Base de données")}</td><td>PostgreSQL 16 + SQLAlchemy 2</td></tr>
              <tr><td>{t("Données marché")}</td><td>yfinance ≥ 1.3</td></tr>
              <tr><td>{t("Statistiques")}</td><td>statsmodels, scikit-learn</td></tr>
              <tr><td>{t("Frontend")}</td><td>React 18 + Vite + TypeScript</td></tr>
              <tr><td>{t("Graphiques")}</td><td>Recharts + SVG custom</td></tr>
              <tr><td>{t("Tests")}</td><td>pytest (22 tests)</td></tr>
            </tbody>
          </table>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">{t("⚠ Avertissement légal")}</h2>
          <p>
            {t("Cette application est réalisée dans le cadre du module")} <em>Projet DATA</em>{" "}
            {t("(M2 MIAGE, Université Paris-Saclay, encadrant : Nicolas LEGEAY). Elle utilise exclusivement des données historiques réelles provenant de Yahoo Finance.")}
          </p>
          <p>
            <strong>{t("Les résultats de simulation et les projections ne constituent pas un conseil en investissement.")}</strong>{" "}
            {t("Les performances passées ne présagent pas des performances futures.")}
          </p>
        </section>

        <section className="glass doc-card">
          <h2 className="doc-section-title">{t("ETF disponibles")}</h2>
          <table className="data-table">
            <thead>
              <tr><th>{t("Ticker")}</th><th>{t("Indice")}</th><th>TER</th><th>PEA</th></tr>
            </thead>
            <tbody>
              <tr><td>CW8.PA</td><td>MSCI World</td><td>0.25%</td><td>{t("Oui")}</td></tr>
              <tr><td>RS2K.PA</td><td>Russell 2000</td><td>0.35%</td><td>{t("Oui")}</td></tr>
              <tr><td>ESE.PA</td><td>S&amp;P 500 ESG</td><td>0.15%</td><td>{t("Oui")}</td></tr>
              <tr><td>OBLI.PA</td><td>Euro Govt Bond</td><td>0.14%</td><td>{t("Non")}</td></tr>
              <tr><td>PANX.PA</td><td>Nasdaq-100</td><td>0.30%</td><td>{t("Oui")}</td></tr>
              <tr><td>PAEEM.PA</td><td>MSCI EM</td><td>0.45%</td><td>{t("Oui")}</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
