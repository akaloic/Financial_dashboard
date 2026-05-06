# Utiliser une image Python officielle légère
FROM python:3.11-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier uniquement le fichier des dépendances en premier (pour optimiser le cache Docker)
COPY requirements.txt .

# Installer les dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Copier tout le reste du code source
COPY . .

# Exposer le port sur lequel l'API va tourner
EXPOSE 8000

# Commande pour démarrer l'application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
