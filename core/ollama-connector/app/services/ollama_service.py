"""
Service pour interagir avec l'API Ollama (inférence locale)
"""
import httpx
from typing import List, Dict, Any, Optional
import logging
import json

from app.config import settings
from app.models.ollama_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    MessageRole,
    ModelInfo,
    ListModelsResponse,
    PullModelRequest,
    PullModelResponse
)


logger = logging.getLogger(__name__)


class OllamaService:
    """Service pour gérer les interactions avec Ollama"""

    def __init__(self, base_url: Optional[str] = None):
        """
        Initialise le service Ollama

        Args:
            base_url: URL de base d'Ollama (utilise settings.ollama_base_url par défaut)
        """
        self.base_url = base_url or settings.ollama_base_url
        self.timeout = settings.request_timeout
        logger.info(f"Service Ollama initialisé avec URL: {self.base_url}")

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Effectue une requête HTTP vers Ollama

        Args:
            method: Méthode HTTP (GET, POST)
            endpoint: Endpoint API
            data: Données à envoyer
            stream: Si True, traite la réponse en streaming

        Returns:
            Réponse JSON
        """
        url = f"{self.base_url}{endpoint}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            if method == "GET":
                response = await client.get(url)
            elif method == "POST":
                if stream:
                    # Pour le streaming, on doit lire la réponse ligne par ligne
                    # car Ollama renvoie du NDJSON (newline-delimited JSON)
                    async with client.stream("POST", url, json=data) as response:
                        response.raise_for_status()
                        final_response = None
                        async for line in response.aiter_lines():
                            if line:
                                try:
                                    chunk = json.loads(line)
                                    if chunk.get("done", False):
                                        final_response = chunk
                                        break
                                    # Accumuler les réponses intermédiaires si nécessaire
                                    if final_response is None:
                                        final_response = chunk
                                    elif "message" in chunk:
                                        if "message" not in final_response:
                                            final_response["message"] = {"role": "assistant", "content": ""}
                                        final_response["message"]["content"] += chunk.get("message", {}).get("content", "")
                                except json.JSONDecodeError:
                                    continue
                        return final_response or {}
                else:
                    response = await client.post(url, json=data)
            else:
                raise ValueError(f"Méthode HTTP non supportée: {method}")

            response.raise_for_status()
            return response.json()

    async def check_connection(self) -> bool:
        """
        Vérifie si Ollama est accessible

        Returns:
            True si Ollama répond, False sinon
        """
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.warning(f"Impossible de se connecter à Ollama: {e}")
            return False

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Génère une réponse via l'API de chat Ollama

        Args:
            request: Requête de chat avec les messages et paramètres

        Returns:
            Réponse contenant le message généré
        """
        try:
            model = request.model or settings.default_model
            temperature = request.temperature if request.temperature is not None else settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            # Convertir les messages au format Ollama
            ollama_messages = [
                {
                    "role": msg.role.value,
                    "content": msg.content
                }
                for msg in request.messages
            ]

            # Préparer les options
            options = {
                "temperature": temperature,
                "num_predict": max_tokens
            }

            if request.top_p is not None:
                options["top_p"] = request.top_p

            # Préparer la requête
            ollama_request = {
                "model": model,
                "messages": ollama_messages,
                "stream": False,  # On désactive le streaming pour simplifier
                "options": options
            }

            logger.info(f"Appel à Ollama API - Modèle: {model}, Messages: {len(ollama_messages)}")

            # Appel à l'API Ollama
            response = await self._make_request("POST", "/api/chat", ollama_request)

            # Extraire la réponse
            if "message" in response:
                message = ChatMessage(
                    role=MessageRole.assistant,
                    content=response["message"].get("content", "")
                )

                # Calculer l'usage approximatif (Ollama fournit eval_count et prompt_eval_count)
                usage = None
                if "eval_count" in response or "prompt_eval_count" in response:
                    usage = {
                        "prompt_tokens": response.get("prompt_eval_count", 0),
                        "completion_tokens": response.get("eval_count", 0),
                        "total_tokens": response.get("prompt_eval_count", 0) + response.get("eval_count", 0)
                    }

                # Extraire les durées
                eval_duration = None
                total_duration = None
                if "eval_duration" in response:
                    eval_duration = response["eval_duration"] / 1e9  # Convertir de ns en s
                if "total_duration" in response:
                    total_duration = response["total_duration"] / 1e9

                logger.info(f"Réponse générée avec succès - Tokens: {usage}, Durée: {total_duration:.2f}s" if total_duration else "Réponse générée")

                return ChatResponse(
                    success=True,
                    message=message,
                    model=model,
                    usage=usage,
                    finish_reason="stop" if response.get("done", False) else None,
                    eval_duration=eval_duration,
                    total_duration=total_duration
                )
            else:
                logger.warning("Aucune réponse générée par Ollama")
                return ChatResponse(
                    success=False,
                    error="Aucune réponse générée par le modèle"
                )

        except httpx.ConnectError as e:
            logger.error(f"Impossible de se connecter à Ollama: {e}")
            return ChatResponse(
                success=False,
                error=f"Impossible de se connecter à Ollama ({self.base_url}). Vérifiez que le service est démarré."
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP Ollama: {e}")
            return ChatResponse(
                success=False,
                error=f"Erreur Ollama: {e.response.status_code} - {e.response.text}"
            )
        except Exception as e:
            logger.error(f"Erreur lors de la génération: {e}")
            return ChatResponse(
                success=False,
                error=f"Erreur lors de la communication avec Ollama: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste tous les modèles Ollama disponibles localement

        Returns:
            Liste des modèles disponibles
        """
        try:
            logger.info("Récupération de la liste des modèles Ollama")

            response = await self._make_request("GET", "/api/tags")

            models = []
            for model_data in response.get("models", []):
                models.append(ModelInfo(
                    name=model_data.get("name", ""),
                    model=model_data.get("model", model_data.get("name", "")),
                    modified_at=model_data.get("modified_at"),
                    size=model_data.get("size"),
                    digest=model_data.get("digest"),
                    details=model_data.get("details")
                ))

            logger.info(f"Liste des modèles récupérée: {len(models)} modèles")

            return ListModelsResponse(
                success=True,
                models=models
            )

        except httpx.ConnectError as e:
            logger.error(f"Impossible de se connecter à Ollama: {e}")
            return ListModelsResponse(
                success=False,
                error=f"Impossible de se connecter à Ollama ({self.base_url})"
            )
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des modèles: {e}")
            return ListModelsResponse(
                success=False,
                error=f"Erreur lors de la communication avec Ollama: {str(e)}"
            )

    async def pull_model(self, request: PullModelRequest) -> PullModelResponse:
        """
        Télécharge un modèle depuis le registre Ollama

        Args:
            request: Requête avec le nom du modèle à télécharger

        Returns:
            Réponse indiquant le succès ou l'échec
        """
        try:
            logger.info(f"Téléchargement du modèle: {request.name}")

            # Le pull peut prendre du temps, on utilise un timeout plus long
            async with httpx.AsyncClient(timeout=1800) as client:  # 30 minutes
                response = await client.post(
                    f"{self.base_url}/api/pull",
                    json={"name": request.name, "stream": False}
                )
                response.raise_for_status()

            logger.info(f"Modèle {request.name} téléchargé avec succès")

            return PullModelResponse(
                success=True,
                message=f"Modèle {request.name} téléchargé avec succès"
            )

        except httpx.ConnectError as e:
            logger.error(f"Impossible de se connecter à Ollama: {e}")
            return PullModelResponse(
                success=False,
                error=f"Impossible de se connecter à Ollama ({self.base_url})"
            )
        except httpx.HTTPStatusError as e:
            logger.error(f"Erreur HTTP lors du téléchargement: {e}")
            return PullModelResponse(
                success=False,
                error=f"Erreur lors du téléchargement: {e.response.status_code}"
            )
        except Exception as e:
            logger.error(f"Erreur lors du téléchargement du modèle: {e}")
            return PullModelResponse(
                success=False,
                error=f"Erreur lors du téléchargement: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.base_url is not None and len(self.base_url) > 0
