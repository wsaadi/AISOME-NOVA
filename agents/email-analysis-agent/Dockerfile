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

# Copier le code de l'application
COPY ./app ./app

# Créer un utilisateur non-root et le répertoire de données
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app
USER appuser

# Exposer le port
EXPOSE 8000

# Volume pour la persistance des emails traités
VOLUME ["/app/data"]

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Commande de démarrage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
