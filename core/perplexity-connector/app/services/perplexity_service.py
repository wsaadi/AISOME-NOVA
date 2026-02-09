"""
Service pour interagir avec l'API Perplexity
"""
from openai import OpenAI
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.perplexity_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    ListModelsResponse
)


logger = logging.getLogger(__name__)


class PerplexityService:
    """Service pour gérer les interactions avec Perplexity"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le service Perplexity

        Args:
            api_key: Clé API Perplexity (utilise settings.perplexity_api_key par défaut)
        """
        self.api_key = api_key or settings.perplexity_api_key
        self.client = None

        if self.api_key:
            try:
                # Perplexity utilise l'API compatible OpenAI
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://api.perplexity.ai"
                )
                logger.info("Client Perplexity initialisé avec succès")
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du client Perplexity: {e}")
                raise

    def _ensure_client(self) -> OpenAI:
        """Vérifie que le client Perplexity est initialisé"""
        if not self.client:
            raise ValueError(
                "Client Perplexity non initialisé. Veuillez configurer la clé API PERPLEXITY_API_KEY"
            )
        return self.client

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Génère une réponse via l'API de chat Perplexity

        Args:
            request: Requête de chat avec les messages et paramètres

        Returns:
            Réponse contenant le message généré
        """
        try:
            client = self._ensure_client()

            # Convertir les messages au format OpenAI
            messages = [
                {"role": msg.role.value, "content": msg.content}
                for msg in request.messages
            ]

            # Paramètres de la requête
            model = request.model or settings.default_model
            temperature = request.temperature or settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            # Appel à l'API Perplexity
            logger.info(f"Appel à Perplexity API - Modèle: {model}, Messages: {len(messages)}")

            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=request.top_p,
                presence_penalty=request.presence_penalty,
                frequency_penalty=request.frequency_penalty,
                stream=False
            )

            # Extraire la réponse
            if completion.choices and len(completion.choices) > 0:
                choice = completion.choices[0]
                message = ChatMessage(
                    role=choice.message.role,
                    content=choice.message.content
                )

                # Extraire les statistiques d'utilisation
                usage = None
                if completion.usage:
                    usage = {
                        "prompt_tokens": completion.usage.prompt_tokens,
                        "completion_tokens": completion.usage.completion_tokens,
                        "total_tokens": completion.usage.total_tokens
                    }

                logger.info(f"Réponse générée avec succès - Tokens: {usage}")

                return ChatResponse(
                    success=True,
                    message=message,
                    model=model,
                    usage=usage,
                    finish_reason=choice.finish_reason
                )
            else:
                logger.warning("Aucune réponse générée par Perplexity")
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
                error=f"Erreur lors de la communication avec Perplexity: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste tous les modèles Perplexity disponibles

        Returns:
            Liste des modèles disponibles
        """
        try:
            client = self._ensure_client()

            logger.info("Récupération de la liste des modèles Perplexity")

            response = client.models.list()

            models = [
                ModelInfo(
                    id=model.id,
                    object=model.object,
                    created=model.created if hasattr(model, 'created') else None,
                    owned_by=model.owned_by if hasattr(model, 'owned_by') else None
                )
                for model in response.data
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
                error=f"Erreur lors de la communication avec Perplexity: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.client is not None
