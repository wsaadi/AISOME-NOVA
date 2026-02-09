"""
Service pour interagir avec l'API Mistral AI
"""
from mistralai import Mistral
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.mistral_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    MessageRole,
    EmbeddingRequest,
    EmbeddingResponse,
    ModelInfo,
    ListModelsResponse
)


logger = logging.getLogger(__name__)


class MistralService:
    """Service pour gérer les interactions avec Mistral AI"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le service Mistral

        Args:
            api_key: Clé API Mistral (utilise settings.mistral_api_key par défaut)
        """
        self.api_key = api_key or settings.mistral_api_key
        self.client = None

        if self.api_key:
            try:
                self.client = Mistral(api_key=self.api_key)
                logger.info("Client Mistral initialisé avec succès")
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du client Mistral: {e}")
                raise

    def _ensure_client(self) -> Mistral:
        """Vérifie que le client Mistral est initialisé"""
        if not self.client:
            raise ValueError(
                "Client Mistral non initialisé. Veuillez configurer la clé API MISTRAL_API_KEY"
            )
        return self.client

    def _is_ocr_model(self, model: str) -> bool:
        """Vérifie si le modèle est un modèle OCR"""
        return model and "ocr" in model.lower()

    async def _ocr_completion(self, request: ChatRequest, model: str) -> ChatResponse:
        """
        Traite une requête OCR pour extraire du texte de documents/images

        Args:
            request: Requête de chat contenant des images
            model: Modèle OCR à utiliser

        Returns:
            Réponse contenant le texte extrait
        """
        try:
            client = self._ensure_client()

            # Trouver le premier message avec des images
            user_message = None
            document_url = None
            for msg in request.messages:
                if msg.images and len(msg.images) > 0:
                    user_message = msg
                    document_url = msg.images[0]  # Prendre la première image/document
                    break

            if not document_url:
                return ChatResponse(
                    success=False,
                    error="Aucun document fourni pour l'OCR"
                )

            logger.info(f"Appel à Mistral OCR API - Modèle: {model}, Document: {document_url[:50]}...")

            # Déterminer le type de document (image_url ou document_url)
            doc_type = "document_url"
            if document_url.startswith("data:image"):
                doc_type = "image_url"

            # Appel à l'API OCR de Mistral
            ocr_response = client.ocr.process(
                model=model,
                document={
                    "type": doc_type,
                    doc_type: document_url
                },
                include_image_base64=False
            )

            # Extraire le contenu OCR
            # Mistral OCR returns pages with markdown content
            ocr_content = ""
            if hasattr(ocr_response, 'pages') and ocr_response.pages:
                page_contents = []
                for page in ocr_response.pages:
                    if hasattr(page, 'markdown') and page.markdown:
                        page_contents.append(page.markdown)
                    elif hasattr(page, 'text') and page.text:
                        page_contents.append(page.text)
                ocr_content = "\n\n---\n\n".join(page_contents)
            elif hasattr(ocr_response, 'content') and ocr_response.content:
                ocr_content = ocr_response.content
            elif hasattr(ocr_response, 'text') and ocr_response.text:
                ocr_content = ocr_response.text

            # Construire une réponse de chat avec le résultat OCR
            # Si il y a un prompt utilisateur, on peut l'intégrer dans la réponse
            if user_message and user_message.content:
                response_content = f"Voici le contenu extrait du document:\n\n{ocr_content}"
            else:
                response_content = ocr_content

            message = ChatMessage(
                role=MessageRole.assistant,
                content=response_content
            )

            # Statistiques d'utilisation (approximatives pour OCR)
            usage = {
                "prompt_tokens": 0,
                "completion_tokens": len(ocr_content.split()),
                "total_tokens": len(ocr_content.split())
            }

            logger.info(f"OCR réalisé avec succès - Longueur: {len(ocr_content)} caractères")

            return ChatResponse(
                success=True,
                message=message,
                model=model,
                usage=usage,
                finish_reason="stop"
            )

        except Exception as e:
            logger.error(f"Erreur lors de l'OCR: {e}")
            return ChatResponse(
                success=False,
                error=f"Erreur lors de l'OCR avec Mistral AI: {str(e)}"
            )

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Génère une réponse via l'API de chat Mistral ou OCR

        Args:
            request: Requête de chat avec les messages et paramètres

        Returns:
            Réponse contenant le message généré
        """
        try:
            client = self._ensure_client()

            # Paramètres de la requête
            model = request.model or settings.default_model

            # Vérifier si un des messages contient des images
            has_images = any(msg.images and len(msg.images) > 0 for msg in request.messages)

            # Si c'est un modèle OCR et qu'il y a des images, utiliser l'endpoint OCR
            if self._is_ocr_model(model) and has_images:
                return await self._ocr_completion(request, model)

            # Convertir les messages au format Mistral avec support multimodal
            mistral_messages = []

            for msg in request.messages:
                # Si le message contient des images, créer un message multimodal
                if msg.images and len(msg.images) > 0:
                    # Pour Pixtral (modèle vision de Mistral) - format multimodal
                    content_parts = [{"type": "text", "text": msg.content}]

                    # Ajouter les images au format Mistral Vision
                    for img in msg.images:
                        content_parts.append({
                            "type": "image_url",
                            "image_url": img
                        })

                    # Utiliser un dictionnaire pour le format multimodal
                    mistral_messages.append({
                        "role": msg.role.value,
                        "content": content_parts
                    })
                elif has_images:
                    # Si d'autres messages ont des images, utiliser le format dict pour cohérence
                    mistral_messages.append({
                        "role": msg.role.value,
                        "content": msg.content
                    })
                else:
                    # Message texte simple - utiliser un dictionnaire
                    mistral_messages.append({
                        "role": msg.role.value,
                        "content": msg.content
                    })

            # Paramètres de la requête (model déjà défini en haut)
            temperature = request.temperature or settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            # Appel à l'API Mistral
            logger.info(f"Appel à Mistral API - Modèle: {model}, Messages: {len(mistral_messages)}, Images: {has_images}")

            response = client.chat.complete(
                model=model,
                messages=mistral_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=request.top_p if request.top_p else None
            )

            # Extraire la réponse
            if response.choices and len(response.choices) > 0:
                choice = response.choices[0]
                message = ChatMessage(
                    role=choice.message.role,
                    content=choice.message.content
                )

                # Extraire les statistiques d'utilisation
                usage = None
                if hasattr(response, 'usage') and response.usage:
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
                logger.warning("Aucune réponse générée par Mistral")
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
                error=f"Erreur lors de la communication avec Mistral AI: {str(e)}"
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

            model = request.model or "mistral-embed"

            logger.info(f"Génération d'embeddings - Modèle: {model}, Textes: {len(request.input)}")

            # Appel à l'API Mistral pour les embeddings
            response = client.embeddings.create(
                model=model,
                inputs=request.input
            )

            # Extraire les embeddings
            embeddings = [data.embedding for data in response.data]

            # Extraire les statistiques d'utilisation
            usage = None
            if hasattr(response, 'usage') and response.usage:
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
                error=f"Erreur lors de la communication avec Mistral AI: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste tous les modèles Mistral disponibles

        Returns:
            Liste des modèles disponibles
        """
        try:
            client = self._ensure_client()

            logger.info("Récupération de la liste des modèles Mistral")

            response = client.models.list()

            models = [
                ModelInfo(
                    id=model.id,
                    object=model.object if hasattr(model, 'object') else 'model',
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
                error=f"Erreur lors de la communication avec Mistral AI: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.client is not None
