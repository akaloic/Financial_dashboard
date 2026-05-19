# Déploiement — Vercel + Railway/Render

## Architecture

```
GitHub (main branch)
       │
       ├──── Vercel (auto-deploy) ────► Frontend React (URL publique)
       │
       └──── Railway ou Render ───────► Backend FastAPI + PostgreSQL (URL publique)
```

## 1. Backend (Railway)

### Prérequis

Compte Railway sur https://railway.app. La CLI est optionnelle :
`npm install -g @railway/cli`.

### Création du projet

1. Connecter le compte GitHub
2. New Project → Deploy from GitHub repo → sélectionner `projet-data`
3. Root directory : `backend`

### Ajout de PostgreSQL

Dans le projet Railway, New → Database → PostgreSQL. La variable `DATABASE_URL`
est générée automatiquement et injectée dans le service backend.

### Variables d'environnement

Dans Settings → Variables, ajouter :

```
DATABASE_URL=<fourni par Railway>
ENVIRONMENT=production
CORS_ORIGINS=https://<votre-app>.vercel.app
PORT=8000
```

### Configuration du déploiement

Créer `backend/railway.toml` :
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

### `requirements.txt` minimal

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
psycopg2-binary==2.9.9
yfinance==0.2.40
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.4.2
statsmodels==0.14.2
scipy==1.13.0
python-dotenv==1.0.1
pydantic==2.7.1
alembic==1.13.1
```

### Vérification

- URL backend : `https://<app>.railway.app/docs`
- Test rapide : `curl https://<app>.railway.app/etf/`

## 2. Frontend (Vercel)

### Connexion du dépôt

1. Vercel Dashboard → New Project → Import from GitHub
2. Root directory : `frontend`
3. Framework Preset : Vite (détection automatique)

### Variables d'environnement

Dans Settings → Environment Variables :

```
VITE_API_URL=https://<votre-backend>.railway.app
```

### Configuration Vite (`frontend/vite.config.ts`)

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
```

### Build & Deploy

Vercel détecte `npm run build` et déploie `dist/`. Tout push sur `main`
déclenche un redéploiement.

## 3. Alternative : Render

Si Railway pose problème :

1. https://render.com → New Web Service → connecter GitHub
2. Root directory : `backend`
3. Build Command : `pip install -r requirements.txt`
4. Start Command : `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Ajouter un PostgreSQL depuis le dashboard Render

## 4. CORS côté backend

Dans `backend/main.py` :

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Simulateur ETF API", version="1.0.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Checklist avant soutenance

Backend :
- URL publique stable accessible (Railway/Render)
- Swagger disponible sur `/docs`
- Tous les endpoints répondent (test manuel via Swagger)
- Base initialisée avec les 4 ETF minimum
- Aucun `.env` visible dans le dépôt GitHub

Frontend :
- URL Vercel stable et partagée
- Les 3 modules accessibles via la navigation
- Graphiques interactifs fonctionnels
- `VITE_API_URL` pointe vers le backend de prod

GitHub :
- Historique de commits progressif (au moins un par sprint)
- `.gitignore` présent et complet
- README avec liens vers les déploiements
- Branches `module-a`, `module-b`, `module-c` visibles

Général :
- Démo live préparée (scénario 5 min : chercher CW8 → simuler DCA → régression)
- Application stable 48h avant la soutenance
- Rapport PDF rendu 48h avant la soutenance

## Points d'attention

Oublier `CORS_ORIGINS` en production rend le frontend inutilisable : toutes les
requêtes sont rejetées par le navigateur.

`VITE_API_URL` non défini sur Vercel envoie les requêtes vers `localhost` qui
n'existe pas côté visiteur.

Hardcoder le port à 8000 sans lire `$PORT` casse le déploiement sur Railway/Render
qui assignent le port dynamiquement.

Prévoir un script de seed (`seed_etf.py`) pour ne pas livrer une base de prod vide.

Si un `.env` est commité par accident, considérer les secrets comme compromis et
les régénérer immédiatement.