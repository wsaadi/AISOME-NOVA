"""
Application principale du connecteur OpenAI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routers import openai_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Connecteur OpenAI

Connecteur central et standard pour interagir avec OpenAI à travers toute la plateforme agent-pf.

## 🎯 Objectif

Ce connecteur offre une interface unifiée pour que tous les agents de la plateforme puissent
exploiter les capacités d'OpenAI en entrée et en sortie.

## 🚀 Fonctionnalités

### Chat Completion
* **Conversation contextuelle** - Maintenir un historique de conversation
* **Multi-modèles** - Accès à tous les modèles OpenAI (GPT-3.5, GPT-4, etc.)
* **Contrôle fin** - Température, max tokens, top-p, frequency/presence penalty
* **Streaming** - Support du streaming pour les réponses en temps réel

### Embeddings
* **Vectorisation de texte** - Transformer du texte en vecteurs numériques
* **Recherche sémantique** - Utiliser les embeddings pour la similarité
* **Batch processing** - Traiter plusieurs textes en une seule requête

### Gestion des modèles
* **Liste des modèles** - Consulter tous les modèles disponibles
* **Informations détaillées** - Métadonnées sur chaque modèle

## 🔐 Authentification

L'API supporte deux modes d'authentification :

### 1. Configuration globale (recommandé)
Configurez la clé API via la variable d'environnement `OPENAI_API_KEY`.
Tous les appels utiliseront cette clé par défaut.

### 2. Clé API par requête
Fournissez une clé API spécifique dans le header `X-API-Key`.
Utile pour des agents avec leurs propres clés.

```bash
curl -X POST "http://localhost:8006/api/v1/openai/chat" \\
  -H "X-API-Key: your-openai-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

## 📊 Modèles disponibles

- **gpt-3.5-turbo** - Rapide et économique (par défaut)
- **gpt-4** - Plus puissant et précis
- **gpt-4-turbo** - Optimisé pour la vitesse
- **text-embedding-ada-002** - Pour les embeddings

## 💡 Exemples d'utilisation

### Chat simple
```python
import httpx

response = httpx.post(
    "http://localhost:8006/api/v1/openai/chat",
    json={
        "messages": [
            {"role": "user", "content": "Explique-moi la photosynthèse"}
        ],
        "temperature": 0.7
    }
)
```

### Conversation multi-tours
```python
response = httpx.post(
    "http://localhost:8006/api/v1/openai/chat",
    json={
        "messages": [
            {"role": "system", "content": "Tu es un assistant expert en science"},
            {"role": "user", "content": "Qu'est-ce qu'un trou noir ?"},
            {"role": "assistant", "content": "Un trou noir est..."},
            {"role": "user", "content": "Comment se forment-ils ?"}
        ]
    }
)
```

### Génération d'embeddings
```python
response = httpx.post(
    "http://localhost:8006/api/v1/openai/embeddings",
    json={
        "input": [
            "Document important à vectoriser",
            "Autre document à comparer"
        ]
    }
)
```

## 🔧 Configuration

Variables d'environnement :

- `OPENAI_API_KEY` - Clé API OpenAI (obligatoire)
- `CORS_ORIGINS` - Origines CORS autorisées (défaut: *)
- `ENVIRONMENT` - Environnement (production/development)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: gpt-3.5-turbo)
- `DEFAULT_MAX_TOKENS` - Tokens max par défaut (défaut: 1024)
- `DEFAULT_TEMPERATURE` - Température par défaut (défaut: 0.7)

## 📚 Documentation

- **Swagger UI** : `/docs`
- **ReDoc** : `/redoc`
- **OpenAPI Schema** : `/openapi.json`

## 🏥 Health Check

Endpoint : `GET /health`

Vérifiez l'état du service et la configuration de la clé API.
"""


# Créer l'application FastAPI
app = FastAPI(
    title=settings.api_title,
    description=API_DESCRIPTION,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Enregistrer les routers
app.include_router(openai_router)


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")

    if settings.openai_api_key:
        logger.info("Clé API OpenAI configurée ✓")
    else:
        logger.warning("⚠️  Clé API OpenAI non configurée ! Configurez OPENAI_API_KEY")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application"""
    logger.info(f"Arrêt de {settings.api_title}")


@app.get("/", tags=["Root"])
async def root():
    """Point d'entrée principal de l'API"""
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "status": "operational",
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "endpoints": {
            "health": "/health",
            "chat": "/api/v1/openai/chat",
            "embeddings": "/api/v1/openai/embeddings",
            "models": "/api/v1/openai/models"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks"""
    is_configured = settings.openai_api_key is not None

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if is_configured else "unhealthy",
            "service": "openai-connector",
            "version": settings.api_version,
            "openai_configured": is_configured
        }
    )


# Gestionnaire d'erreurs global
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Gestion globale des erreurs"""
    logger.error(f"Erreur non gérée: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"Erreur interne du serveur: {str(exc)}",
            "error": type(exc).__name__
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development"
    )
