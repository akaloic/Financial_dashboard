# docs/ARCHITECTURE.md — Architecture technique du projet

## Diagramme d'architecture (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVIGATEUR (React 18)                    │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐ │
│  │ Module A │   │   Module B   │   │        Module C          │ │
│  │ Explorateur│  │  DCA Simulator│  │  Régression OLS          │ │
│  └────┬─────┘   └──────┬───────┘   └───────────┬──────────────┘ │
└───────┼──────────────────┼───────────────────────┼───────────────┘
        │  HTTP REST (JSON) │                       │
        ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND FastAPI (Python 3.11)                  │
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

---

## Description des couches

### Frontend (React 18 + Vite + TypeScript)
- SPA (Single Page Application) hébergée sur **Vercel**
- Communication avec le backend via `fetch` ou `axios` (variable d'env `VITE_API_URL`)
- Graphiques interactifs : **Recharts** pour les courbes DCA, **Plotly.js** pour la régression
- Navigation par onglets ou router (React Router v6) : Module A / B / C

### Backend (FastAPI)
- Hébergé sur **Railway** ou **Render** (avec auto-deploy depuis GitHub)
- Trois routeurs : `etf`, `simulation`, `regression`
- Validation des données d'entrée/sortie via **Pydantic v2**
- Documentation Swagger auto-générée sur `/docs`
- CORS configuré pour autoriser le domaine Vercel

### Services métier
| Service | Responsabilité |
|---|---|
| `etf_fetcher.py` | Récupère les cours via yfinance, enrichit depuis `etf_metadata.csv` |
| `dca_engine.py` | Calcule le backtesting DCA mois par mois |
| `regression_engine.py` | Calcule OLS, R², p-value, résidus, IC 95 %, projection 12 mois |

### Base de données (PostgreSQL)
- Connexion via `DATABASE_URL` (variable d'environnement)
- ORM : SQLAlchemy 2.x avec sessions asynchrones ou synchrones
- Création des tables au démarrage : `Base.metadata.create_all(bind=engine)`

---

## Modèle de données complet

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
    mois            INTEGER NOT NULL,            -- numéro du mois (1, 2, ...)
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
    beta0       FLOAT NOT NULL,                  -- intercept
    beta1       FLOAT NOT NULL,                  -- pente (prix/jour)
    r_squared   FLOAT NOT NULL,
    p_value     FLOAT NOT NULL,
    std_error   FLOAT NOT NULL,
    durbin_watson FLOAT,                         -- bonus
    nb_observations INTEGER,
    projection_json TEXT                         -- JSON: [{date, valeur_pred, ic_low, ic_high}]
);
```

---

## Flux de données ETL

```
1. Requête frontend → POST /etf/{ticker}/historique
2. Backend vérifie si cours_historique contient déjà des données récentes
3. Si non → appel yfinance.Ticker(ticker).history(period="10y")
4. Nettoyage Pandas (suppression NaN, normalisation colonnes)
5. Upsert dans cours_historique (INSERT ... ON CONFLICT DO UPDATE)
6. Enrichissement depuis etf_metadata.csv (TER, PEA, indice)
7. Upsert dans etf
8. Retour JSON au frontend
```

---

## ETF minimaux à intégrer

| Ticker yfinance | Nom court | Indice | Éligible PEA |
|---|---|---|---|
| CW8.PA | Amundi MSCI World | MSCI World | Oui |
| RS2K.PA | Amundi Russell 2000 | Russell 2000 | Oui |
| ESE.PA | Amundi S&P 500 ESG | S&P 500 ESG | Oui |
| OBLI.PA | Lyxor Euro Govt Bond | Bloomberg Euro Govt | Oui |

> Ajouter au moins 4 ETF pour la démo finale (critère d'évaluation).

---

## Erreurs fréquentes à éviter

- Ne pas confondre `close` et `adj_close` : **toujours utiliser `adj_close`** pour les calculs (dividendes et splits ajustés).
- Ne pas stocker les résultats de régression en mémoire vive uniquement → les persister en BDD pour l'endpoint GET.
- Ne pas requêter yfinance à chaque appel API → mettre en cache BDD avec une fraîcheur de 24h.
