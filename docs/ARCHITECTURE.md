# Architecture technique

## Diagramme global

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR (React 18)                    │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │ Module A │   │   Module B   │   │        Module C          │ │
│  │Explorateur│  │ DCA Simulator│   │     Régression OLS       │ │
│  └────┬─────┘   └──────┬───────┘   └───────────┬──────────────┘ │
└───────┼──────────────────┼───────────────────────┼───────────────┘
        │  HTTP REST (JSON) │                       │
        ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND FastAPI (Python 3.12)                  │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ /etf/ routes │  │/simulation/  │  │   /regression/ routes │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
│         │                 │                      │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────────▼────────────┐ │
│  │ etf_fetcher  │  │  dca_engine  │  │  regression_engine    │ │
│  │  (yfinance)  │  │  (Pandas)    │  │  (sklearn/statsmodels)│ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬────────────┘ │
└─────────┼──────────────────┼───────────────────────┼───────────┘
          │                  │                        │
          ▼                  ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (Railway/Render)                 │
│  ┌──────────┐  ┌─────────────────┐  ┌──────────────────────── ┐│
│  │   etf    │  │ cours_historique │  │ simulation              ││
│  └──────────┘  └─────────────────┘  │ resultat_simulation     ││
│                                     │ resultat_regression     ││
│                                     └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          ▲
          │ yfinance (données boursières)
    ─────────────
    Yahoo Finance API (externe, gratuite)
```

## Description des couches

### Frontend (React 18 + Vite + TypeScript)

SPA hébergée sur Vercel. Communication avec le backend via `fetch` ou `axios`,
URL configurée par la variable `VITE_API_URL`. Graphiques avec Recharts pour
les courbes DCA et Plotly.js pour la régression. Navigation par React Router v6
entre les trois modules.

### Backend (FastAPI)

Hébergé sur Railway ou Render avec auto-deploy depuis GitHub. Trois routeurs
(`etf`, `simulation`, `regression`), validation des entrées/sorties via
Pydantic v2, Swagger auto-généré sur `/docs`, CORS configuré pour autoriser
le domaine Vercel.

### Services métier

| Service | Responsabilité |
|---|---|
| `etf_fetcher.py` | Récupère les cours via yfinance, enrichit depuis `etf_metadata.csv` |
| `dca_engine.py` | Calcule le backtesting DCA mois par mois |
| `regression_engine.py` | Calcule OLS, R², p-value, résidus, IC 95 %, projection 12 mois |

### Base de données (PostgreSQL)

Connexion via `DATABASE_URL` en variable d'environnement. ORM SQLAlchemy 2.x
en sessions synchrones. Tables créées au démarrage avec
`Base.metadata.create_all(bind=engine)`.

## Modèle de données

### Table `etf`
```sql
CREATE TABLE etf (
    id          SERIAL PRIMARY KEY,
    ticker      VARCHAR(20) UNIQUE NOT NULL,   -- ex: "CW8.PA"
    nom         VARCHAR(200),
    indice      VARCHAR(200),                   -- ex: "MSCI World"
    gestionnaire VARCHAR(100),                  -- ex: "Amundi"
    ter         FLOAT,                          -- ex: 0.0012 (0.12 %)
    eligible_pea BOOLEAN,
    devise      VARCHAR(10),                    -- ex: "EUR"
    created_at  TIMESTAMP DEFAULT NOW()
);
```

### Table `cours_historique`
```sql
CREATE TABLE cours_historique (
    id          SERIAL PRIMARY KEY,
    etf_id      INTEGER REFERENCES etf(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    open        FLOAT,
    high        FLOAT,
    low         FLOAT,
    close       FLOAT NOT NULL,
    adj_close   FLOAT,
    volume      BIGINT,
    UNIQUE(etf_id, date)
);
```

### Table `simulation`
```sql
CREATE TABLE simulation (
    id              SERIAL PRIMARY KEY,
    etf_id          INTEGER REFERENCES etf(id),
    capital_initial FLOAT NOT NULL DEFAULT 0,
    versement_mensuel FLOAT NOT NULL,
    date_debut      DATE NOT NULL,
    date_fin        DATE NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### Table `resultat_simulation`
```sql
CREATE TABLE resultat_simulation (
    id              SERIAL PRIMARY KEY,
    simulation_id   INTEGER REFERENCES simulation(id) ON DELETE CASCADE,
    mois            INTEGER NOT NULL,
    date            DATE NOT NULL,
    prix_cloture    FLOAT NOT NULL,
    parts_achetees  FLOAT NOT NULL,
    parts_cumulees  FLOAT NOT NULL,
    valeur_brute    FLOAT NOT NULL,              -- avant TER
    valeur_nette    FLOAT NOT NULL,              -- après TER
    capital_investi FLOAT NOT NULL
);
```

### Table `resultat_regression`
```sql
CREATE TABLE resultat_regression (
    id          SERIAL PRIMARY KEY,
    etf_id      INTEGER REFERENCES etf(id),
    date_calcul TIMESTAMP DEFAULT NOW(),
    periode_debut DATE,
    periode_fin   DATE,
    beta0       FLOAT NOT NULL,
    beta1       FLOAT NOT NULL,
    r_squared   FLOAT NOT NULL,
    p_value     FLOAT NOT NULL,
    std_error   FLOAT NOT NULL,
    durbin_watson FLOAT,
    nb_observations INTEGER,
    projection_json TEXT
);
```

## Flux ETL

1. Le frontend requête `POST /etf/{ticker}/historique`
2. Le backend vérifie si `cours_historique` contient des données récentes
3. Sinon, appel à `yfinance.Ticker(ticker).history(period="10y")`
4. Nettoyage Pandas (suppression NaN, normalisation colonnes)
5. Upsert dans `cours_historique` (INSERT ... ON CONFLICT DO UPDATE)
6. Enrichissement depuis `etf_metadata.csv` (TER, PEA, indice)
7. Upsert dans `etf`
8. Retour JSON au frontend

## ETF de référence

| Ticker yfinance | Nom court | Indice | Éligible PEA |
|---|---|---|---|
| CW8.PA | Amundi MSCI World | MSCI World | Oui |
| RS2K.PA | Amundi Russell 2000 | Russell 2000 | Oui |
| ESE.PA | Amundi S&P 500 ESG | S&P 500 ESG | Oui |
| OBLI.PA | Lyxor Euro Govt Bond | Bloomberg Euro Govt | Oui |

Minimum 4 ETF pour la démo finale (critère d'évaluation).

## Points d'attention

Toujours utiliser `adj_close` plutôt que `close` pour les calculs : les dividendes
et splits sont déjà appliqués.

Les résultats de régression doivent être persistés en BDD pour permettre l'endpoint
`GET /regression/{etf_id}` sans recalcul.

Ne pas requêter yfinance à chaque appel API : mettre en cache BDD avec une fraîcheur
de 24h, sinon les performances s'effondrent et Yahoo finit par bloquer l'IP.