# Image Python officielle légère
FROM python:3.11-slim

WORKDIR /app

# Dépendances d'abord (cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code source
COPY . .

# Le port est fourni par la plateforme via $PORT (Render, HF Spaces, Fly…),
# avec repli sur 8000 en local. Forme shell pour que la variable soit interprétée.
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
