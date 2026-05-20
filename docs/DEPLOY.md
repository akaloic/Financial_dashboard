# Déploiement — Vercel + Railway

## Architecture

```
GitHub (main branch)
       │
       ├──── Vercel (auto-deploy) ────► Frontend React (URL publique)
       │
       └──── Railway ──────────────────► Backend FastAPI + PostgreSQL (URL publique)
```

## 1. Backend (Railway)

### Prérequis

Compte Railway sur https://railway.app. La CLI est optionnelle :
`npm install -g @railway/cli`.

Important : Railway propose désormais un **Agent IA** dans l'interface. Il est
facturable et a tendance à provisionner des services non demandés (Redis,
Buckets). Pour ce projet, faire toute la configuration manuellement via l'UI
classique. Ignorer l'Agent.

### Création du projet

1. Connecter le compte GitHub à Railway
2. New Project → Deploy from GitHub repo → sélectionner le dépôt du projet
3. Railway crée un premier service à partir du dépôt

### Configuration du Root Directory

Le dépôt contient `backend/` et `frontend/` séparés. Il faut indiquer à
Railway de ne builder que le backend :

1. Cliquer sur le service nouvellement créé
2. Onglet **Settings** → section **Source**
3. Champ **Root Directory** : `/backend`

Railway redéclenche automatiquement un build avec cette nouvelle racine.

### Ajout de PostgreSQL

Toujours dans le projet Railway :

1. Bouton **+ New** ou **Create** → **Database** → **PostgreSQL**
2. Le service Postgres apparaît sur le canvas à côté du backend

Le cluster Postgres provisionné est en UTF-8 par défaut, pas en locale
système — il n'y a donc pas besoin du `client_encoding=utf8` qui était
nécessaire pour une installation locale sous Windows français.

### Lier le backend à la base : variable DATABASE_URL

C'est l'étape qui fait crasher la plupart des premiers déploiements. La
variable `DATABASE_URL` **n'est pas** injectée automatiquement dans le
backend par Railway. Il faut l'ajouter manuellement comme **référence**
vers le service Postgres.

1. Cliquer sur le service backend
2. Onglet **Variables** → bouton **+ New Variable**
3. Name : `DATABASE_URL`
4. Value : taper `${{` — un menu déroulant apparaît, sélectionner
   `Postgres.DATABASE_URL`
5. La valeur affichée devient `${{Postgres.DATABASE_URL}}`
6. Add

Ajouter aussi ces deux variables en valeur brute (Raw Value) :

```
ENVIRONMENT=production
CORS_ORIGINS=*
```

`CORS_ORIGINS=*` est temporaire. Une fois le frontend déployé sur Vercel,
remplacer par l'URL Vercel exacte (sans wildcard).

Important : ne pas définir de variable `PORT`. Railway assigne le port
dynamiquement via la variable `$PORT` qu'il injecte lui-même, et la
commande de démarrage doit la lire (voir plus bas).

### Commande de démarrage

Si Railway utilise Nixpacks (détection automatique Python), il devine
en général la commande à partir du `requirements.txt`. Si le service ne
démarre pas, forcer la commande explicitement :

1. Onglet **Settings** → section **Deploy**
2. Champ **Custom Start Command** :
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

Le `--host 0.0.0.0` est nécessaire pour que le service écoute sur
toutes les interfaces et soit joignable depuis l'extérieur du conteneur.
Le `$PORT` lit la variable Railway, ne pas mettre `8000` en dur.

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

Note : `psycopg2-binary` est important plutôt que `psycopg2` tout court,
sinon le build Nixpacks essaie de compiler depuis les sources et échoue.

### Exposer publiquement le service

Une fois le service `Online` (badge vert sur le canvas), il n'est pas
accessible depuis l'extérieur tant qu'on n'a pas généré un domaine
public.

1. Cliquer sur le service backend
2. Onglet **Settings** → section **Networking**
3. Bouton **Generate Domain**

Railway génère une URL du type
`<nom-du-projet>-production.up.railway.app`. Cette URL devient l'endpoint
public du backend.

### Vérification

