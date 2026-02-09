# Anthropic Connector

Connecteur FastAPI pour interagir avec l'API Anthropic Claude.

## Fonctionnalités

- **Chat completion** - Conversations avec les modèles Claude
- **Support multi-modèles** - Accès aux différents modèles Claude (Opus, Sonnet, Haiku)
- **API standardisée** - Interface unifiée pour toute la plateforme
- **Health checks** - Monitoring de l'état du service
- **Documentation interactive** - Swagger UI et ReDoc

## Installation

### Prérequis

- Python 3.11+
- Clé API Anthropic (obtenir sur https://console.anthropic.com/)

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
docker build -t anthropic-connector .

# Lancer le conteneur
docker run -d -p 8009:8000 \
  -e ANTHROPIC_API_KEY=your_key_here \
  --name anthropic-connector \
  anthropic-connector
```

## Utilisation

### Chat

```bash
curl -X POST "http://localhost:8009/api/v1/anthropic/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explique-moi l'\''apprentissage par renforcement"}
    ],
    "temperature": 0.7
  }'
```

### Lister les modèles

```bash
curl "http://localhost:8009/api/v1/anthropic/models"
```

### Health check

```bash
curl "http://localhost:8009/health"
```

## Documentation

- Swagger UI: http://localhost:8009/docs
- ReDoc: http://localhost:8009/redoc

## Modèles disponibles

- `claude-3-5-sonnet-20241022` - Sonnet 3.5, équilibre performance/coût (par défaut)
- `claude-3-5-haiku-20241022` - Haiku 3.5, rapide et économique
- `claude-3-opus-20240229` - Opus 3, le plus puissant
- `claude-3-sonnet-20240229` - Sonnet 3
- `claude-3-haiku-20240307` - Haiku 3

## Variables d'environnement

- `ANTHROPIC_API_KEY` - Clé API Anthropic (obligatoire)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: claude-3-5-sonnet-20241022)
- `DEFAULT_MAX_TOKENS` - Nombre maximum de tokens (défaut: 1024)
- `DEFAULT_TEMPERATURE` - Température (défaut: 0.7)
- `CORS_ORIGINS` - Origines CORS autorisées (défaut: *)
- `ENVIRONMENT` - Environnement (production/development)

## Licence

MIT
