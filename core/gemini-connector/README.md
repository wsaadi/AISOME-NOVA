# Gemini Connector

Connecteur FastAPI pour interagir avec l'API Google Gemini.

## Fonctionnalités

- **Chat completion** - Conversations avec les modèles Gemini
- **Embeddings** - Génération de vecteurs d'embeddings
- **Support multi-modèles** - Accès aux différents modèles Gemini
- **API standardisée** - Interface unifiée pour toute la plateforme
- **Health checks** - Monitoring de l'état du service
- **Documentation interactive** - Swagger UI et ReDoc

## Installation

### Prérequis

- Python 3.11+
- Clé API Google Gemini (obtenir sur https://makersuite.google.com/app/apikey)

### Installation locale

```bash
# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et ajouter votre clé API

# Démarrer le serveur
uvicorn app.main:app --reload
```

### Avec Docker

```bash
# Build l'image
docker build -t gemini-connector .

# Lancer le conteneur
docker run -d -p 8008:8000 \
  -e GEMINI_API_KEY=your_key_here \
  --name gemini-connector \
  gemini-connector
```

## Utilisation

### Chat

```bash
curl -X POST "http://localhost:8008/api/v1/gemini/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explique-moi le machine learning"}
    ],
    "temperature": 0.7
  }'
```

### Embeddings

```bash
curl -X POST "http://localhost:8008/api/v1/gemini/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Texte à vectoriser", "Autre texte"]
  }'
```

### Lister les modèles

```bash
curl "http://localhost:8008/api/v1/gemini/models"
```

### Health check

```bash
curl "http://localhost:8008/health"
```

## Documentation

- Swagger UI: http://localhost:8008/docs
- ReDoc: http://localhost:8008/redoc

## Modèles disponibles

- `gemini-2.0-flash-exp` - Modèle Flash expérimental rapide (par défaut)
- `gemini-1.5-pro` - Modèle Pro le plus puissant
- `gemini-1.5-flash` - Modèle Flash stable
- `text-embedding-004` - Pour les embeddings

## Variables d'environnement

- `GEMINI_API_KEY` - Clé API Gemini (obligatoire)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: gemini-2.0-flash-exp)
- `DEFAULT_MAX_TOKENS` - Nombre maximum de tokens (défaut: 1024)
- `DEFAULT_TEMPERATURE` - Température (défaut: 0.7)
- `CORS_ORIGINS` - Origines CORS autorisées (défaut: *)
- `ENVIRONMENT` - Environnement (production/development)

## Licence

MIT
