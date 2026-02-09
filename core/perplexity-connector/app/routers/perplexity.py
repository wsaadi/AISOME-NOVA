"""
Router pour les endpoints de l'API Perplexity
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging

from app.models.perplexity_models import (
    ChatRequest,
    ChatResponse,
    ListModelsResponse,
    HealthResponse
)
from app.services.perplexity_service import PerplexityService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/perplexity", tags=["Perplexity"])

# Thread-safe singleton pattern with asyncio.Lock
_perplexity_service: Optional[PerplexityService] = None
_service_lock = asyncio.Lock()


async def get_perplexity_service(x_api_key: Optional[str] = Header(None)) -> PerplexityService:
    """
    Récupère une instance du service Perplexity (thread-safe)

    Args:
        x_api_key: Clé API optionnelle fournie dans le header X-API-Key

    Returns:
        Instance du service Perplexity
    """
    global _perplexity_service

    # Si une clé API est fournie dans le header, créer une instance dédiée
    if x_api_key:
        logger.info("Utilisation d'une clé API fournie dans le header")
        return PerplexityService(api_key=x_api_key)

    # Thread-safe singleton initialization
    if _perplexity_service is None:
        async with _service_lock:
            # Double-check locking pattern
            if _perplexity_service is None:
                try:
                    logger.info("Initialisation du service Perplexity (singleton)")
                    _perplexity_service = PerplexityService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service Perplexity: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service Perplexity non disponible. Veuillez configurer la clé API."
                    )

    return _perplexity_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Génère une réponse via l'API de chat Perplexity

    ## Description
    Cet endpoint permet d'envoyer une conversation à Perplexity et de recevoir une réponse.
    Perplexity a accès à Internet en temps réel pour des réponses actualisées.

    ## Paramètres
    - **messages**: Liste des messages de la conversation (obligatoire)
    - **model**: Modèle Perplexity à utiliser (optionnel)
    - **temperature**: Contrôle la créativité (0.0 = déterministe, 2.0 = très créatif)
    - **max_tokens**: Nombre maximum de tokens à générer
    - **top_p**: Top-p sampling pour la diversité
    - **presence_penalty**: Pénalité pour favoriser la diversité
    - **frequency_penalty**: Pénalité pour réduire les répétitions

    ## Headers optionnels
    - **X-API-Key**: Clé API Perplexity personnalisée

    ## Exemples
    ```json
    {
        "messages": [
            {"role": "user", "content": "Quelles sont les dernières nouvelles sur l'IA ?"}
        ],
        "model": "sonar",
        "temperature": 0.7,
        "max_tokens": 500
    }
    ```
    """
    try:
        service = await get_perplexity_service(x_api_key)
        return await service.chat_completion(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors du chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models(x_api_key: Optional[str] = Header(None)):
    """
    Liste tous les modèles Perplexity disponibles

    ## Description
    Récupère la liste de tous les modèles Perplexity disponibles.

    ## Headers optionnels
    - **X-API-Key**: Clé API Perplexity personnalisée

    ## Réponse
    Retourne une liste de modèles avec leurs informations.
    """
    try:
        service = await get_perplexity_service(x_api_key)
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
    et que la clé API Perplexity est configurée.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **perplexity_configured**: Indique si la clé API est configurée
    """
    global _perplexity_service

    # Vérifier si le service est configuré
    is_configured = False
    if _perplexity_service is not None:
        is_configured = _perplexity_service.is_configured()
    elif settings.perplexity_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="perplexity-connector",
        version=settings.api_version,
        perplexity_configured=is_configured
    )
