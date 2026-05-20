# Déploiement — Railway

## Architecture

```
GitHub (main branch)
       │
       └──── Railway ──── Frontend React (URL publique)
                     └── Backend FastAPI (URL publique)
                     └── PostgreSQL
```

Le projet est entièrement hébergé sur Railway. Les trois services (frontend,
backend, base de données) sont regroupés dans le même projet Railway, ce qui
permet de partager les variables d'environnement par référence et de
simplifier la gestion.

Le choix initial d'utiliser Vercel pour le frontend a été abandonné en
faveur d'un déploiement Railway unifié, après un blocage d'accès au dépôt
GitHub côté Vercel. La concentration sur une seule plateforme présente
l'avantage secondaire de garder les trois services dans le même tableau
de bord et la même facturation, au prix d'un CDN moins distribué que celui
de Vercel.

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

`CORS_ORIGINS=*` est temporaire. Une fois le frontend déployé, remplacer
par l'URL Railway exacte du frontend (sans wildcard).

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

Note : `psycopg2-binary` plutôt que `psycopg2`, sinon le build Nixpacks
essaie de compiler depuis les sources et échoue.

### Exposer publiquement le service

Une fois le service `Online`, il n'est pas accessible depuis
l'extérieur tant qu'on n'a pas généré un domaine public.

1. Cliquer sur le service backend
2. Onglet **Settings** → section **Networking**
3. Bouton **Generate Domain**

Railway génère une URL du type
`<nom-du-projet>-production.up.railway.app`. Cette URL devient
l'endpoint public du backend.

### Vérification

- Documentation Swagger : `https://<URL-RAILWAY-BACKEND>/docs` doit
  afficher l'interface Swagger
- Test endpoint : `curl https://<URL-RAILWAY-BACKEND>/etf/` doit
  retourner du JSON

Si Swagger ne répond pas alors que le service est `Online`, regarder
les **Deploy Logs** du dernier déploiement — l'erreur Python s'y
trouve en clair.

## 2. Frontend (Railway)

### Création du service frontend

Dans le **même projet Railway** que le backend :

1. Bouton **+ New** → **GitHub Repo** → sélectionner le même dépôt
2. Un nouveau service apparaît sur le canvas
3. Renommer le service en `frontend` pour distinguer du backend (clic
   sur son titre → Rename)
4. Onglet **Settings** → **Source** → **Root Directory** : `/frontend`

### Variable d'environnement (critique : avant le premier build)

Vite substitue les variables `VITE_*` au moment du **build**, pas au
runtime. Il faut donc définir `VITE_API_URL` avant le premier build,
sinon le frontend partira en prod en pointant vers la valeur fallback
définie dans `vite.config.ts` (typiquement `http://localhost:8000`),
qui ne marchera pas pour les visiteurs.

Onglet **Variables** → **+ New Variable** → Raw Value :

```
VITE_API_URL=https://<URL-RAILWAY-BACKEND>
```

L'URL doit être exactement celle générée par Railway pour le backend,
sans slash final.

### Commande de démarrage

Vite produit un dossier `dist/` au build mais ne propose pas de
commande pour le servir en production. Il faut un serveur statique
externe. Le plus simple est d'utiliser le package `serve` exécuté à
la volée par `npx` :

Onglet **Settings** → **Deploy** → **Custom Start Command** :

```
npx serve -s dist -l $PORT
```

Cette commande sert le dossier `dist/` (qui contient le build Vite) en
mode SPA (l'option `-s` rewrite toutes les routes vers `index.html`,
nécessaire pour React Router). Le `$PORT` est assigné par Railway.

Alternative : ajouter `serve` aux `devDependencies` du `package.json`
du frontend pour éviter le téléchargement à chaque démarrage :

```json
"devDependencies": {
  "serve": "^14.2.0"
}
```

Puis utiliser `serve -s dist -l $PORT` (sans `npx`) comme Start Command.

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

### Exposer publiquement le frontend

Comme pour le backend, l'URL n'est pas générée automatiquement :

1. Cliquer sur le service `frontend`
2. Onglet **Settings** → section **Networking**
3. Bouton **Generate Domain**

Récupérer l'URL générée, par exemple
`frontend-production-xxxx.up.railway.app`.

### Boucler le CORS côté backend

Une fois l'URL frontend obtenue, revenir sur le service backend et
modifier la variable `CORS_ORIGINS` :

