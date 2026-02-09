"""
Service pour interagir avec l'API Anthropic
"""
from anthropic import Anthropic
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.anthropic_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    ListModelsResponse
)


logger = logging.getLogger(__name__)


class AnthropicService:
    """Service pour gérer les interactions avec Anthropic"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le service Anthropic

        Args:
            api_key: Clé API Anthropic (utilise settings.anthropic_api_key par défaut)
        """
        self.api_key = api_key or settings.anthropic_api_key
        self.client = None

        if self.api_key:
            try:
                self.client = Anthropic(api_key=self.api_key)
                logger.info("Client Anthropic initialisé avec succès")
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du client Anthropic: {e}")
                raise

    def _ensure_client(self) -> Anthropic:
        """Vérifie que le client Anthropic est initialisé"""
        if not self.client:
            raise ValueError(
                "Client Anthropic non initialisé. Veuillez configurer la clé API ANTHROPIC_API_KEY"
            )
        return self.client

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Génère une réponse via l'API de chat Anthropic

        Args:
            request: Requête de chat avec les messages et paramètres

        Returns:
            Réponse contenant le message généré
        """
        try:
            client = self._ensure_client()

            # Séparer le message système des autres messages
            system_message = None
            messages = []

            for msg in request.messages:
                if msg.role.value == "system":
                    system_message = msg.content
                else:
                    messages.append({
                        "role": msg.role.value,
                        "content": msg.content
                    })

            # Paramètres de la requête
            model = request.model or settings.default_model
            temperature = request.temperature or settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            # Appel à l'API Anthropic
            logger.info(f"Appel à Anthropic API - Modèle: {model}, Messages: {len(messages)}")

            kwargs = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            if system_message:
                kwargs["system"] = system_message
            if request.top_p is not None:
                kwargs["top_p"] = request.top_p
            if request.top_k is not None:
                kwargs["top_k"] = request.top_k

            response = client.messages.create(**kwargs)

            # Extraire la réponse
            if response.content and len(response.content) > 0:
                content_text = ""
                for block in response.content:
                    if hasattr(block, 'text'):
                        content_text += block.text

                message = ChatMessage(
                    role="assistant",
                    content=content_text
                )

                # Extraire les statistiques d'utilisation
                usage = None
                if response.usage:
                    usage = {
                        "prompt_tokens": response.usage.input_tokens,
                        "completion_tokens": response.usage.output_tokens,
                        "total_tokens": response.usage.input_tokens + response.usage.output_tokens
                    }

                logger.info(f"Réponse générée avec succès - Tokens: {usage}")

                return ChatResponse(
                    success=True,
                    message=message,
                    model=model,
                    usage=usage,
                    finish_reason=response.stop_reason
                )
            else:
                logger.warning("Aucune réponse générée par Anthropic")
                return ChatResponse(
                    success=False,
                    error="Aucune réponse générée par le modèle"
                )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return ChatResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la génération: {e}")
            return ChatResponse(
                success=False,
                error=f"Erreur lors de la communication avec Anthropic: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste tous les modèles Anthropic disponibles

        Returns:
            Liste des modèles disponibles
        """
        try:
            self._ensure_client()

            logger.info("Récupération de la liste des modèles Anthropic")

            # Anthropic ne fournit pas d'endpoint pour lister les modèles
            # On retourne une liste statique des modèles disponibles
            models = [
                ModelInfo(
                    id="claude-3-5-sonnet-20241022",
                    object="model",
                    created=None,
                    owned_by="anthropic"
                ),
                ModelInfo(
                    id="claude-3-5-haiku-20241022",
                    object="model",
                    created=None,
                    owned_by="anthropic"
                ),
                ModelInfo(
                    id="claude-3-opus-20240229",
                    object="model",
                    created=None,
                    owned_by="anthropic"
                ),
                ModelInfo(
                    id="claude-3-sonnet-20240229",
                    object="model",
                    created=None,
                    owned_by="anthropic"
                ),
                ModelInfo(
                    id="claude-3-haiku-20240307",
                    object="model",
                    created=None,
                    owned_by="anthropic"
                ),
            ]

            logger.info(f"Liste des modèles récupérée: {len(models)} modèles")

            return ListModelsResponse(
                success=True,
                models=models
            )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return ListModelsResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des modèles: {e}")
            return ListModelsResponse(
                success=False,
                error=f"Erreur lors de la communication avec Anthropic: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.client is not None
