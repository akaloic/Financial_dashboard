# docs/MODULE_A.md — Module A : Explorateur d'ETF

## Objectif

Permettre à l'utilisateur de rechercher un ETF par nom ou ticker, d'afficher sa fiche descriptive complète, son graphique de cours interactif et de comparer deux ETF côte à côte.

---

## Fonctionnalités détaillées

### A1 — Recherche d'ETF
- Champ de saisie texte libre (ticker ou nom partiel)
- Autocomplétion sur les ETF disponibles en BDD (GET /etf/?search=...)
- ETF minimaux disponibles : CW8.PA, RS2K.PA, ESE.PA, OBLI.PA

### A2 — Fiche descriptive
Affichage pour un ETF donné :
- Nom complet
- Ticker (code bourse)
- Indice de référence
- Gestionnaire (société de gestion)
- TER (Total Expense Ratio) en %
- Éligibilité PEA (Oui / Non)
- Devise
- Dernière date de mise à jour des cours

### A3 — Graphique interactif du cours
- Sélecteur de période : **1 an / 3 ans / 10 ans**
- Graphique linéaire du prix ajusté (`adj_close`)
- Axe X = dates, Axe Y = prix en euros
- Tooltip avec date et prix précis au survol
- Données source : `adj_close` de yfinance

### A4 — Comparaison de deux ETF
- Sélection de deux ETF (deux champs de recherche)
- Graphique superposé (normalisé à base 100 au départ)
- Tableau récapitulatif : TER, performance 1 an, performance 3 ans, éligibilité PEA

---

## Endpoints concernés (voir docs/API.md)

| Méthode | Route | Usage |
|---|---|---|
| GET | `/etf/` | Liste + recherche |
| GET | `/etf/{ticker}` | Fiche descriptive |
| GET | `/etf/{ticker}/historique` | Cours historique (avec param `period`) |

---

## Composants React attendus

```
src/pages/ModuleA/
├── ModuleAPage.tsx          ← page principale avec routing interne
├── SearchBar.tsx            ← champ de recherche + autocomplétion
├── ETFCard.tsx              ← fiche descriptive (nom, TER, PEA...)
├── PriceChart.tsx           ← graphique Recharts/Plotly cours historique
├── PeriodSelector.tsx       ← boutons 1an / 3ans / 10ans
└── CompareETF.tsx           ← vue comparaison côte à côte (graphique + tableau)
```

### Exemple de code — PriceChart.tsx (Recharts)
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PriceChartProps {
  data: { date: string; adj_close: number }[];
  ticker: string;
}

export const PriceChart = ({ data, ticker }: PriceChartProps) => (
  <ResponsiveContainer width="100%" height={350}>
    <LineChart data={data}>
      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
      <YAxis domain={['auto', 'auto']} />
      <Tooltip formatter={(v: number) => [`${v.toFixed(2)} €`, ticker]} />
      <Line type="monotone" dataKey="adj_close" stroke="#2563eb" dot={false} strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);
```

---

## Données yfinance à récupérer

```python
import yfinance as yf

ticker = yf.Ticker("CW8.PA")

# Historique de cours
hist = ticker.history(period="10y")  # colonnes: Open, High, Low, Close, Volume, Dividends, Stock Splits
# Utiliser 'Close' ajusté (yfinance l'ajuste automatiquement)

# Infos (optionnel, souvent incomplet pour ETF européens)
info = ticker.info  # longName, currency, etc.
```

> **Attention** : les métadonnées (TER, gestionnaire, éligibilité PEA) ne sont pas disponibles via yfinance pour les ETF européens. Les stocker dans `etf_metadata.csv` :

```csv
ticker,nom,indice,gestionnaire,ter,eligible_pea,devise
CW8.PA,Amundi MSCI World,MSCI World,Amundi,0.0012,true,EUR
RS2K.PA,Amundi Russell 2000,Russell 2000,Amundi,0.0023,true,EUR
ESE.PA,Amundi S&P 500 ESG,S&P 500 ESG,Amundi,0.0015,true,EUR
OBLI.PA,Lyxor Euro Govt Bond,Bloomberg Euro Govt Bond,Lyxor,0.0014,true,EUR
```

---

## Critères d'évaluation liés à ce module

- **Application fonctionnelle (6 pts)** : fiche ETF affichée avec de vraies données, graphique interactif opérationnel.
- **Interface (2 pts)** : graphiques interactifs, navigation fluide, responsive.

## Erreurs fréquentes à éviter

- Utiliser `Close` brut au lieu de `Adj Close` → toujours prendre la colonne ajustée.
- Normaliser base 100 pour la comparaison : `(prix / prix[0]) * 100`.
- Ne pas afficher "données indisponibles" sans message explicite à l'utilisateur.
- Stocker les métadonnées en dur dans le code → utiliser le CSV ou la BDD.
