import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// Système FR/EN léger : le FRANÇAIS est la source (clés = chaînes FR du code).
// EN[fr] fournit la traduction ; clé absente → retombe sur le FR. Les contenus
// de données (tickers, indices) ne sont pas traduits — seul l'habillage UI l'est.
export type Lang = "fr" | "en";

const EN: Record<string, string> = {
  // ---- Shell ----
  Portefeuille: "Portfolio",
  Passif: "Passive",
  "Vue d'ensemble": "Overview",
  Explorer: "Explore",
  "Simulateur DCA": "DCA Simulator",
  "Régression OLS": "OLS Regression",
  Documentation: "Documentation",
  // ---- ApiBanner ----
  "API connectée": "API connected",
  "API ?": "API ?",
  "Connexion à l'API…": "Connecting to API…",
  "Backend non connecté.": "Backend not connected.",
  "Colle l'URL de ton API déployée (Render / Hugging Face) pour activer les calculs.":
    "Paste your deployed API URL (Render / Hugging Face) to enable computations.",
  Connecter: "Connect",
  Ignorer: "Dismiss",
  // ---- périodes ----
  "1 an": "1Y",
  "3 ans": "3Y",
  "10 ans": "10Y",
  Max: "Max",
  // ---- Overview ----
  "Données réelles": "Real data",
  indices: "indices",
  "10 ans d'historique": "10-year history",
  "Investis passivement.": "Invest passively.",
  "Décide avec des données.": "Decide with data.",
  "Explore les ETF, backteste ta stratégie d'investissement programmé et analyse les tendances, sur des cours réels, gratuitement. Sans jargon, sans frais cachés.":
    "Explore ETFs, backtest your recurring-investment strategy and analyze trends, on real prices, for free. No jargon, no hidden fees.",
  "Simuler mon investissement": "Simulate my investment",
  "Explorer les ETF": "Explore ETFs",
  "MSCI World · 10 ans": "MSCI World · 10 years",
  "TER à partir de": "TER from",
  "Enveloppe éligible": "Eligible wrapper",
  "Les marchés en un coup d'œil": "Markets at a glance",
  "Tout explorer": "Explore all",
  "Tes outils": "Your tools",
  Ouvrir: "Open",
  "Recherche, fiche détaillée et historique de cours sur 1 / 3 / 10 ans.":
    "Search, detailed sheet and price history over 1 / 3 / 10 years.",
  "Backteste un investissement programmé et compare au Livret A, avec profil de risque.":
    "Backtest a recurring investment and compare to a savings account, with a risk profile.",
  "Tendance linéaire, R², Durbin-Watson et projection, avec les bons avertissements.":
    "Linear trend, R², Durbin-Watson and projection, with the right caveats.",
  // ---- ETF Explorer ----
  "Recherchez, comparez et analysez les ETF disponibles sur Euronext Paris.":
    "Search, compare and analyze ETFs available on Euronext Paris.",
  "Rechercher par ticker, nom, indice…": "Search by ticker, name, index…",
  "Aucun ETF trouvé pour": "No ETF found for",
  Gestionnaire: "Manager",
  Indice: "Index",
  TER: "TER",
  "Éligible PEA": "PEA eligible",
  Devise: "Currency",
  "Dernier cours": "Last price",
  Oui: "Yes",
  Non: "No",
  "Erreur de recherche": "Search error",
  // ---- OLS ----
  "Analyse statistique de la tendance historique d'un ETF par régression linéaire ordinaire (Ordinary Least Squares) avec intervalles de confiance à 95% et projection à 12 mois.":
    "Statistical analysis of an ETF's historical trend via ordinary least squares regression, with 95% confidence intervals and a 12-month projection.",
  "ETF analysé": "Analyzed ETF",
  "Date de début": "Start date",
  "Date de fin": "End date",
  "Calcul…": "Computing…",
  Analyser: "Analyze",
  "Sélectionnez un ETF et une période, puis lancez l'analyse.":
    "Select an ETF and a period, then run the analysis.",
  "⚠ Avertissement statistique :": "⚠ Statistical warning:",
  "R² (coefficient de détermination)": "R² (coefficient of determination)",
  "Qualité :": "Quality:",
  Excellent: "Excellent",
  Modéré: "Moderate",
  Faible: "Weak",
  "p-valeur (significativité)": "p-value (significance)",
  "Significatif (< 0.05)": "Significant (< 0.05)",
  "Non significatif": "Not significant",
  "β₁ (tendance journalière)": "β₁ (daily trend)",
  "Autocorrélation résidus (cible: ~2)": "Residual autocorrelation (target: ~2)",
  "Erreur standard": "Standard error",
  observations: "observations",
  "β₀ (constante)": "β₀ (constant)",
  "Intercept OLS": "OLS intercept",
  "Droite de régression + IC 95% + Projection 12M": "Regression line + 95% CI + 12M projection",
  Résidus: "Residuals",
  "Les résidus doivent être aléatoirement distribués autour de zéro sans structure. Un motif systématique indique une hétéroscédasticité.":
    "Residuals should be randomly distributed around zero without structure. A systematic pattern indicates heteroscedasticity.",
  "Erreur de régression": "Regression error",
  // ---- DCA ----
  "Simulez une stratégie d'investissement programmé mensuel (Dollar-Cost Averaging) en backtesting sur données réelles.":
    "Backtest a monthly recurring-investment strategy (Dollar-Cost Averaging) on real data.",
  Paramètres: "Parameters",
  "ETF cible": "Target ETF",
  "Capital initial": "Initial capital",
  "Versement mensuel": "Monthly contribution",
  "TER appliqué :": "TER applied:",
  "/an (prélevé mensuellement)": "/yr (charged monthly)",
  "Calcul en cours…": "Computing…",
  "Lancer la simulation": "Run the simulation",
  "Configurez vos paramètres et lancez la simulation pour voir les résultats.":
    "Configure your parameters and run the simulation to see the results.",
  "Valeur finale nette": "Final net value",
  "de gain net": "net gain",
  "Capital investi": "Invested capital",
  versements: "contributions",
  "Gain net": "Net gain",
  "CAGR net": "Net CAGR",
  "Profil de risque de l'actif": "Asset risk profile",
  Risque: "Risk",
  faible: "low",
  modéré: "moderate",
  élevé: "high",
  "très élevé": "very high",
  indéterminé: "undetermined",
  "Volatilité (annualisée)": "Volatility (annualized)",
  "Ratio de Sharpe": "Sharpe ratio",
  "rendement / risque": "return / risk",
  "Ratio de Sortino": "Sortino ratio",
  "risque baissier": "downside risk",
  "pire pic → creux": "worst peak → trough",
  "Meilleur mois": "Best month",
  "Pire mois": "Worst month",
  "▲ Masquer le tableau détaillé": "▲ Hide detailed table",
  "▼ Voir le tableau détaillé": "▼ Show detailed table",
  Mois: "Month",
  Date: "Date",
  "Prix clôture": "Close price",
  "Parts achetées": "Shares bought",
  "Parts cumulées": "Cumulative shares",
  "Valeur brute": "Gross value",
  "Valeur nette": "Net value",
  "Erreur de simulation": "Simulation error",
  // ---- Documentation ----
  "Guide méthodologique et technique de l'application.": "Methodological and technical guide to the application.",
  "◎ Module A · Explorateur ETF": "◎ Module A · ETF Explorer",
  "Recherchez les ETF disponibles depuis la base de données locale, enrichie via":
    "Search the ETFs available in the local database, enriched via",
  "Les cours historiques sont mis en cache 24h pour limiter les appels API. Trois périodes sont disponibles : 1 an, 3 ans, 10 ans.":
    "Historical prices are cached for 24h to limit API calls. Three periods are available: 1 year, 3 years, 10 years.",
  ": recherche par ticker, nom ou indice": ": search by ticker, name or index",
  ": OHLCV + adj_close": ": OHLCV + adj_close",
  ": métadonnées ETF": ": ETF metadata",
  "◈ Module B · Simulateur DCA": "◈ Module B · DCA Simulator",
  "(investissement programmé) consiste à investir un montant fixe chaque mois, quel que soit le prix. Cette stratégie réduit l'impact de la volatilité.":
    "(recurring investment) means investing a fixed amount every month, whatever the price. This strategy reduces the impact of volatility.",
  "Algorithme DCA": "DCA algorithm",
  "Mois 0 : achat avec": "Month 0: buy with",
  "Chaque mois suivant : achat au prix de clôture du dernier jour ouvré":
    "Each following month: buy at the closing price of the last business day",
  "TER appliqué mensuellement :": "TER charged monthly:",
  "Référence Livret A calculée au taux nominal annuel de 3%":
    "Livret A benchmark computed at a 3% nominal annual rate",
  "Métriques calculées": "Computed metrics",
  ": taux de croissance annuel composé": ": compound annual growth rate",
  ": valeur nette finale − capital total investi": ": final net value − total invested capital",
  "◇ Module C · Régression OLS": "◇ Module C · OLS Regression",
  "La régression linéaire ordinaire (OLS) modélise la tendance long-terme d'un ETF :":
    "Ordinary least squares (OLS) regression models the long-term trend of an ETF:",
  "Indicateurs statistiques": "Statistical indicators",
  ": proportion de la variance expliquée par le modèle": ": share of the variance explained by the model",
  ": probabilité d'observer β₁ si la tendance est nulle": ": probability of observing β₁ if the trend is zero",
  ": détection d'autocorrélation des résidus (≈2 = OK)": ": residual autocorrelation detection (≈2 = OK)",
  ": intervalle de confiance à 95% de la droite OLS": ": 95% confidence interval of the OLS line",
  "Limites importantes": "Important limitations",
  "Une tendance passée ne prédit pas l'avenir. La régression linéaire ignore la non-linéarité, les cycles économiques et les chocs externes. Ce module est strictement éducatif et ne constitue pas un conseil en investissement.":
    "A past trend does not predict the future. Linear regression ignores non-linearity, economic cycles and external shocks. This module is strictly educational and does not constitute investment advice.",
  "⚙ Architecture technique": "⚙ Technical architecture",
  Couche: "Layer",
  Technologie: "Technology",
  "API Backend": "Backend API",
  "Base de données": "Database",
  "Données marché": "Market data",
  Statistiques: "Statistics",
  Frontend: "Frontend",
  Graphiques: "Charts",
  Tests: "Tests",
  "pytest (22 tests)": "pytest (22 tests)",
  "⚠ Avertissement légal": "⚠ Legal disclaimer",
  "Cette application est réalisée dans le cadre du module": "This application is built as part of the",
  "(M2 MIAGE, Université Paris-Saclay, encadrant : Nicolas LEGEAY). Elle utilise exclusivement des données historiques réelles provenant de Yahoo Finance.":
    "module (M2 MIAGE, Université Paris-Saclay, supervisor: Nicolas LEGEAY). It uses exclusively real historical data from Yahoo Finance.",
  "Les résultats de simulation et les projections ne constituent pas un conseil en investissement.":
    "Simulation results and projections do not constitute investment advice.",
  "Les performances passées ne présagent pas des performances futures.":
    "Past performance is no guarantee of future results.",
  "ETF disponibles": "Available ETFs",
  Le: "The",
  Ticker: "Ticker",
  PEA: "PEA",
  Language: "Language",
};

function detect(): Lang {
  try {
    const s = localStorage.getItem("finsight_lang");
    if (s === "fr" || s === "en") return s;
  } catch {
    /* ignore */
  }
  return typeof navigator !== "undefined" && !navigator.language?.toLowerCase().startsWith("fr") ? "en" : "fr";
}

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "fr", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("finsight_lang", l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
  }, []);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

export function useT() {
  const { lang } = useContext(LangCtx);
  return useCallback((fr: string) => (lang === "en" ? EN[fr] ?? fr : fr), [lang]);
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang" role="group" aria-label="Language">
      <span className="lang__slider" data-lang={lang} aria-hidden="true" />
      {(["fr", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          className={`lang__btn${lang === l ? " is-active" : ""}`}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
