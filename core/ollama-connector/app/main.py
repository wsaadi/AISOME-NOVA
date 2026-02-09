"""
Application principale du connecteur Ollama (inférence locale)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import logging

from app.config import settings
from app.routers import ollama_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Connecteur Ollama - Inférence Locale

Connecteur pour exécuter des modèles LLM en local avec Ollama.
Parfait pour des cas d'usage légers nécessitant confidentialité et faible latence.

## Objectif

Ce connecteur permet d'utiliser des modèles comme **Gemma 3** en inférence locale,
sans envoyer de données vers des APIs cloud externes.

## Fonctionnalités

### Chat Completion
* **Conversation contextuelle** - Maintenir un historique de conversation
* **Multi-modèles** - Accès à tous les modèles Ollama (gemma, llama, mistral, etc.)
* **Contrôle fin** - Température, max tokens, top-p
* **Inférence locale** - Aucune donnée envoyée vers le cloud

### Gestion des modèles
* **Liste des modèles** - Consulter tous les modèles disponibles localement
* **Téléchargement** - Télécharger de nouveaux modèles depuis le registre Ollama

## Modèles recommandés

- **gemma3:4b** - Google Gemma 3 4B (léger, rapide) - **recommandé pour l'analyse d'emails**
- **gemma3:12b** - Google Gemma 3 12B (plus précis)
- **llama3:8b** - Meta Llama 3 8B
- **mistral:7b** - Mistral 7B

## Exemples d'utilisation

### Chat simple
```python
import httpx

response = httpx.post(
    "http://localhost:8031/api/v1/ollama/chat",
    json={
        "messages": [
            {"role": "user", "content": "Analyse cet email et identifie les tâches"}
        ],
        "temperature": 0.3
    }
)
```

### Télécharger un modèle
```python
response = httpx.post(
    "http://localhost:8031/api/v1/ollama/pull",
    json={"name": "gemma3:4b"}
)
```

## Configuration

Variables d'environnement :

- `OLLAMA_BASE_URL` - URL de l'instance Ollama (défaut: http://ollama:11434)
- `DEFAULT_MODEL` - Modèle par défaut (défaut: gemma3:4b)
- `DEFAULT_MAX_TOKENS` - Tokens max par défaut (défaut: 2048)
- `DEFAULT_TEMPERATURE` - Température par défaut (défaut: 0.7)

## Documentation

- **Swagger UI** : `/docs`
- **ReDoc** : `/redoc`
- **OpenAPI Schema** : `/openapi.json`

## Health Check

Endpoint : `GET /health`

Vérifiez l'état du service et la connexion à Ollama.
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
app.include_router(ollama_router)


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Ollama URL: {settings.ollama_base_url}")
    logger.info(f"Modèle par défaut: {settings.default_model}")


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
            "chat": "/api/v1/ollama/chat",
            "models": "/api/v1/ollama/models",
            "pull": "/api/v1/ollama/pull"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks Docker"""
    from app.services.ollama_service import OllamaService

    service = OllamaService()
    is_connected = await service.check_connection()

    return JSONResponse(
        status_code=200 if is_connected else 503,
        content={
            "status": "healthy" if is_connected else "unhealthy",
            "service": "ollama-connector",
            "version": settings.api_version,
            "ollama_connected": is_connected,
            "ollama_url": settings.ollama_base_url
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