- Documentation Swagger : `https://<URL-RAILWAY>/docs` doit afficher
  l'interface Swagger
- Test endpoint : `curl https://<URL-RAILWAY>/etf/` doit retourner du
  JSON (probablement liste vide si la base n'est pas seedée)

Si Swagger ne répond pas alors que le service est `Online`, regarder
les **Deploy Logs** du dernier déploiement — l'erreur Python s'y
trouve en clair.

## 2. Frontend (Vercel)

### Connexion du dépôt

1. Vercel Dashboard → New Project → Import from GitHub
2. Sélectionner le dépôt du projet
3. Root directory : `frontend`
4. Framework Preset : **Vite** (détection automatique)

### Variables d'environnement

Dans Settings → Environment Variables :

```
VITE_API_URL=https://<URL-RAILWAY>
```

L'URL doit être exactement celle générée par Railway à l'étape
précédente, sans slash final.

### Configuration Vite

Le fichier `frontend/vite.config.ts` doit lire la variable d'env :

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

### Build et déploiement

Vercel détecte `npm run build` et déploie `dist/`. Tout push sur `main`
déclenche un redéploiement automatique.

Une URL Vercel du type `<nom-projet>.vercel.app` est générée à chaque
build.

### Boucler le CORS

Une fois l'URL Vercel obtenue, revenir sur Railway et modifier la
variable `CORS_ORIGINS` du backend :

```
CORS_ORIGINS=https://<URL-VERCEL>
```

Sans cette mise à jour, le navigateur bloquera tous les appels du
frontend vers le backend (erreur CORS).

## 3. CORS côté backend

Dans `backend/main.py`, le middleware CORS doit lire la variable
d'environnement :

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
- URL Railway stable et joignable
- Swagger disponible sur `/docs`
- Tous les endpoints répondent (test manuel via Swagger)
- Base initialisée avec les 4 ETF minimum (script de seed ou premier
  appel à `/etf/{ticker}/historique` qui peuple via yfinance)
- Aucun `.env` visible dans le dépôt GitHub

Frontend :
- URL Vercel stable et partagée
- Les 3 modules accessibles via la navigation
- Graphiques interactifs fonctionnels
- `VITE_API_URL` pointe vers le backend de prod
- Pas d'erreur CORS dans la console navigateur

GitHub :
- Historique de commits progressif (au moins un par sprint)
- `.gitignore` présent et complet
- README avec liens vers les déploiements
- Branches `module-a`, `module-b`, `module-c` visibles si elles ont été
  utilisées

Général :
- Démo live préparée (scénario 5 min : chercher CW8 → simuler DCA → régression)
- Application stable 48h avant la soutenance
- Rapport PDF rendu 48h avant la soutenance

## Erreurs rencontrées et résolutions

Quelques pièges concrets vécus pendant le déploiement initial, à
documenter pour le coéquipier ou un déploiement futur.

**Premier déploiement crashe sur `DATABASE_URL is not set`.** La variable
`DATABASE_URL` n'a pas été ajoutée comme référence vers le service
Postgres. Voir la section dédiée plus haut.

**Service en `Online` mais URL inaccessible.** Le domaine public n'a pas
été généré. Settings → Networking → Generate Domain.

**Build échoue sur la compilation de `psycopg2`.** Le `requirements.txt`
spécifie `psycopg2` au lieu de `psycopg2-binary`. Le premier nécessite
des outils de compilation absents du conteneur Nixpacks, le second est
distribué en wheel précompilé.

**L'Agent Railway propose Redis et un Bucket.** Refuser : ce projet n'a
besoin que du backend et de PostgreSQL. L'Agent est facturable et
épuiserait le crédit gratuit.

**Variables suggérées `client_encoding=utf8` lors du premier build.**
Refuser : c'est un héritage du débogage local sous Windows français,
inutile sur le cluster Postgres Railway qui est en UTF-8.

**CORS bloque les appels frontend après déploiement.** La variable
`CORS_ORIGINS` côté Railway n'a pas été mise à jour avec l'URL Vercel
réelle. Toujours synchroniser après le premier déploiement Vercel.
