"""
Router pour les endpoints de l'API NVIDIA NIM
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging

from app.models.nvidia_nim_models import (
    ChatRequest,
    ChatResponse,
    ListModelsResponse,
    HealthResponse
)
from app.services.nvidia_nim_service import NvidiaNimService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/nvidia-nim", tags=["NVIDIA NIM"])

# Thread-safe singleton pattern with asyncio.Lock
_nvidia_nim_service: Optional[NvidiaNimService] = None
_service_lock = asyncio.Lock()


async def get_nvidia_nim_service(x_api_key: Optional[str] = Header(None)) -> NvidiaNimService:
    """
    Recupere une instance du service NVIDIA NIM (thread-safe)
    """
    global _nvidia_nim_service

    if x_api_key:
        logger.info("Utilisation d'une cle API fournie dans le header")
        return NvidiaNimService(api_key=x_api_key)

    if _nvidia_nim_service is None:
        async with _service_lock:
            if _nvidia_nim_service is None:
                try:
                    logger.info("Initialisation du service NVIDIA NIM (singleton)")
                    _nvidia_nim_service = NvidiaNimService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service NVIDIA NIM: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service NVIDIA NIM non disponible. Veuillez configurer la cle API."
                    )

    return _nvidia_nim_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Genere une reponse via l'API de chat NVIDIA NIM
    """
    try:
        service = await get_nvidia_nim_service(x_api_key)
        return await service.chat_completion(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors du chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models(x_api_key: Optional[str] = Header(None)):
    """
    Liste tous les modeles NVIDIA NIM disponibles
    """
    try:
        service = await get_nvidia_nim_service(x_api_key)
        return await service.list_models()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la recuperation des modeles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Verifie l'etat de sante du service
    """
    global _nvidia_nim_service

    is_configured = False
    if _nvidia_nim_service is not None:
        is_configured = _nvidia_nim_service.is_configured()
    elif settings.nvidia_nim_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="nvidia-nim-connector",
        version=settings.api_version,
        nvidia_nim_configured=is_configured
    )
