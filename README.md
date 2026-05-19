# Financial Dashboard — Projet Data

Application composée d'une API backend (FastAPI) et d'un frontend (React/Vite).
Ce README décrit comment lancer le projet en local sur macOS et Windows.

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