FROM python:3.11-slim

WORKDIR /app

# Copier les requirements et installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'application
COPY app/ ./app/

# Exposer le port
EXPOSE 8015

# Commande de démarrage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8015"]
