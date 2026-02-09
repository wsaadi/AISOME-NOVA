"""
Router pour les endpoints de l'API Ollama
"""
import asyncio
from fastapi import APIRouter, HTTPException
from typing import Optional
import logging

from app.models.ollama_models import (
    ChatRequest,
    ChatResponse,
    ListModelsResponse,
    HealthResponse,
    PullModelRequest,
    PullModelResponse
)
from app.services.ollama_service import OllamaService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ollama", tags=["Ollama"])

# Singleton pattern with asyncio.Lock
_ollama_service: Optional[OllamaService] = None
_service_lock = asyncio.Lock()


async def get_ollama_service() -> OllamaService:
    """
    Récupère une instance du service Ollama (thread-safe singleton)

    Returns:
        Instance du service Ollama
    """
    global _ollama_service

    if _ollama_service is None:
        async with _service_lock:
            if _ollama_service is None:
                try:
                    logger.info("Initialisation du service Ollama (singleton)")
                    _ollama_service = OllamaService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service Ollama: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service Ollama non disponible."
                    )

    return _ollama_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """
    Génère une réponse via l'API de chat Ollama (inférence locale)

    ## Description
    Cet endpoint permet d'envoyer une conversation à Ollama et de recevoir une réponse.
    Idéal pour l'inférence locale légère avec des modèles comme Gemma 3.

    ## Paramètres
    - **messages**: Liste des messages de la conversation (obligatoire)
    - **model**: Modèle Ollama à utiliser (optionnel, par défaut: gemma3:4b)
    - **temperature**: Contrôle la créativité (0.0 = déterministe, 2.0 = très créatif)
    - **max_tokens**: Nombre maximum de tokens à générer
    - **top_p**: Top-p sampling pour la diversité

    ## Exemples
    ```json
    {
        "messages": [
            {"role": "system", "content": "Tu es un assistant qui analyse les emails."},
            {"role": "user", "content": "Identifie les tâches dans cet email..."}
        ],
        "model": "gemma3:4b",
        "temperature": 0.3,
        "max_tokens": 1024
    }
    ```
    """
    try:
        service = await get_ollama_service()
        return await service.chat_completion(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors du chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models():
    """
    Liste tous les modèles Ollama disponibles localement

    ## Description
    Récupère la liste de tous les modèles téléchargés et disponibles sur l'instance Ollama.

    ## Réponse
    Retourne une liste de modèles avec leurs informations (nom, taille, date de modification).
    """
    try:
        service = await get_ollama_service()
        return await service.list_models()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la récupération des modèles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pull", response_model=PullModelResponse)
async def pull_model(request: PullModelRequest):
    """
    Télécharge un modèle depuis le registre Ollama

    ## Description
    Télécharge un modèle spécifié depuis la bibliothèque Ollama.
    Cette opération peut prendre plusieurs minutes selon la taille du modèle.

    ## Paramètres
    - **name**: Nom du modèle à télécharger (ex: gemma3:4b, llama3:8b)

    ## Exemples
    ```json
    {
        "name": "gemma3:4b"
    }
    ```
    """
    try:
        service = await get_ollama_service()
        return await service.pull_model(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors du téléchargement du modèle: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Vérifie l'état de santé du service

    ## Description
    Endpoint de health check pour vérifier que le service est opérationnel
    et que l'instance Ollama est accessible.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **ollama_connected**: Indique si Ollama est accessible
    """
    service = await get_ollama_service()
    is_connected = await service.check_connection()

    return HealthResponse(
        status="healthy" if is_connected else "unhealthy",
        service="ollama-connector",
        version=settings.api_version,
        ollama_connected=is_connected,
        default_model=settings.default_model
    )
