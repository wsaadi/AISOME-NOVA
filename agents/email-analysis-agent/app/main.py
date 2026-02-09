"""
Application principale de l'agent d'analyse d'emails
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging
import asyncio
from datetime import datetime
from typing import Optional

from app.config import settings
from app.services.email_analyzer import EmailAnalyzerService
from app.models.agent_models import (
    AgentStatus,
    ProcessingStatus,
    ProcessEmailRequest,
    ProcessEmailResponse,
    EmailAnalysisResult
)


# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Description complète de l'API
API_DESCRIPTION = """
# Agent d'Analyse d'Emails

Agent autonome qui analyse les emails entrants et crée des tâches WeKan.

## Fonctionnement

1. **Polling IMAP** - Vérifie les nouveaux emails toutes les 30 secondes
2. **Analyse IA** - Utilise Gemma 3 (via Ollama) pour identifier les tâches
3. **Création WeKan** - Crée automatiquement des cartes dans la colonne "À faire"

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Email Box  │────▶│   Agent     │────▶│   WeKan     │
│   (IMAP)    │     │  (Analyse)  │     │  (Cartes)   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────▼─────┐
                    │  Ollama   │
                    │ (Gemma 3) │
                    └───────────┘
```

## Configuration

Variables d'environnement :

### Services
- `OLLAMA_URL` - URL du connecteur Ollama (défaut: http://ollama-connector:8000)
- `WEKAN_URL` - URL de l'outil WeKan (défaut: http://wekan-tool:8000)
- `IMAP_URL` - URL de l'outil IMAP (défaut: http://imap-tool:8000)

### WeKan
- `WEKAN_BOARD_ID` - ID du board WeKan (obligatoire)
- `WEKAN_TODO_LIST_ID` - ID de la liste "À faire" (obligatoire)

### Polling
- `POLLING_INTERVAL_SECONDS` - Intervalle de polling (défaut: 30)
- `POLLING_ENABLED` - Activer le polling automatique (défaut: true)

### LLM
- `LLM_MODEL` - Modèle Ollama à utiliser (défaut: gemma3:4b)
- `LLM_TEMPERATURE` - Température du LLM (défaut: 0.3)
- `LLM_MAX_TOKENS` - Tokens max (défaut: 2048)

## Endpoints

### Status
- `GET /health` - État de santé de l'agent
- `GET /status` - Statut détaillé (services, statistiques)

### Contrôle
- `POST /start` - Démarrer le polling
- `POST /stop` - Arrêter le polling
- `POST /process-now` - Forcer un traitement immédiat

### Traitement manuel
- `POST /process-email` - Traiter un email spécifique
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


# Service d'analyse
analyzer_service: Optional[EmailAnalyzerService] = None

# Scheduler pour le polling
scheduler: Optional[AsyncIOScheduler] = None
polling_running = False


async def polling_job():
    """Job de polling exécuté périodiquement"""
    global analyzer_service, polling_running

    if not polling_running:
        return

    logger.info("Démarrage du job de polling...")

    try:
        if analyzer_service:
            results = await analyzer_service.process_emails()
            if results:
                logger.info(f"Traité {len(results)} emails")
    except Exception as e:
        logger.error(f"Erreur dans le job de polling: {e}")


@app.on_event("startup")
async def startup_event():
    """Actions au démarrage de l'application"""
    global analyzer_service, scheduler, polling_running

    logger.info(f"Démarrage de {settings.api_title} v{settings.api_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Polling interval: {settings.polling_interval_seconds}s")
    logger.info(f"Polling enabled: {settings.polling_enabled}")
    logger.info(f"LLM Model: {settings.llm_model}")

    # Initialiser le service d'analyse
    analyzer_service = EmailAnalyzerService()

    # Configurer le scheduler
    scheduler = AsyncIOScheduler()

    if settings.polling_enabled:
        scheduler.add_job(
            polling_job,
            IntervalTrigger(seconds=settings.polling_interval_seconds),
            id="email_polling",
            name="Email Polling Job",
            replace_existing=True
        )
        scheduler.start()
        polling_running = True
        logger.info(f"Polling démarré (intervalle: {settings.polling_interval_seconds}s)")
    else:
        logger.info("Polling désactivé par configuration")


@app.on_event("shutdown")
async def shutdown_event():
    """Actions à l'arrêt de l'application"""
    global scheduler, polling_running

    polling_running = False

    if scheduler:
        scheduler.shutdown()

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
            "status": "/status",
            "start": "/start",
            "stop": "/stop",
            "process_now": "/process-now"
        }
    }


@app.get("/health", tags=["Health"])
async def health():
    """Endpoint de santé pour les health checks Docker"""
    global analyzer_service

    services_ok = False
    if analyzer_service:
        services = await analyzer_service.check_services_health()
        services_ok = all(services.values())

    return JSONResponse(
        status_code=200 if services_ok else 503,
        content={
            "status": "healthy" if services_ok else "degraded",
            "service": "email-analysis-agent",
            "version": settings.api_version,
            "polling_enabled": settings.polling_enabled,
            "polling_running": polling_running
        }
    )


@app.get("/status", response_model=AgentStatus, tags=["Status"])
async def get_status():
    """Retourne le statut détaillé de l'agent"""
    global analyzer_service, polling_running

    services_status = {}
    processing_status = ProcessingStatus(is_running=polling_running)

    if analyzer_service:
        services_status = await analyzer_service.check_services_health()
        processing_status = analyzer_service.get_processing_status()
        processing_status.is_running = polling_running

    return AgentStatus(
        status="running" if polling_running else "stopped",
        service="email-analysis-agent",
        version=settings.api_version,
        polling_enabled=settings.polling_enabled,
        polling_interval=settings.polling_interval_seconds,
        services_status=services_status,
        processing=processing_status
    )


@app.post("/start", tags=["Control"])
async def start_polling():
    """Démarre le polling automatique"""
    global scheduler, polling_running

    if polling_running:
        return {"message": "Le polling est déjà en cours", "status": "running"}

    if scheduler and not scheduler.running:
        scheduler.start()

    polling_running = True
    logger.info("Polling démarré manuellement")

    return {"message": "Polling démarré", "status": "running"}


@app.post("/stop", tags=["Control"])
async def stop_polling():
    """Arrête le polling automatique"""
    global polling_running

    if not polling_running:
        return {"message": "Le polling est déjà arrêté", "status": "stopped"}

    polling_running = False
    logger.info("Polling arrêté manuellement")

    return {"message": "Polling arrêté", "status": "stopped"}


@app.post("/process-now", tags=["Control"])
async def process_now(background_tasks: BackgroundTasks):
    """Force un traitement immédiat des emails"""
    global analyzer_service

    if not analyzer_service:
        raise HTTPException(status_code=503, detail="Service non initialisé")

    # Lancer le traitement en arrière-plan
    background_tasks.add_task(analyzer_service.process_emails)

    return {
        "message": "Traitement lancé en arrière-plan",
        "status": "processing"
    }


@app.post("/process-email", response_model=ProcessEmailResponse, tags=["Manual Processing"])
async def process_specific_email(request: ProcessEmailRequest):
    """Traite un email spécifique par son UID"""
    global analyzer_service

    if not analyzer_service:
        raise HTTPException(status_code=503, detail="Service non initialisé")

    try:
        # Récupérer l'email spécifique
        import httpx

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.imap_url}/api/v1/imap/fetch",
                json={
                    "folder": request.folder,
                    "unread_only": False,
                    "limit": 100,
                    "include_body": True
                }
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                return ProcessEmailResponse(
                    success=False,
                    error=f"Erreur IMAP: {data.get('error')}"
                )

            # Trouver l'email par UID
            email = None
            for e in data.get("emails", []):
                if e.get("uid") == request.email_uid:
                    email = e
                    break

            if not email:
                return ProcessEmailResponse(
                    success=False,
                    error=f"Email avec UID {request.email_uid} non trouvé"
                )

            # Traiter l'email
            result = await analyzer_service.process_single_email(email)

            return ProcessEmailResponse(
                success=result.success,
                result=result,
                error=result.error
            )

    except Exception as e:
        logger.error(f"Erreur lors du traitement de l'email: {e}")
        return ProcessEmailResponse(
            success=False,
            error=str(e)
        )


@app.get("/stats", tags=["Status"])
async def get_stats():
    """Retourne les statistiques de traitement"""
    global analyzer_service

    if not analyzer_service:
        return {"error": "Service non initialisé"}

    return {
        "emails_processed": analyzer_service.stats["emails_processed"],
        "tasks_created": analyzer_service.stats["tasks_created"],
        "errors_count": analyzer_service.stats["errors_count"],
        "last_check": analyzer_service.stats["last_check"],
        "processed_emails_stored": analyzer_service.processed_store.get_processed_count()
    }


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