```
CORS_ORIGINS=https://<URL-RAILWAY-FRONTEND>
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
- URL Railway stable et partagée
- Les 3 modules accessibles via la navigation
- Graphiques interactifs fonctionnels
- `VITE_API_URL` définie avant le build, pointant vers le backend de prod
- Pas d'erreur CORS dans la console navigateur

GitHub :
- Historique de commits progressif (au moins un par sprint)
- `.gitignore` présent et complet
- README avec liens vers les déploiements
- Branches `module-a`, `module-b`, `module-c` visibles si utilisées

Général :
- Démo live préparée (scénario 5 min : chercher CW8 → simuler DCA → régression)
- Application stable 48h avant la soutenance
- Rapport PDF rendu 48h avant la soutenance

## Erreurs rencontrées et résolutions

Quelques pièges concrets vécus pendant le déploiement, à documenter pour
le coéquipier ou un déploiement futur.

**Premier déploiement backend crashe sur `DATABASE_URL is not set`.** La
variable `DATABASE_URL` n'a pas été ajoutée comme référence vers le
service Postgres. Voir la section dédiée plus haut.

**Service en `Online` mais URL inaccessible.** Le domaine public n'a
pas été généré. Settings → Networking → Generate Domain.

**Build backend échoue sur la compilation de `psycopg2`.** Le
`requirements.txt` spécifie `psycopg2` au lieu de `psycopg2-binary`. Le
premier nécessite des outils de compilation absents du conteneur
Nixpacks, le second est distribué en wheel précompilé.

**Vercel ne voit pas le repo lors de l'import.** Permission GitHub non
accordée au compte Vercel, ou compte non collaborateur du repo. Si pas
possible de résoudre rapidement, basculer le frontend sur Railway
comme documenté en section 2.

**Frontend Railway part en prod sans pouvoir contacter le backend.**
La variable `VITE_API_URL` n'a pas été définie avant le premier build.
Définir la variable, puis redéployer manuellement (Deployments →
Redeploy) pour relancer un build qui prendra cette fois la bonne valeur.

**`VITE_API_URL` mal formatée — frontend silencieusement cassé en prod.**
Les chevrons `<...>` utilisés comme placeholders dans la documentation
restent collés à la valeur si on copie-colle sans réfléchir. La valeur
attendue est `https://backend-xxx.up.railway.app`, sans `<>`, sans
guillemets, avec le `https://` préfixe, sans slash final. Une valeur
mal formatée ne déclenche aucune erreur au build — le frontend partira
en prod en faisant des requêtes vers une URL invalide.

**`DATABASE_URL=${{DATABASE_URL}}` ne résout pas.** Le préfixe du
service est obligatoire dans une référence Railway. La syntaxe
correcte est `${{Postgres.DATABASE_URL}}` (ou le nom exact du service
Postgres s'il a été renommé). Sans le préfixe, Railway interprète la
variable comme une auto-référence circulaire et la laisse littéralement
non résolue.

**Postgres passe en "offline" sans raison apparente.** Le plus souvent,
le service a été arrêté manuellement ou mis en pause via l'interface
Railway. Pour le relancer : service Postgres → onglet Deployments →
sur le dernier déploiement, menu `⋮` → Redeploy. Vérifier ensuite que
le service repasse `Online` avant de relancer le backend.

**"Deploys have been paused temporarily" en haut de l'interface.**
Trois causes possibles : crédit gratuit épuisé (Settings → Usage), des
changements stagés non appliqués qui bloquent (cliquer sur Details
pour voir et Apply/Discard), ou des services Agent (Redis, Bucket) qui
consomment du crédit pour rien (Settings → Danger → Delete Service).

**L'Agent Railway propose Redis et un Bucket.** Refuser : ce projet
n'a besoin que de trois services (backend, frontend, PostgreSQL).
L'Agent est facturable et épuiserait le crédit gratuit. Si l'Agent a
déjà provisionné ces services, les supprimer manuellement.

**L'Agent Railway suggère d'ajouter `DATABASE_URL`, `CORS_ORIGINS`,
`ENVIRONMENT` etc. sur le service frontend.** Ignorer toutes ces
suggestions. Un frontend React statique n'a besoin que de
`VITE_API_URL`. Les autres variables (BDD, CORS) sont du domaine
exclusif du backend.

**Variables suggérées `client_encoding=utf8` lors du premier build
backend.** Refuser : c'est un héritage du débogage local sous Windows
français, inutile sur le cluster Postgres Railway en UTF-8.

**Mot de passe Postgres partagé par inadvertance (capture, chat,
commit).** Considérer le credential comme compromis. Régénérer
immédiatement : service Postgres → Variables → `POSTGRES_PASSWORD` →
Generate New Password. Toutes les variables dépendantes
(`DATABASE_URL`, `PGPASSWORD`) se mettent automatiquement à jour
puisqu'elles utilisent des références.

**CORS bloque les appels frontend.** La variable `CORS_ORIGINS` côté
backend n'a pas été mise à jour avec l'URL frontend réelle. Toujours
synchroniser après le déploiement frontend.
