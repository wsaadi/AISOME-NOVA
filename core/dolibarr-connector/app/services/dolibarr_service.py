"""
Service pour interagir avec l'API Dolibarr
"""
import httpx
import asyncio
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.config import settings
from app.models.dolibarr_models import (
    OpportunityRequest,
    Opportunity,
    OpportunityResponse,
    OpportunityStats,
    ThirdParty,
    ThirdPartyResponse,
    ProposalStatus
)


logger = logging.getLogger(__name__)


class DolibarrService:
    """Service pour gérer les interactions avec Dolibarr"""

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        Initialise le service Dolibarr

        Args:
            api_key: Clé API Dolibarr (utilise settings.dolibarr_api_key par défaut)
            base_url: URL de base Dolibarr (utilise settings.dolibarr_url par défaut)
        """
        self.api_key = api_key or settings.dolibarr_api_key
        self.base_url = (base_url or settings.dolibarr_url).rstrip('/')
        self.api_endpoint = f"{self.base_url}/api/index.php"

        if self.api_key:
            logger.info(f"Service Dolibarr initialisé - URL: {self.base_url}")
        else:
            logger.warning("Service Dolibarr initialisé sans clé API")

    def _get_headers(self) -> Dict[str, str]:
        """Génère les headers pour les requêtes Dolibarr"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if self.api_key:
            headers["DOLAPIKEY"] = self.api_key
        return headers

    def _ensure_api_key(self):
        """Vérifie que la clé API est configurée"""
        if not self.api_key:
            raise ValueError(
                "Clé API Dolibarr non configurée. "
                "Veuillez configurer DOLIBARR_API_KEY ou fournir une clé via le header X-API-Key"
            )

    async def _make_http_request_with_retry(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        max_retries: int = 4,
        **kwargs
    ) -> Optional[httpx.Response]:
        """
        Effectue une requête HTTP avec retry automatique en cas d'erreur de connexion

        Args:
            client: Client httpx async
            method: Méthode HTTP (get, post, etc.)
            url: URL de la requête
            max_retries: Nombre maximum de tentatives (par défaut 4)
            **kwargs: Arguments supplémentaires pour la requête

        Returns:
            Response httpx ou None en cas d'échec
        """
        backoff_delays = [2, 4, 8, 16]  # Délais en secondes pour chaque retry

        for attempt in range(max_retries + 1):
            try:
                request_method = getattr(client, method.lower())
                response = await request_method(url, **kwargs)
                return response

            except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
                is_last_attempt = attempt == max_retries

                if is_last_attempt:
                    logger.error(f"Erreur de connexion après {max_retries + 1} tentatives vers {url}: {str(e)}")
                    raise

                delay = backoff_delays[attempt] if attempt < len(backoff_delays) else backoff_delays[-1]
                logger.warning(f"Tentative {attempt + 1}/{max_retries + 1} échouée pour {url}. Nouvelle tentative dans {delay}s...")
                await asyncio.sleep(delay)

            except Exception as e:
                # Pour les autres erreurs, ne pas retry
                logger.error(f"Erreur non-réseau lors de la requête vers {url}: {str(e)}")
                raise

        return None

    async def get_proposals(self, request: OpportunityRequest) -> OpportunityResponse:
        """
        Récupère les propositions commerciales (opportunités) depuis Dolibarr

        Args:
            request: Paramètres de la requête

        Returns:
            Réponse contenant les opportunités et statistiques
        """
        try:
            self._ensure_api_key()

            # Récupérer toutes les propositions avec pagination
            all_opportunities = []
            page = 0
            page_limit = 200  # Nombre par page

            logger.info(f"Récupération des propositions Dolibarr avec pagination")

            # Appel à l'API Dolibarr avec pagination et retry automatique
            # Désactiver la vérification SSL pour les environnements de développement
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                while True:
                    # Construire les paramètres de la requête
                    params = {
                        "sortfield": "t.rowid",
                        "sortorder": "ASC",
                        "limit": page_limit,
                        "page": page
                    }

                    logger.info(f"Requête page {page} - URL: {self.api_endpoint}/proposals - Params: {params}")

                    # Utiliser retry automatique pour gérer les erreurs de connexion
                    response = await self._make_http_request_with_retry(
                        client=client,
                        method="get",
                        url=f"{self.api_endpoint}/proposals",
                        headers=self._get_headers(),
                        params=params
                    )

                    if not response:
                        logger.error("Pas de réponse de l'API Dolibarr")
                        break

                    response.raise_for_status()
                    data = response.json()

                    if not isinstance(data, list):
                        logger.error(f"Réponse API inattendue (type {type(data)}): {data}")
                        break

                    if not data:
                        break

                    all_opportunities.extend(data)
                    logger.info(f"Page {page}: {len(data)} propositions récupérées (total: {len(all_opportunities)})")

                    # Si moins de résultats que la limite, on a tout récupéré
                    if len(data) < page_limit:
                        break

                    page += 1

            logger.info(f"Total propositions récupérées: {len(all_opportunities)}")

            # Filtrer par date si spécifié
            filtered_opportunities = []
            for item in all_opportunities:
                # Vérifier les dates si filtres spécifiés
                if request.start_date or request.end_date:
                    date_creation = self._get_timestamp(item.get("date_creation") or item.get("datec"))
                    if not date_creation:
                        continue

                    if request.start_date:
                        try:
                            start_ts = datetime.strptime(request.start_date, "%Y-%m-%d").timestamp()
                            if date_creation < start_ts:
                                continue
                        except Exception:
                            pass

                    if request.end_date:
                        try:
                            end_ts = datetime.strptime(f"{request.end_date} 23:59:59", "%Y-%m-%d %H:%M:%S").timestamp()
                            if date_creation > end_ts:
                                continue
                        except Exception:
                            pass

                filtered_opportunities.append(item)

            logger.info(f"Après filtrage par date: {len(filtered_opportunities)} opportunités")

            # Parser les opportunités
            opportunities = []
            for item in filtered_opportunities:
                # Déterminer le statut (essayer plusieurs champs)
                status = str(item.get("fk_statut") or item.get("statut") or "0")

                # Convertir les données Dolibarr en notre modèle
                opportunity = Opportunity(
                    id=str(item.get("id") or item.get("rowid", "")),
                    ref=item.get("ref", ""),
                    status=status,
                    status_label=self._get_status_label(status),
                    total_ht=float(item.get("total_ht") or item.get("totalamount") or 0),
                    total_ttc=float(item.get("total_ttc") or item.get("total") or 0),
                    date=self._format_timestamp(item.get("date") or item.get("datep")),
                    date_creation=self._format_timestamp(item.get("date_creation") or item.get("datec")),
                    date_validation=self._format_timestamp(item.get("date_validation")),
                    date_signature=self._format_timestamp(item.get("date_signature")),
                    socid=str(item.get("socid", "")),
                    client_name=item.get("socname", ""),
                    note_public=item.get("note_public"),
                    note_private=item.get("note_private"),
                    raw_data=item
                )
                opportunities.append(opportunity)

            # Calculer les statistiques
            stats = self._calculate_stats(opportunities)

            logger.info(f"Propositions traitées: {len(opportunities)} opportunités")

            return OpportunityResponse(
                success=True,
                opportunities=opportunities,
                stats=stats,
                total=len(opportunities)
            )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return OpportunityResponse(success=False, error=str(e))
        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
            logger.error(f"Erreur de connexion à Dolibarr: {e}")
            logger.error(f"Vérifiez que l'API Dolibarr est accessible à {self.base_url}")
            return OpportunityResponse(
                success=False,
                error=f"Erreur lors de la communication avec Dolibarr: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP Dolibarr: {e.response.status_code} - {e.response.text}")
            return OpportunityResponse(
                success=False,
                error=f"Erreur API Dolibarr (HTTP {e.response.status_code}): {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des propositions: {e}", exc_info=True)
            return OpportunityResponse(
                success=False,
                error=f"Erreur lors de la communication avec Dolibarr: {str(e)}"
            )

    async def get_thirdparty(self, socid: str) -> Optional[ThirdParty]:
        """
        Récupère les informations d'un tiers (client/fournisseur)

        Args:
            socid: ID du tiers

        Returns:
            Informations du tiers ou None
        """
        try:
            self._ensure_api_key()

            logger.info(f"Récupération du tiers {socid}")

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Utiliser retry automatique pour gérer les erreurs de connexion
                response = await self._make_http_request_with_retry(
                    client=client,
                    method="get",
                    url=f"{self.api_endpoint}/thirdparties/{socid}",
                    headers=self._get_headers()
                )

                if not response:
                    logger.error("Pas de réponse de l'API Dolibarr")
                    return None

                response.raise_for_status()
                data = response.json()

            return ThirdParty(
                id=str(data.get("id", "")),
                name=data.get("name", ""),
                client=str(data.get("client", "")),
                code_client=data.get("code_client"),
                email=data.get("email"),
                phone=data.get("phone")
            )

        except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as e:
            logger.error(f"Erreur de connexion à Dolibarr lors de la récupération du tiers {socid}: {e}")
            logger.error(f"Vérifiez que l'API Dolibarr est accessible à {self.base_url}")
            return None
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du tiers {socid}: {e}")
            return None

    def _calculate_stats(self, opportunities: List[Opportunity]) -> OpportunityStats:
        """
        Calcule les statistiques des opportunités

        Args:
            opportunities: Liste des opportunités

        Returns:
            Statistiques calculées
        """
        stats = OpportunityStats(
            total_count=len(opportunities),
            total_amount_ht=0.0,
            total_amount_ttc=0.0,
            by_status={},
            by_status_amount={}
        )

        for opp in opportunities:
            # Total des montants
            stats.total_amount_ht += opp.total_ht
            stats.total_amount_ttc += opp.total_ttc

            # Comptage par statut
            status_label = opp.status_label or f"Statut {opp.status}"
            stats.by_status[status_label] = stats.by_status.get(status_label, 0) + 1
            stats.by_status_amount[status_label] = (
                stats.by_status_amount.get(status_label, 0.0) + opp.total_ht
            )

        return stats

    def _get_status_label(self, status: str) -> str:
        """
        Convertit un code statut en libellé

        Args:
            status: Code statut Dolibarr

        Returns:
            Libellé du statut
        """
        status_map = {
            "0": "Brouillon",
            "1": "Validée",
            "2": "Signée",
            "3": "Non signée",
            "4": "Facturée"
        }
        return status_map.get(status, f"Statut {status}")

    def _get_timestamp(self, timestamp: Any) -> Optional[float]:
        """
        Convertit un timestamp Dolibarr en float (timestamp Unix)

        Args:
            timestamp: Timestamp Unix ou None

        Returns:
            Timestamp Unix (float) ou None
        """
        if not timestamp:
            return None

        try:
            if isinstance(timestamp, (int, float)):
                return float(timestamp)
            # Si c'est une string qui représente un nombre
            if isinstance(timestamp, str) and timestamp.isdigit():
                return float(timestamp)
            return None
        except Exception as e:
            logger.warning(f"Erreur lors de la conversion du timestamp {timestamp}: {e}")
            return None

    def _format_timestamp(self, timestamp: Any) -> Optional[str]:
        """
        Formate un timestamp Dolibarr en date ISO

        Args:
            timestamp: Timestamp Unix ou None

        Returns:
            Date au format ISO ou None
        """
        if not timestamp:
            return None

        try:
            if isinstance(timestamp, (int, float)):
                dt = datetime.fromtimestamp(timestamp)
                return dt.isoformat()
            return str(timestamp)
        except Exception as e:
            logger.warning(f"Erreur lors du formatage du timestamp {timestamp}: {e}")
            return None

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.api_key is not None
