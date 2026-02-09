"""
Application principale du connecteur Gemini
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

from app.config import settings
from app.routers import gemini_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Connecteur Google Gemini

Connecteur central pour interagir avec Google Gemini à travers toute la plateforme agent-pf.

## 🎯 Objectif

Ce connecteur offre une interface unifiée pour exploiter les capacités de Google Gemini,
les modèles d'IA multimodaux les plus avancés de Google.

## 🚀 Fonctionnalités

### Chat Completion
* **Conversation contextuelle** - Maintenir un historique de conversation
* **Multi-modèles** - Accès aux modèles Gemini (Flash, Pro, etc.)
* **Contrôle fin** - Température, max tokens, top-p, top-k
* **Support multimodal** - Texte, images, et plus

### Embeddings
* **Vectorisation de texte** - Transformer du texte en vecteurs numériques
* **Recherche sémantique** - Utiliser les embeddings pour la similarité
* **Modèles optimisés** - text-embedding-004 pour les meilleurs résultats

### Gestion des modèles
* **Liste des modèles** - Consulter tous les modèles disponibles
* **Informations détaillées** - Métadonnées sur chaque modèle

## 🔐 Authentification

L'API supporte deux modes d'authentification :

### 1. Configuration globale (recommandé)
Configurez la clé API via la variable d'environnement `GEMINI_API_KEY`.

### 2. Clé API par requête
Fournissez une clé API spécifique dans le header `X-API-Key`.

## 📊 Modèles disponibles

- **gemini-2.0-flash-exp** - Modèle Flash rapide et efficace (par défaut)
- **gemini-1.5-pro** - Modèle Pro le plus puissant
- **gemini-1.5-flash** - Modèle Flash stable
- **text-embedding-004** - Pour les embeddings

## 💡 Exemple d'utilisation

```python
import httpx

response = httpx.post(
    "http://localhost:8008/api/v1/gemini/chat",
    json={
        "messages": [
            {"role": "user", "content": "Explique-moi le machine learning"}
        ],
        "temperature": 0.7
    }
)
```

## 🔧 Configuration

Variables d'environnement :

- `GEMINI_API_KEY` - Clé API Gemini (obligatoire)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: gemini-2.0-flash-exp)
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
app.include_router(gemini_router)


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")

    if settings.gemini_api_key:
        logger.info("Clé API Gemini configurée ✓")
    else:
        logger.warning("⚠️  Clé API Gemini non configurée ! Configurez GEMINI_API_KEY")


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
            "chat": "/api/v1/gemini/chat",
            "embeddings": "/api/v1/gemini/embeddings",
            "models": "/api/v1/gemini/models"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks"""
    is_configured = settings.gemini_api_key is not None

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if is_configured else "unhealthy",
            "service": "gemini-connector",
            "version": settings.api_version,
            "gemini_configured": is_configured
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
