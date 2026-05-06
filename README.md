# Financial Dashboard - Projet Data

Ce projet contient une API Backend (FastAPI) et un Frontend (React/Vite). Voici le guide complet pas à pas pour lancer le projet en local sur macOS et Windows.

## 📋 Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (doit être allumé et en cours d'exécution)
- [Python 3.10+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)

---

## 🚀 Étape 1 : Lancer la Base de Données

1. Ouvrez l'application **Docker Desktop** et attendez qu'elle soit complètement démarrée.
2. Ouvrez un terminal à la **racine** du projet.
3. Lancez le conteneur PostgreSQL :
    ```bash
    docker-compose up -d
    ```
    _(Pour vérifier que la base tourne, tapez `docker ps`. Vous devriez voir un conteneur postgres)_.

---

## 🛠 Étape 2 : Lancer le Backend (API Python)

Ouvrez un **nouveau terminal** à la racine du projet.

1. Allez dans le dossier `backend` :
    ```bash
    cd backend
    ```
2. Créez un environnement virtuel :

    ```bash
    # macOS / Linux
    python3 -m venv .venv

    # Windows
    python -m venv .venv
    ```

3. Activez l'environnement virtuel :

    ```bash
    # macOS / Linux
    source .venv/bin/activate

    # Windows
    .venv\Scripts\activate
    ```

4. Installez les dépendances :
    ```bash
    pip install -r requirements.txt
    ```
5. Configurez le fichier d'environnement :

    ```bash
    # macOS / Linux
    cp .env.example .env

    # Windows
    copy .env.example .env
    ```

    _(Vérifiez que le `.env` contient la ligne `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/projet_data`)_

6. Lancez le serveur :
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    L'API sera disponible sur `http://localhost:8000` (Doc sur `http://localhost:8000/docs`).

---

## 💻 Étape 3 : Lancer le Frontend (React)

Ouvrez un **dernier nouveau terminal** à la racine du projet.

1. Allez dans le dossier `frontend` :
    ```bash
    cd frontend
    ```
2. Installez les dépendances :
    ```bash
    npm install
    ```
3. Configurez le fichier d'environnement :

    ```bash
    # macOS / Linux
    cp .env.example .env.local

    # Windows
    copy .env.example .env.local
    ```

    _(Ce fichier doit contenir `VITE_API_URL=http://localhost:8000`)_

4. Lancez l'interface web :
    ```bash
    npm run dev
    ```

🌐 **Votre application web est maintenant accessible via votre navigateur, généralement sur `http://localhost:5173`.**
