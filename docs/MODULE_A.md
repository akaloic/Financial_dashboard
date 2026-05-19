# Module A — Explorateur d'ETF

Permettre à l'utilisateur de rechercher un ETF par nom ou ticker, d'afficher
sa fiche descriptive complète, son graphique de cours interactif, et de
comparer deux ETF côte à côte.

## Fonctionnalités

### A1 — Recherche d'ETF
- Champ texte libre (ticker ou nom partiel)
- Autocomplétion sur les ETF disponibles en BDD via `GET /etf/?search=...`
- ETF minimaux : CW8.PA, RS2K.PA, ESE.PA, OBLI.PA

### A2 — Fiche descriptive
Pour un ETF donné, afficher : nom complet, ticker, indice de référence,
gestionnaire, TER en %, éligibilité PEA, devise, date de dernière mise à jour
des cours.

### A3 — Graphique interactif du cours
- Sélecteur de période : 1 an / 3 ans / 10 ans
- Graphique linéaire du prix ajusté (`adj_close`)
- Axe X = dates, Axe Y = prix en euros
- Tooltip avec date et prix au survol

### A4 — Comparaison de deux ETF
- Deux champs de recherche pour sélectionner les ETF
- Graphique superposé normalisé à base 100 au départ
- Tableau récapitulatif : TER, performance 1 an, performance 3 ans, éligibilité PEA

## Endpoints utilisés

| Méthode | Route | Usage |
|---|---|---|
| GET | `/etf/` | Liste + recherche |
| GET | `/etf/{ticker}` | Fiche descriptive |
| GET | `/etf/{ticker}/historique` | Cours historique avec paramètre `period` |

## Structure des composants React

```
src/pages/ModuleA/
├── ModuleAPage.tsx       page principale avec routing interne
├── SearchBar.tsx         champ de recherche + autocomplétion
├── ETFCard.tsx           fiche descriptive (nom, TER, PEA...)
├── PriceChart.tsx        graphique Recharts/Plotly du cours
├── PeriodSelector.tsx    boutons 1an / 3ans / 10ans
└── CompareETF.tsx        vue comparaison côte à côte
```

## Exemple — PriceChart avec Recharts

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

## Récupération yfinance

```python
import yfinance as yf

ticker = yf.Ticker("CW8.PA")

# Historique de cours — colonnes : Open, High, Low, Close, Volume, Dividends, Stock Splits
hist = ticker.history(period="10y")

# Infos (souvent incomplet pour les ETF européens)
info = ticker.info
```

Les métadonnées (TER, gestionnaire, éligibilité PEA) ne sont pas disponibles
via yfinance pour les ETF européens. Les stocker dans `etf_metadata.csv` :

```csv
ticker,nom,indice,gestionnaire,ter,eligible_pea,devise
CW8.PA,Amundi MSCI World,MSCI World,Amundi,0.0012,true,EUR
RS2K.PA,Amundi Russell 2000,Russell 2000,Amundi,0.0023,true,EUR
ESE.PA,Amundi S&P 500 ESG,S&P 500 ESG,Amundi,0.0015,true,EUR
OBLI.PA,Lyxor Euro Govt Bond,Bloomberg Euro Govt Bond,Lyxor,0.0014,true,EUR
```

## Critères d'évaluation liés à ce module

- Application fonctionnelle (6 pts) : fiche ETF avec vraies données, graphique interactif opérationnel
- Interface (2 pts) : graphiques interactifs, navigation fluide, responsive

## Points d'attention

Utiliser `Adj Close` et non `Close` brut, sinon les dividendes et splits ne sont
pas pris en compte et les comparaisons long terme deviennent fausses.

Pour la comparaison de deux ETF, normaliser en base 100 :
`(prix / prix[0]) * 100`. Sans ça, deux ETF aux prix absolus différents ne sont
pas comparables visuellement.

Si une donnée manque (yfinance indisponible, ticker inexistant), afficher un
message explicite plutôt que laisser un graphique vide.

Ne pas hardcoder les métadonnées dans le code : passer par le CSV ou la BDD.