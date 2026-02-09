"""
Application principale du connecteur NVIDIA NIM
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.routers import nvidia_nim_router


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Creer l'application FastAPI
app = FastAPI(
    title=settings.api_title,
    description="Connecteur central pour interagir avec NVIDIA NIM a travers toute la plateforme agent-pf.",
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
app.include_router(nvidia_nim_router)


@app.on_event("startup")
async def startup_event():
    """Actions au demarrage de l'application"""
    logger.info(f"Demarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")

    if settings.nvidia_nim_api_key:
        logger.info("Cle API NVIDIA NIM configuree")
    else:
        logger.warning("Cle API NVIDIA NIM non configuree ! Configurez NVIDIA_NIM_API_KEY")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions a l'arret de l'application"""
    logger.info(f"Arret de {settings.api_title}")


@app.get("/", tags=["Root"])
async def root():
    """Point d'entree principal de l'API"""
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
            "chat": "/api/v1/nvidia-nim/chat",
            "models": "/api/v1/nvidia-nim/models"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de sante pour les health checks"""
    is_configured = settings.nvidia_nim_api_key is not None

    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy" if is_configured else "unhealthy",
            "service": "nvidia-nim-connector",
            "version": settings.api_version,
            "nvidia_nim_configured": is_configured
        }
    )


# Gestionnaire d'erreurs global
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Gestion globale des erreurs"""
    logger.error(f"Erreur non geree: {exc}", exc_info=True)
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
