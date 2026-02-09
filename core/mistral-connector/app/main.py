"""
Application principale du connecteur Mistral AI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

from app.config import settings
from app.routers import mistral_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Connecteur Mistral AI

Connecteur central et standard pour interagir avec Mistral AI à travers toute la plateforme agent-pf.

## 🎯 Objectif

Ce connecteur offre une interface unifiée pour que tous les agents de la plateforme puissent
exploiter les capacités de Mistral AI en entrée et en sortie.

## 🚀 Fonctionnalités

### Chat Completion
* **Conversation contextuelle** - Maintenir un historique de conversation
* **Multi-modèles** - Accès à tous les modèles Mistral (small, medium, large)
* **Contrôle fin** - Température, max tokens, top-p, safe prompt
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
Configurez la clé API via la variable d'environnement `MISTRAL_API_KEY`.
Tous les appels utiliseront cette clé par défaut.

### 2. Clé API par requête
Fournissez une clé API spécifique dans le header `X-API-Key`.
Utile pour des agents avec leurs propres clés.

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \\
  -H "X-API-Key: your-mistral-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

## 📊 Modèles disponibles

- **mistral-tiny** - Rapide et économique
- **mistral-small-latest** - Équilibré (par défaut)
- **mistral-medium-latest** - Plus puissant
- **mistral-large-latest** - Le plus performant
- **mistral-embed** - Pour les embeddings

## 💡 Exemples d'utilisation

### Chat simple
```python
import httpx

response = httpx.post(
    "http://localhost:8005/api/v1/mistral/chat",
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
    "http://localhost:8005/api/v1/mistral/chat",
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
    "http://localhost:8005/api/v1/mistral/embeddings",
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

- `MISTRAL_API_KEY` - Clé API Mistral (obligatoire)
- `CORS_ORIGINS` - Origines CORS autorisées (défaut: *)
- `ENVIRONMENT` - Environnement (production/development)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: mistral-small-latest)
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
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
)


# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)


# Enregistrer les routers
app.include_router(mistral_router)


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")

    if settings.mistral_api_key:
        logger.info("Clé API Mistral configurée ✓")
    else:
        logger.warning("⚠️  Clé API Mistral non configurée ! Configurez MISTRAL_API_KEY")


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
            "chat": "/api/v1/mistral/chat",
            "embeddings": "/api/v1/mistral/embeddings",
            "models": "/api/v1/mistral/models"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks"""
    is_configured = settings.mistral_api_key is not None

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if is_configured else "unhealthy",
            "service": "mistral-connector",
            "version": settings.api_version,
            "mistral_configured": is_configured
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
            "message": "Internal server error" if settings.environment == "production" else f"{type(exc).__name__}: {str(exc)}",
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
