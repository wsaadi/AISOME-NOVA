"""
Router pour les endpoints de l'API OpenAI
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import logging

from app.models.openai_models import (
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ListModelsResponse,
    HealthResponse
)
from app.services.openai_service import OpenAIService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/openai", tags=["OpenAI"])

# Thread-safe singleton pattern with asyncio.Lock
_openai_service: Optional[OpenAIService] = None
_service_lock = asyncio.Lock()


async def get_openai_service(x_api_key: Optional[str] = Header(None)) -> OpenAIService:
    """
    Récupère une instance du service OpenAI (thread-safe)

    Args:
        x_api_key: Clé API optionnelle fournie dans le header X-API-Key

    Returns:
        Instance du service OpenAI
    """
    global _openai_service

    # Si une clé API est fournie dans le header, créer une instance dédiée
    if x_api_key:
        logger.info("Utilisation d'une clé API fournie dans le header")
        return OpenAIService(api_key=x_api_key)

    # Thread-safe singleton initialization
    if _openai_service is None:
        async with _service_lock:
            # Double-check locking pattern
            if _openai_service is None:
                try:
                    logger.info("Initialisation du service OpenAI (singleton)")
                    _openai_service = OpenAIService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service OpenAI: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service OpenAI non disponible. Veuillez configurer la clé API."
                    )

    return _openai_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Génère une réponse via l'API de chat OpenAI

    ## Description
    Cet endpoint permet d'envoyer une conversation à OpenAI et de recevoir une réponse.

    ## Paramètres
    - **messages**: Liste des messages de la conversation (obligatoire)
    - **model**: Modèle OpenAI à utiliser (optionnel, par défaut: gpt-3.5-turbo)
    - **temperature**: Contrôle la créativité (0.0 = déterministe, 2.0 = très créatif)
    - **max_tokens**: Nombre maximum de tokens à générer
    - **top_p**: Top-p sampling pour la diversité
    - **frequency_penalty**: Pénalité pour les répétitions de tokens
    - **presence_penalty**: Pénalité pour les nouveaux sujets

    ## Headers optionnels
    - **X-API-Key**: Clé API OpenAI personnalisée (override la configuration par défaut)

    ## Exemples
    ```json
    {
        "messages": [
            {"role": "user", "content": "Explique-moi la relativité"}
        ],
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "max_tokens": 500
    }
    ```
    """
    try:
        service = await get_openai_service(x_api_key)
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
    - **model**: Modèle d'embedding à utiliser (optionnel, par défaut: text-embedding-ada-002)

    ## Headers optionnels
    - **X-API-Key**: Clé API OpenAI personnalisée

    ## Exemples
    ```json
    {
        "input": [
            "Premier texte à transformer",
            "Deuxième texte à transformer"
        ],
        "model": "text-embedding-ada-002"
    }
    ```
    """
    try:
        service = await get_openai_service(x_api_key)
        return await service.create_embeddings(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la création des embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models(x_api_key: Optional[str] = Header(None)):
    """
    Liste tous les modèles OpenAI disponibles

    ## Description
    Récupère la liste de tous les modèles OpenAI disponibles pour votre compte.

    ## Headers optionnels
    - **X-API-Key**: Clé API OpenAI personnalisée

    ## Réponse
    Retourne une liste de modèles avec leurs informations (id, type, date de création, propriétaire).
    """
    try:
        service = await get_openai_service(x_api_key)
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
    et que la clé API OpenAI est configurée.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **openai_configured**: Indique si la clé API OpenAI est configurée
    """
    global _openai_service

    # Vérifier si le service est configuré
    is_configured = False
    if _openai_service is not None:
        is_configured = _openai_service.is_configured()
    elif settings.openai_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="openai-connector",
        version=settings.api_version,
        openai_configured=is_configured
    )
