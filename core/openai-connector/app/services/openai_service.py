"""
Service pour interagir avec l'API OpenAI
"""
from openai import OpenAI
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.openai_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ModelInfo,
    ListModelsResponse
)


logger = logging.getLogger(__name__)


class OpenAIService:
    """Service pour gérer les interactions avec OpenAI"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le service OpenAI

        Args:
            api_key: Clé API OpenAI (utilise settings.openai_api_key par défaut)
        """
        self.api_key = api_key or settings.openai_api_key
        self.client = None

        if self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
                logger.info("Client OpenAI initialisé avec succès")
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du client OpenAI: {e}")
                raise

    def _ensure_client(self) -> OpenAI:
        """Vérifie que le client OpenAI est initialisé"""
        if not self.client:
            raise ValueError(
                "Client OpenAI non initialisé. Veuillez configurer la clé API OPENAI_API_KEY"
            )
        return self.client

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Génère une réponse via l'API de chat OpenAI

        Args:
            request: Requête de chat avec les messages et paramètres

        Returns:
            Réponse contenant le message généré
        """
        try:
            client = self._ensure_client()

            # Convertir les messages au format OpenAI avec support multimodal
            openai_messages = []
            has_images = False
            for msg in request.messages:
                # Si le message contient des images, créer un message multimodal
                if hasattr(msg, 'images') and msg.images and len(msg.images) > 0:
                    has_images = True
                    content_parts = [{"type": "text", "text": msg.content}]

                    # Ajouter les images au format OpenAI Vision
                    for img in msg.images:
                        if img.startswith('data:'):
                            # Image en base64
                            content_parts.append({
                                "type": "image_url",
                                "image_url": {"url": img}
                            })
                        else:
                            # URL d'image
                            content_parts.append({
                                "type": "image_url",
                                "image_url": {"url": img}
                            })

                    openai_messages.append({
                        "role": msg.role.value,
                        "content": content_parts
                    })
                else:
                    # Message texte simple
                    openai_messages.append({
                        "role": msg.role.value,
                        "content": msg.content
                    })

            # Paramètres de la requête
            model = request.model or settings.default_model
            temperature = request.temperature or settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            # Appel à l'API OpenAI
            logger.info(f"Appel à OpenAI API - Modèle: {model}, Messages: {len(openai_messages)}, Images: {has_images}")

            # Préparer les paramètres
            params = {
                "model": model,
                "messages": openai_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            # Ajouter les paramètres optionnels s'ils sont fournis
            if request.top_p is not None:
                params["top_p"] = request.top_p
            if request.frequency_penalty is not None:
                params["frequency_penalty"] = request.frequency_penalty
            if request.presence_penalty is not None:
                params["presence_penalty"] = request.presence_penalty

            response = client.chat.completions.create(**params)

            # Extraire la réponse
            if response.choices and len(response.choices) > 0:
                choice = response.choices[0]
                message = ChatMessage(
                    role=choice.message.role,
                    content=choice.message.content
                )

                # Extraire les statistiques d'utilisation
                usage = None
                if response.usage:
                    usage = {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
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
                logger.warning("Aucune réponse générée par OpenAI")
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
                error=f"Erreur lors de la communication avec OpenAI: {str(e)}"
            )

    async def create_embeddings(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """
        Génère des embeddings pour les textes fournis

        Args:
            request: Requête d'embedding avec les textes

        Returns:
            Réponse contenant les vecteurs d'embeddings
        """
        try:
            client = self._ensure_client()

            model = request.model or "text-embedding-ada-002"

            logger.info(f"Génération d'embeddings - Modèle: {model}, Textes: {len(request.input)}")

            # Appel à l'API OpenAI pour les embeddings
            response = client.embeddings.create(
                model=model,
                input=request.input
            )

            # Extraire les embeddings
            embeddings = [data.embedding for data in response.data]

            # Extraire les statistiques d'utilisation
            usage = None
            if response.usage:
                usage = {
                    "total_tokens": response.usage.total_tokens
                }

            logger.info(f"Embeddings générés avec succès - Vecteurs: {len(embeddings)}")

            return EmbeddingResponse(
                success=True,
                embeddings=embeddings,
                model=model,
                usage=usage
            )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return EmbeddingResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la génération d'embeddings: {e}")
            return EmbeddingResponse(
                success=False,
                error=f"Erreur lors de la communication avec OpenAI: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste tous les modèles OpenAI disponibles

        Returns:
            Liste des modèles disponibles
        """
        try:
            client = self._ensure_client()

            logger.info("Récupération de la liste des modèles OpenAI")

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
                error=f"Erreur lors de la communication avec OpenAI: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.client is not None
