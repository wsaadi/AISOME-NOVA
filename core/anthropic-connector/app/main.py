"""
Application principale du connecteur Anthropic
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

from app.config import settings
from app.routers import anthropic_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Connecteur Anthropic Claude

Connecteur central pour interagir avec Anthropic Claude à travers toute la plateforme agent-pf.

## 🎯 Objectif

Ce connecteur offre une interface unifiée pour exploiter les capacités de Claude,
les modèles d'IA les plus avancés d'Anthropic.

## 🚀 Fonctionnalités

### Chat Completion
* **Conversation contextuelle** - Maintenir un historique de conversation
* **Multi-modèles** - Accès aux modèles Claude (Opus, Sonnet, Haiku)
* **Contrôle fin** - Température, max tokens, top-p, top-k
* **Raisonnement avancé** - Capacités de raisonnement et d'analyse poussées

### Gestion des modèles
* **Liste des modèles** - Consulter tous les modèles Claude disponibles
* **Informations détaillées** - Métadonnées sur chaque modèle

## 🔐 Authentification

L'API supporte deux modes d'authentification :

### 1. Configuration globale (recommandé)
Configurez la clé API via la variable d'environnement `ANTHROPIC_API_KEY`.

### 2. Clé API par requête
Fournissez une clé API spécifique dans le header `X-API-Key`.

## 📊 Modèles disponibles

- **claude-3-5-sonnet-20241022** - Sonnet 3.5, équilibre performance/coût (par défaut)
- **claude-3-5-haiku-20241022** - Haiku 3.5, rapide et économique
- **claude-3-opus-20240229** - Opus 3, le plus puissant
- **claude-3-sonnet-20240229** - Sonnet 3
- **claude-3-haiku-20240307** - Haiku 3

## 💡 Exemple d'utilisation

```python
import httpx

response = httpx.post(
    "http://localhost:8009/api/v1/anthropic/chat",
    json={
        "messages": [
            {"role": "user", "content": "Explique-moi l'apprentissage par renforcement"}
        ],
        "temperature": 0.7
    }
)
```

## 🔧 Configuration

Variables d'environnement :

- `ANTHROPIC_API_KEY` - Clé API Anthropic (obligatoire)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: claude-3-5-sonnet-20241022)
- `DEFAULT_MAX_TOKENS` - Tokens max par défaut (défaut: 1024)
- `DEFAULT_TEMPERATURE` - Température par défaut (défaut: 0.7)
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
app.include_router(anthropic_router)


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")

    if settings.anthropic_api_key:
        logger.info("Clé API Anthropic configurée ✓")
    else:
        logger.warning("⚠️  Clé API Anthropic non configurée ! Configurez ANTHROPIC_API_KEY")


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
            "chat": "/api/v1/anthropic/chat",
            "models": "/api/v1/anthropic/models"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks"""
    is_configured = settings.anthropic_api_key is not None

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if is_configured else "unhealthy",
            "service": "anthropic-connector",
            "version": settings.api_version,
            "anthropic_configured": is_configured
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
