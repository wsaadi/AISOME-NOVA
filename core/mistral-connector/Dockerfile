FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copier les requirements
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Install performance dependencies (uvloop for faster event loop)
RUN pip install --no-cache-dir uvloop httptools || true

# Copier le code de l'application
COPY ./app ./app

# Créer un utilisateur non-root
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Exposer le port
EXPOSE 8000

# Environment variables for tuning
ENV UVICORN_WORKERS=2
ENV LOG_LEVEL=INFO

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Commande de démarrage optimisée avec:
# - Multiple workers pour gérer les requêtes en parallèle
# - Backlog pour la file d'attente des connexions
# - Limites de concurrence pour éviter l'épuisement des ressources
CMD ["uvicorn", "app.main:app", \
    "--host", "0.0.0.0", \
    "--port", "8000", \
    "--workers", "2", \
    "--backlog", "2048", \
    "--limit-concurrency", "1000", \
    "--limit-max-requests", "10000", \
    "--timeout-keep-alive", "30"]
