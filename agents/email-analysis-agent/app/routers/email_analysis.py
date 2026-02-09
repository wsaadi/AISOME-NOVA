"""
Email Analysis Agent - Route handlers.

All route handlers for email analysis operations, extracted from main.py
to follow the standard router pattern used by agent-builder and agent-runtime.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
import httpx
import logging
from typing import Optional

from ..config import settings
from ..services.email_analyzer import EmailAnalyzerService
from ..models.agent_models import (
    AgentStatus,
    ProcessingStatus,
    ProcessEmailRequest,
    ProcessEmailResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Module-level state (managed by main.py lifespan)
# ---------------------------------------------------------------------------

_analyzer_service: Optional[EmailAnalyzerService] = None
_polling_running: bool = False


def set_analyzer_service(service: Optional[EmailAnalyzerService]) -> None:
    """Set the analyzer service instance (called from main.py lifespan)."""
    global _analyzer_service
    _analyzer_service = service


def get_analyzer_service() -> Optional[EmailAnalyzerService]:
    """Get the current analyzer service instance."""
    return _analyzer_service


def set_polling_state(running: bool) -> None:
    """Update the polling running flag (called from main.py lifespan and control endpoints)."""
    global _polling_running
    _polling_running = running


def get_polling_state() -> bool:
    """Return the current polling running flag."""
    return _polling_running


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/status", response_model=AgentStatus, tags=["Status"])
async def get_status():
    """Retourne le statut detaille de l'agent."""
    services_status = {}
    processing_status = ProcessingStatus(is_running=_polling_running)

    if _analyzer_service:
        services_status = await _analyzer_service.check_services_health()
        processing_status = _analyzer_service.get_processing_status()
        processing_status.is_running = _polling_running

    return AgentStatus(
        status="running" if _polling_running else "stopped",
        service=settings.service_name,
        version=settings.service_version,
        polling_enabled=settings.polling_enabled,
        polling_interval=settings.polling_interval_seconds,
        services_status=services_status,
        processing=processing_status,
    )


@router.post("/start", tags=["Control"])
async def start_polling():
    """Demarre le polling automatique."""
    global _polling_running

    if _polling_running:
        return {"message": "Le polling est deja en cours", "status": "running"}

    # Import scheduler state from main to start it if needed
    from ..main import get_scheduler

    scheduler = get_scheduler()
    if scheduler and not scheduler.running:
        scheduler.start()

    _polling_running = True
    logger.info("Polling demarre manuellement")

    return {"message": "Polling demarre", "status": "running"}


@router.post("/stop", tags=["Control"])
async def stop_polling():
    """Arrete le polling automatique."""
    global _polling_running

    if not _polling_running:
        return {"message": "Le polling est deja arrete", "status": "stopped"}

    _polling_running = False
    logger.info("Polling arrete manuellement")

    return {"message": "Polling arrete", "status": "stopped"}


@router.post("/process-now", tags=["Control"])
async def process_now(background_tasks: BackgroundTasks):
    """Force un traitement immediat des emails."""
    if not _analyzer_service:
        raise HTTPException(status_code=503, detail="Service non initialise")

    # Lancer le traitement en arriere-plan
    background_tasks.add_task(_analyzer_service.process_emails)

    return {
        "message": "Traitement lance en arriere-plan",
        "status": "processing",
    }


@router.post("/process-email", response_model=ProcessEmailResponse, tags=["Manual Processing"])
async def process_specific_email(request: ProcessEmailRequest):
    """Traite un email specifique par son UID."""
    if not _analyzer_service:
        raise HTTPException(status_code=503, detail="Service non initialise")

    try:
        # Recuperer l'email specifique
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{settings.imap_url}/api/v1/imap/fetch",
                json={
                    "folder": request.folder,
                    "unread_only": False,
                    "limit": 100,
                    "include_body": True,
                },
            )
            response.raise_for_status()
            data = response.json()

            if not data.get("success"):
                return ProcessEmailResponse(
                    success=False,
                    error=f"Erreur IMAP: {data.get('error')}",
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
                    error=f"Email avec UID {request.email_uid} non trouve",
                )

            # Traiter l'email
            result = await _analyzer_service.process_single_email(email)

            return ProcessEmailResponse(
                success=result.success,
                result=result,
                error=result.error,
            )

    except Exception as e:
        logger.error(f"Erreur lors du traitement de l'email: {e}")
        return ProcessEmailResponse(
            success=False,
            error=str(e),
        )


@router.get("/stats", tags=["Status"])
async def get_stats():
    """Retourne les statistiques de traitement."""
    if not _analyzer_service:
        return {"error": "Service non initialise"}

    return {
        "emails_processed": _analyzer_service.stats["emails_processed"],
        "tasks_created": _analyzer_service.stats["tasks_created"],
        "errors_count": _analyzer_service.stats["errors_count"],
        "last_check": _analyzer_service.stats["last_check"],
        "processed_emails_stored": _analyzer_service.processed_store.get_processed_count(),
    }
