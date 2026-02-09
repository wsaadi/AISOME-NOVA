"""
Router pour les endpoints de l'API Anthropic
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging

from app.models.anthropic_models import (
    ChatRequest,
    ChatResponse,
    ListModelsResponse,
    HealthResponse
)
from app.services.anthropic_service import AnthropicService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/anthropic", tags=["Anthropic"])

# Thread-safe singleton pattern with asyncio.Lock
_anthropic_service: Optional[AnthropicService] = None
_service_lock = asyncio.Lock()


async def get_anthropic_service(x_api_key: Optional[str] = Header(None)) -> AnthropicService:
    """
    Récupère une instance du service Anthropic (thread-safe)

    Args:
        x_api_key: Clé API optionnelle fournie dans le header X-API-Key

    Returns:
        Instance du service Anthropic
    """
    global _anthropic_service

    # Si une clé API est fournie dans le header, créer une instance dédiée
    if x_api_key:
        logger.info("Utilisation d'une clé API fournie dans le header")
        return AnthropicService(api_key=x_api_key)

    # Thread-safe singleton initialization
    if _anthropic_service is None:
        async with _service_lock:
            # Double-check locking pattern
            if _anthropic_service is None:
                try:
                    logger.info("Initialisation du service Anthropic (singleton)")
                    _anthropic_service = AnthropicService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service Anthropic: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service Anthropic non disponible. Veuillez configurer la clé API."
                    )

    return _anthropic_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Génère une réponse via l'API de chat Anthropic

    ## Description
    Cet endpoint permet d'envoyer une conversation à Claude (Anthropic) et de recevoir une réponse.

    ## Paramètres
    - **messages**: Liste des messages de la conversation (obligatoire)
    - **model**: Modèle Claude à utiliser (optionnel, par défaut: claude-3-5-sonnet-20241022)
    - **temperature**: Contrôle la créativité (0.0 = déterministe, 1.0 = créatif)
    - **max_tokens**: Nombre maximum de tokens à générer
    - **top_p**: Top-p sampling pour la diversité
    - **top_k**: Top-k sampling

    ## Headers optionnels
    - **X-API-Key**: Clé API Anthropic personnalisée

    ## Exemples
    ```json
    {
        "messages": [
            {"role": "user", "content": "Explique-moi l'apprentissage par renforcement"}
        ],
        "model": "claude-3-5-sonnet-20241022",
        "temperature": 0.7,
        "max_tokens": 500
    }
    ```
    """
    try:
        service = await get_anthropic_service(x_api_key)
        return await service.chat_completion(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors du chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models(x_api_key: Optional[str] = Header(None)):
    """
    Liste tous les modèles Anthropic disponibles

    ## Description
    Récupère la liste de tous les modèles Claude disponibles.

    ## Headers optionnels
    - **X-API-Key**: Clé API Anthropic personnalisée

    ## Réponse
    Retourne une liste de modèles avec leurs informations.
    """
    try:
        service = await get_anthropic_service(x_api_key)
        return await service.list_models()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la récupération des modèles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Vérifie l'état de santé du service

    ## Description
    Endpoint de health check pour vérifier que le service est opérationnel
    et que la clé API Anthropic est configurée.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **anthropic_configured**: Indique si la clé API est configurée
    """
    global _anthropic_service

    # Vérifier si le service est configuré
    is_configured = False
    if _anthropic_service is not None:
        is_configured = _anthropic_service.is_configured()
    elif settings.anthropic_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="anthropic-connector",
        version=settings.api_version,
        anthropic_configured=is_configured
    )
