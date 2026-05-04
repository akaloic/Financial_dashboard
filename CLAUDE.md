# CLAUDE.md — Contexte racine du projet

## Vision globale

Application web **"Simulateur de Portefeuille Passif avec Régression Linéaire Prédictive"** réalisée dans le cadre de l'UE Projet DATA (M2 MIAGE, Université Paris-Saclay, encadrant : Nicolas LEGEAY).

L'application permet à un investisseur particulier d'**explorer des ETF**, de **simuler une stratégie DCA** (Dollar-Cost Averaging) en backtesting, et d'**analyser statistiquement** l'historique d'un ETF via une régression linéaire OLS.

---

## Stack technologique

| Couche | Technologie |
|---|---|
| Backend API | Python 3.11 + FastAPI |
| ORM / BDD | SQLAlchemy + PostgreSQL |
| Data | yfinance, Pandas, NumPy |
| Stats | scikit-learn, statsmodels, scipy |
| Frontend | React 18 + Vite + TypeScript |
| Graphiques | Recharts ou Plotly.js |
| Tests | pytest |
| Déploiement backend | Railway ou Render |
| Déploiement frontend | Vercel |
| Versioning | Git + GitHub (1 branche par module) |

---

## Structure des dossiers

```
projet-data/
├── CLAUDE.md                  ← ce fichier (contexte racine)
├── README.md                  ← installation, liens déploiement
├── .env.example               ← template variables (jamais le .env réel)
├── .gitignore
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MODULE_A.md
│   ├── MODULE_B.md
│   ├── MODULE_C.md
│   ├── API.md
│   ├── DEPLOY.md
│   └── RAPPORT_PLAN.md
├── backend/
│   ├── main.py                ← point d'entrée FastAPI
│   ├── database.py            ← connexion SQLAlchemy
│   ├── models/                ← ORM (etf.py, simulation.py, regression.py)
│   ├── schemas/               ← Pydantic (request/response)
│   ├── routers/               ← routes (etf.py, simulation.py, regression.py)
│   ├── services/              ← logique métier (dca_engine.py, regression_engine.py, etf_fetcher.py)
│   ├── etf_metadata.csv       ← métadonnées statiques (TER, PEA, indice, gestionnaire)
│   ├── requirements.txt
│   └── tests/
│       ├── test_dca.py
│       └── test_regression.py
└── frontend/
    ├── index.html
    ├── vite.config.ts
    ├── package.json
    └── src/
        ├── App.tsx
        ├── components/
        ├── pages/
        │   ├── ModuleA/
        │   ├── ModuleB/
        │   └── ModuleC/
        └── api/               ← fonctions fetch vers le backend
```

---

## Règles absolues (ne jamais enfreindre)

1. **Jamais de secrets dans le code versionné.** Toutes les variables sensibles (`DATABASE_URL`, clés API) dans `.env` uniquement, référencées via `os.getenv()` ou `python-dotenv`.
2. **`.gitignore` complet dès le premier commit** : inclure `.env`, `__pycache__/`, `*.pyc`, `node_modules/`, `.venv/`, `dist/`.
3. **Tous les endpoints FastAPI doivent avoir une docstring** (paramètres, description, valeur retournée).
4. **Minimum 3 tests pytest** sur le moteur DCA (voir `docs/MODULE_B.md`).
5. **Aucune donnée fictive présentée comme réelle** dans l'interface ou le rapport.
6. **Branches Git** : `main` (stable), `module-a`, `module-b`, `module-c`, `deploy`.

---

## Variables d'environnement requises (.env)

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
ENVIRONMENT=development   # ou production
CORS_ORIGINS=http://localhost:5173
```

---

## Commandes de lancement local

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows : .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # puis remplir les valeurs
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local      # VITE_API_URL=http://localhost:8000
npm run dev
```

### Tests
```bash
cd backend
pytest tests/ -v
```

### Documentation Swagger
Disponible sur `http://localhost:8000/docs` (Swagger UI) et `/redoc`.

---

## Critères d'évaluation liés à ce fichier

- **Qualité technique (3 pts)** : présence du `.env`, `.gitignore`, tests pytest, README.
- **Application fonctionnelle (6 pts)** : les 3 modules doivent fonctionner avec de vraies données yfinance.

## Erreurs fréquentes à éviter

- Committer accidentellement le `.env` → vérifier avec `git status` avant chaque push.
- Oublier les migrations de BDD → utiliser `Base.metadata.create_all()` au démarrage ou Alembic.
- Appeler `yfinance` directement depuis les routes (bloque le thread) → toujours déléguer à un service.
- Exposer `DATABASE_URL` dans les logs FastAPI en mode debug.
