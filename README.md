# Financial Dashboard — Projet Data

Application composée d'une API backend (FastAPI) et d'un frontend (React/Vite).
Ce README décrit comment lancer le projet en local sur macOS et Windows, ainsi
que les URLs de déploiement.

## Lancement et déploiement

La procédure de référence pour faire tourner l'application est le **lancement
local** décrit ci-dessous (base de données, backend, frontend). Une fois lancée,
l'API expose sa documentation Swagger sur `http://localhost:8000/docs`.

Le projet a également été déployé sur Railway à titre de démonstration (trois
services dans un même projet : frontend, backend, PostgreSQL). Ce déploiement a
connu des problèmes de stabilité, c'est pourquoi le lancement local reste la
voie recommandée pour l'évaluation. La procédure de déploiement complète est
documentée dans [`docs/DEPLOY.md`](docs/DEPLOY.md).

## 🌐 Déploiement gratuit (recommandé : GitHub Pages + Render)

Le déploiement Railway a été abandonné (crédit gratuit limité → instabilité). La
nouvelle cible est **100 % gratuite et durable** :

| Brique | Hébergeur | Notes |
|---|---|---|
| Frontend (SPA) | **GitHub Pages** | Auto-déployé via Actions à chaque push |
| Backend (API) | **Render** (plan free) | Blueprint `render.yaml` → déploiement 1-clic |
| Base de données | *aucune requise* | Repli **SQLite** + snapshot de vraies données embarqué |

**Frontend** → https://akaloic.github.io/Financial_dashboard/ (publié par
`.github/workflows/deploy-frontend.yml`).

**Backend** → sur https://render.com : `New +` → `Blueprint` → connecter ce dépôt.
Render lit `render.yaml` et provisionne l'API. Sans `DATABASE_URL`, l'app tourne sur
SQLite et **amorce de vraies données 10 ans depuis le snapshot embarqué**
(`backend/data/etf_history_seed.csv.gz`, 16 ETF) — aucune base externe à provisionner,
et aucune dépendance à Yahoo Finance au runtime (souvent bloqué depuis les datacenters).

L'URL d'API est pré-câblée dans le build, **et** modifiable au runtime via le bandeau
en haut de l'app (pratique si Render attribue une autre URL). Pour brancher une vraie
base PostgreSQL gratuite : créer une base **Neon** (https://neon.tech) et définir
`DATABASE_URL` dans les variables du service Render.

> Régénérer le snapshot (depuis une machine non bloquée par Yahoo) :
> `cd backend && python scripts/build_seed_snapshot.py`

## Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), lancé avant de démarrer (optionnel — voir note plus bas)
- [Python 3.12](https://www.python.org/downloads/release/python-3128/) — versions 3.13+ non testées, certaines dépendances n'ont pas de wheels précompilés et tentent une compilation qui échoue sous Windows
- [Node.js 18+](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/download/) si Docker ne fonctionne pas chez vous

## 1. Base de données

### Option A — via Docker (si Docker tourne)

Depuis la racine du projet :

```bash
docker-compose up -d
```

Vérifier le conteneur avec `docker ps`.

### Option B — PostgreSQL installé en local

Si Docker Desktop refuse de démarrer (cas fréquent sous Windows), installer
PostgreSQL directement. Pendant l'installation, deux écrans demandent de
l'attention :

- **Password** : mettre `postgres` (c'est ce que le `.env` attend par défaut)
- **Locale** : choisir explicitement `English, United States` — la valeur par
  défaut prend la locale système, et un cluster en `French_France.1252` fait
  crasher psycopg2 sur des erreurs d'encodage UTF-8 impossibles à contourner
  côté client.

Créer ensuite la base :

```bash
psql -U postgres -h localhost -c "CREATE DATABASE projet_data;"
```

## 2. Backend

Dans un nouveau terminal, depuis la racine :

```bash
cd backend
```

Créer puis activer un environnement virtuel.

macOS / Linux :
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows (CMD) :
```bat
py -3.12 -m venv .venv
.venv\Scripts\activate
```

Sous PowerShell, l'activation est `.venv\Scripts\Activate.ps1`. Si elle est
refusée par la politique d'exécution, lancer une fois
`Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`,
ou simplement utiliser CMD.

Installer les dépendances et préparer le fichier d'environnement :

```bash
pip install -r requirements.txt
cp .env.example .env          # Windows : copy .env.example .env
```

Si `.env.example` se trouve à la racine du projet plutôt que dans `backend/`, copier depuis là :
```bash
cp ../.env.example .env       # Windows : copy ..\.env.example .env
```

Le `.env` doit contenir au minimum :

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/projet_data
```

Lancer le serveur :

```bash
uvicorn main:app --reload --port 8000
```

L'API est exposée sur `http://localhost:8000`, la documentation Swagger sur `/docs`.

À chaque nouveau terminal, il faut réactiver le venv avant de lancer uvicorn.

## 3. Frontend

Dans un nouveau terminal, depuis la racine :

```bash
cd frontend
npm install
cp .env.example .env.local    # Windows : copy .env.example .env.local
```

Le `.env.local` doit contenir :

```
VITE_API_URL=http://localhost:8000
```

Lancer l'interface :

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

## Tests backend

```bash
cd backend
pytest tests/ -v
```

## Structure du dépôt

```
.
├── backend/                  API FastAPI + PostgreSQL
├── frontend/                 SPA React + Vite
├── docs/                     Documentation technique
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOY.md
│   ├── MODULE_A.md
│   ├── MODULE_B.md
│   ├── MODULE_C.md
│   └── RAPPORT_PLAN.md
├── docker-compose.yml        PostgreSQL local
├── .env.example
├── .gitignore
└── README.md
```
