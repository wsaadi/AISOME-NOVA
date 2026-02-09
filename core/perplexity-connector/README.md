# Perplexity Connector

Connecteur FastAPI pour interagir avec l'API Perplexity AI.

## Fonctionnalités

- **Chat avec accès Internet en temps réel** - Réponses basées sur les dernières informations
- **Support multi-modèles** - Accès aux différents modèles Sonar
- **API standardisée** - Interface unifiée pour toute la plateforme
- **Health checks** - Monitoring de l'état du service
- **Documentation interactive** - Swagger UI et ReDoc

## Installation

### Prérequis

- Python 3.11+
- Clé API Perplexity (obtenir sur https://www.perplexity.ai/settings/api)

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
docker build -t perplexity-connector .

# Lancer le conteneur
docker run -d -p 8007:8000 \
  -e PERPLEXITY_API_KEY=your_key_here \
  --name perplexity-connector \
  perplexity-connector
```

## Utilisation

### Chat

```bash
curl -X POST "http://localhost:8007/api/v1/perplexity/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Quelles sont les dernières nouvelles en IA ?"}
    ],
    "temperature": 0.7
  }'
```

### Lister les modèles

```bash
curl "http://localhost:8007/api/v1/perplexity/models"
```

### Health check

```bash
curl "http://localhost:8007/health"
```

## Documentation

- Swagger UI: http://localhost:8007/docs
- ReDoc: http://localhost:8007/redoc

## Modèles disponibles

- `sonar` - Modèle standard avec accès Internet (par défaut)
- `sonar-pro` - Modèle avancé avec recherche approfondie
- `sonar-reasoning-pro` - Modèle avec raisonnement avancé
- `sonar-deep-research` - Recherche approfondie multi-sources

## Variables d'environnement

- `PERPLEXITY_API_KEY` - Clé API Perplexity (obligatoire)
- `DEFAULT_MODEL` - Modèle par défaut
- `DEFAULT_MAX_TOKENS` - Nombre maximum de tokens (défaut: 1024)
- `DEFAULT_TEMPERATURE` - Température (défaut: 0.7)
- `CORS_ORIGINS` - Origines CORS autorisées (défaut: *)
- `ENVIRONMENT` - Environnement (production/development)

## Licence

MIT
