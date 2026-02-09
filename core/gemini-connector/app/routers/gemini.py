"""
Router pour les endpoints de l'API Gemini
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header
from typing import Optional
import logging

from app.models.gemini_models import (
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ListModelsResponse,
    HealthResponse
)
from app.services.gemini_service import GeminiService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/gemini", tags=["Gemini"])

# Thread-safe singleton pattern with asyncio.Lock
_gemini_service: Optional[GeminiService] = None
_service_lock = asyncio.Lock()


async def get_gemini_service(x_api_key: Optional[str] = Header(None)) -> GeminiService:
    """
    Récupère une instance du service Gemini (thread-safe)

    Args:
        x_api_key: Clé API optionnelle fournie dans le header X-API-Key

    Returns:
        Instance du service Gemini
    """
    global _gemini_service

    # Si une clé API est fournie dans le header, créer une instance dédiée
    if x_api_key:
        logger.info("Utilisation d'une clé API fournie dans le header")
        return GeminiService(api_key=x_api_key)

    # Thread-safe singleton initialization
    if _gemini_service is None:
        async with _service_lock:
            # Double-check locking pattern
            if _gemini_service is None:
                try:
                    logger.info("Initialisation du service Gemini (singleton)")
                    _gemini_service = GeminiService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service Gemini: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service Gemini non disponible. Veuillez configurer la clé API."
                    )

    return _gemini_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Génère une réponse via l'API de chat Gemini

    ## Description
    Cet endpoint permet d'envoyer une conversation à Google Gemini et de recevoir une réponse.

    ## Paramètres
    - **messages**: Liste des messages de la conversation (obligatoire)
    - **model**: Modèle Gemini à utiliser (optionnel, par défaut: gemini-2.0-flash-exp)
    - **temperature**: Contrôle la créativité (0.0 = déterministe, 2.0 = très créatif)
    - **max_tokens**: Nombre maximum de tokens à générer
    - **top_p**: Top-p sampling pour la diversité
    - **top_k**: Top-k sampling

    ## Headers optionnels
    - **X-API-Key**: Clé API Gemini personnalisée

    ## Exemples
    ```json
    {
        "messages": [
            {"role": "user", "content": "Explique-moi le machine learning"}
        ],
        "model": "gemini-2.0-flash-exp",
        "temperature": 0.7,
        "max_tokens": 500
    }
    ```
    """
    try:
        service = await get_gemini_service(x_api_key)
        return await service.chat_completion(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors du chat completion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(
    request: EmbeddingRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Génère des embeddings pour les textes fournis

    ## Description
    Cet endpoint transforme des textes en vecteurs numériques (embeddings) utilisables
    pour la recherche sémantique, la classification, etc.

    ## Paramètres
    - **input**: Liste des textes à transformer en embeddings (obligatoire)
    - **model**: Modèle d'embedding à utiliser (optionnel, par défaut: text-embedding-004)

    ## Headers optionnels
    - **X-API-Key**: Clé API Gemini personnalisée

    ## Exemples
    ```json
    {
        "input": [
            "Premier texte à transformer",
            "Deuxième texte à transformer"
        ],
        "model": "text-embedding-004"
    }
    ```
    """
    try:
        service = await get_gemini_service(x_api_key)
        return await service.create_embeddings(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la création des embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models(x_api_key: Optional[str] = Header(None)):
    """
    Liste tous les modèles Gemini disponibles

    ## Description
    Récupère la liste de tous les modèles Google Gemini disponibles.

    ## Headers optionnels
    - **X-API-Key**: Clé API Gemini personnalisée

    ## Réponse
    Retourne une liste de modèles avec leurs informations.
    """
    try:
        service = await get_gemini_service(x_api_key)
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
    et que la clé API Gemini est configurée.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **gemini_configured**: Indique si la clé API est configurée
    """
    global _gemini_service

    # Vérifier si le service est configuré
    is_configured = False
    if _gemini_service is not None:
        is_configured = _gemini_service.is_configured()
    elif settings.gemini_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="gemini-connector",
        version=settings.api_version,
        gemini_configured=is_configured
    )
