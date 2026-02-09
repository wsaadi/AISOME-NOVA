"""
Router pour les endpoints de l'API Mistral
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import logging

from app.models.mistral_models import (
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ListModelsResponse,
    HealthResponse
)
from app.services.mistral_service import MistralService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mistral", tags=["Mistral AI"])

# Thread-safe singleton pattern with asyncio.Lock
_mistral_service: Optional[MistralService] = None
_service_lock = asyncio.Lock()


async def get_mistral_service(x_api_key: Optional[str] = Header(None)) -> MistralService:
    """
    Récupère une instance du service Mistral (thread-safe)

    Args:
        x_api_key: Clé API optionnelle fournie dans le header X-API-Key

    Returns:
        Instance du service Mistral
    """
    global _mistral_service

    # Si une clé API est fournie dans le header, créer une instance dédiée
    if x_api_key:
        logger.info("Utilisation d'une clé API fournie dans le header")
        return MistralService(api_key=x_api_key)

    # Thread-safe singleton initialization
    if _mistral_service is None:
        async with _service_lock:
            # Double-check locking pattern
            if _mistral_service is None:
                try:
                    logger.info("Initialisation du service Mistral (singleton)")
                    _mistral_service = MistralService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service Mistral: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service Mistral non disponible. Veuillez configurer la clé API."
                    )

    return _mistral_service


@router.post("/chat", response_model=ChatResponse)
async def chat_completion(
    request: ChatRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Génère une réponse via l'API de chat Mistral

    ## Description
    Cet endpoint permet d'envoyer une conversation à Mistral AI et de recevoir une réponse.

    ## Paramètres
    - **messages**: Liste des messages de la conversation (obligatoire)
    - **model**: Modèle Mistral à utiliser (optionnel, par défaut: mistral-small-latest)
    - **temperature**: Contrôle la créativité (0.0 = déterministe, 2.0 = très créatif)
    - **max_tokens**: Nombre maximum de tokens à générer
    - **top_p**: Top-p sampling pour la diversité
    - **safe_prompt**: Active le mode safe prompt

    ## Headers optionnels
    - **X-API-Key**: Clé API Mistral personnalisée (override la configuration par défaut)

    ## Exemples
    ```json
    {
        "messages": [
            {"role": "user", "content": "Explique-moi la relativité"}
        ],
        "model": "mistral-small-latest",
        "temperature": 0.7,
        "max_tokens": 500
    }
    ```
    """
    try:
        service = await get_mistral_service(x_api_key)
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
    - **model**: Modèle d'embedding à utiliser (optionnel, par défaut: mistral-embed)

    ## Headers optionnels
    - **X-API-Key**: Clé API Mistral personnalisée

    ## Exemples
    ```json
    {
        "input": [
            "Premier texte à transformer",
            "Deuxième texte à transformer"
        ],
        "model": "mistral-embed"
    }
    ```
    """
    try:
        service = await get_mistral_service(x_api_key)
        return await service.create_embeddings(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la création des embeddings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=ListModelsResponse)
async def list_models(x_api_key: Optional[str] = Header(None)):
    """
    Liste tous les modèles Mistral disponibles

    ## Description
    Récupère la liste de tous les modèles Mistral AI disponibles pour votre compte.

    ## Headers optionnels
    - **X-API-Key**: Clé API Mistral personnalisée

    ## Réponse
    Retourne une liste de modèles avec leurs informations (id, type, date de création, propriétaire).
    """
    try:
        service = await get_mistral_service(x_api_key)
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
    et que la clé API Mistral est configurée.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **mistral_configured**: Indique si la clé API Mistral est configurée
    """
    global _mistral_service

    # Vérifier si le service est configuré
    is_configured = False
    if _mistral_service is not None:
        is_configured = _mistral_service.is_configured()
    elif settings.mistral_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="mistral-connector",
        version=settings.api_version,
        mistral_configured=is_configured
    )
