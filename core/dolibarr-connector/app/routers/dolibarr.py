"""
Router pour les endpoints de l'API Dolibarr
"""
import asyncio
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional
import logging

from app.models.dolibarr_models import (
    OpportunityRequest,
    OpportunityResponse,
    HealthResponse
)
from app.services.dolibarr_service import DolibarrService
from app.config import settings


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/dolibarr", tags=["Dolibarr"])

# Thread-safe singleton pattern with asyncio.Lock
_dolibarr_service: Optional[DolibarrService] = None
_service_lock = asyncio.Lock()


async def get_dolibarr_service(
    x_api_key: Optional[str] = Header(None),
    x_dolibarr_url: Optional[str] = Header(None)
) -> DolibarrService:
    """
    Récupère une instance du service Dolibarr (thread-safe)

    Args:
        x_api_key: Clé API optionnelle fournie dans le header X-API-Key
        x_dolibarr_url: URL Dolibarr optionnelle fournie dans le header X-Dolibarr-URL

    Returns:
        Instance du service Dolibarr
    """
    global _dolibarr_service

    # Si une clé API ou URL est fournie dans le header, créer une instance dédiée
    if x_api_key or x_dolibarr_url:
        logger.info("Utilisation de paramètres fournis dans les headers")
        return DolibarrService(api_key=x_api_key, base_url=x_dolibarr_url)

    # Thread-safe singleton initialization
    if _dolibarr_service is None:
        async with _service_lock:
            # Double-check locking pattern
            if _dolibarr_service is None:
                try:
                    logger.info("Initialisation du service Dolibarr (singleton)")
                    _dolibarr_service = DolibarrService()
                except Exception as e:
                    logger.error(f"Erreur lors de l'initialisation du service Dolibarr: {e}")
                    raise HTTPException(
                        status_code=500,
                        detail="Service Dolibarr non disponible. Veuillez configurer la clé API."
                    )

    return _dolibarr_service


@router.post("/opportunities", response_model=OpportunityResponse)
async def get_opportunities(
    request: OpportunityRequest,
    x_api_key: Optional[str] = Header(None),
    x_dolibarr_url: Optional[str] = Header(None)
):
    """
    Récupère les opportunités (propositions commerciales) depuis Dolibarr

    ## Description
    Cet endpoint permet de récupérer les propositions commerciales de Dolibarr
    avec leurs statistiques associées.

    ## Paramètres
    - **start_date**: Date de début du filtre (format: YYYY-MM-DD)
    - **end_date**: Date de fin du filtre (format: YYYY-MM-DD)
    - **limit**: Nombre maximum de résultats (par défaut: 100)
    - **sortfield**: Champ de tri (par défaut: t.date_creation)
    - **sortorder**: Ordre de tri ASC/DESC (par défaut: DESC)

    ## Headers optionnels
    - **X-API-Key**: Clé API Dolibarr (DOLAPIKEY)
    - **X-Dolibarr-URL**: URL de l'instance Dolibarr (ex: http://localhost:8081)

    ## Exemples
    ```json
    {
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "limit": 100
    }
    ```

    ## Réponse
    Retourne la liste des opportunités avec :
    - Informations détaillées de chaque opportunité
    - Statistiques globales (totaux, répartition par statut)
    - Nombre total d'opportunités
    """
    try:
        service = await get_dolibarr_service(x_api_key, x_dolibarr_url)
        return await service.get_proposals(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la récupération des opportunités: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Vérifie l'état de santé du service

    ## Description
    Endpoint de health check pour vérifier que le service est opérationnel
    et que la connexion à Dolibarr est configurée.

    ## Réponse
    - **status**: État du service (healthy/unhealthy)
    - **service**: Nom du service
    - **version**: Version de l'API
    - **dolibarr_configured**: Indique si la clé API Dolibarr est configurée
    - **dolibarr_url**: URL de l'instance Dolibarr
    """
    global _dolibarr_service

    # Vérifier si le service est configuré
    is_configured = False
    if _dolibarr_service is not None:
        is_configured = _dolibarr_service.is_configured()
    elif settings.dolibarr_api_key:
        is_configured = True

    return HealthResponse(
        status="healthy" if is_configured else "unhealthy",
        service="dolibarr-connector",
        version=settings.api_version,
        dolibarr_configured=is_configured,
        dolibarr_url=settings.dolibarr_url
    )
