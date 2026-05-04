# docs/DEPLOY.md — Déploiement Vercel + Railway/Render

## Architecture de déploiement

```
GitHub (main branch)
       │
       ├──── Vercel (auto-deploy) ────► Frontend React (URL publique)
       │
       └──── Railway ou Render ───────► Backend FastAPI + PostgreSQL (URL publique)
```

---

## 1. Déploiement Backend (Railway)

### Prérequis
- Compte Railway : https://railway.app
- CLI Railway (optionnel) : `npm install -g @railway/cli`

### Étapes

**1.1 Créer un projet Railway**
1. Connecter le compte GitHub
2. New Project → Deploy from GitHub repo → sélectionner `projet-data`
3. Root directory : `backend`

**1.2 Ajouter PostgreSQL**
1. Dans le projet Railway → New → Database → PostgreSQL
2. Copier la variable `DATABASE_URL` générée automatiquement

**1.3 Variables d'environnement (Railway → Settings → Variables)**
```env
DATABASE_URL=<fourni automatiquement par Railway PostgreSQL>
ENVIRONMENT=production
CORS_ORIGINS=https://<votre-app>.vercel.app
PORT=8000
```

**1.4 Fichier de configuration Railway (backend/railway.toml ou Procfile)**
```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

**1.5 requirements.txt minimal**
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

**1.6 Vérification**
- URL backend disponible : `https://<app>.railway.app/docs`
- Tester : `curl https://<app>.railway.app/etf/`

---

## 2. Déploiement Frontend (Vercel)

### Prérequis
- Compte Vercel : https://vercel.com
- Framework détecté automatiquement : Vite

### Étapes

**2.1 Connecter le dépôt GitHub**
1. Vercel Dashboard → New Project → Import from GitHub
2. Root directory : `frontend`
3. Framework Preset : **Vite**

**2.2 Variables d'environnement (Vercel → Settings → Environment Variables)**
```env
VITE_API_URL=https://<votre-backend>.railway.app
```

**2.3 Configuration Vite (frontend/vite.config.ts)**
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

**2.4 Build & Deploy**
- Vercel détecte automatiquement `npm run build` → dossier `dist/`
- Tout push sur `main` déclenche un redéploiement automatique

---

## 3. Alternative : Render

Si Railway pose des problèmes, utiliser **Render** :

1. https://render.com → New Web Service → connecter GitHub
2. Root directory : `backend`
3. Build Command : `pip install -r requirements.txt`
4. Start Command : `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Ajouter un PostgreSQL depuis Render Dashboard

---

## 4. Configuration CORS (backend/main.py)

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

---

## 5. Checklist avant soutenance

### Backend
- [ ] URL publique stable accessible (Railway/Render)
- [ ] Swagger disponible sur `/docs`
- [ ] Tous les endpoints répondent (test manuel via Swagger)
- [ ] Base de données initialisée avec les 4 ETF minimum
- [ ] Pas de `.env` visible dans le dépôt GitHub

### Frontend
- [ ] URL Vercel stable et partagée
- [ ] Les 3 modules sont accessibles via la navigation
- [ ] Graphiques interactifs fonctionnels
- [ ] Variable `VITE_API_URL` pointe vers le backend de production

### GitHub
- [ ] Historique de commits progressif (au moins 1 commit par sprint)
- [ ] `.gitignore` présent et complet
- [ ] README avec URL de déploiement frontend et backend
- [ ] Branches `module-a`, `module-b`, `module-c` visibles

### Général
- [ ] Démo live préparée (scénario de 5 min : chercher CW8 → simuler DCA → afficher régression)
- [ ] Application stable 48h avant la soutenance
- [ ] Rapport PDF rendu 48h avant la soutenance

---

## Erreurs fréquentes à éviter

- Oublier de configurer `CORS_ORIGINS` en production → le frontend ne peut pas appeler le backend.
- `VITE_API_URL` non défini sur Vercel → toutes les requêtes échouent en production.
- Commit du `.env` → invalider immédiatement les secrets si cela arrive.
- Base de données vide en production → prévoir un script de seed (`seed_etf.py`).
- Port hardcodé à `8000` sans lire `$PORT` → Railway/Render assignent le port dynamiquement.
