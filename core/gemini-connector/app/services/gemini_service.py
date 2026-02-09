"""
Service pour interagir avec l'API Gemini
"""
import google.generativeai as genai
from typing import List, Dict, Any, Optional
import logging

from app.config import settings
from app.models.gemini_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    ModelInfo,
    ListModelsResponse
)


logger = logging.getLogger(__name__)


class GeminiService:
    """Service pour gérer les interactions avec Gemini"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le service Gemini

        Args:
            api_key: Clé API Gemini (utilise settings.gemini_api_key par défaut)
        """
        self.api_key = api_key or settings.gemini_api_key
        self.configured = False

        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.configured = True
                logger.info("Client Gemini initialisé avec succès")
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du client Gemini: {e}")
                raise

    def _ensure_configured(self):
        """Vérifie que le client Gemini est configuré"""
        if not self.configured:
            raise ValueError(
                "Client Gemini non configuré. Veuillez configurer la clé API GEMINI_API_KEY"
            )

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Génère une réponse via l'API de chat Gemini

        Args:
            request: Requête de chat avec les messages et paramètres

        Returns:
            Réponse contenant le message généré
        """
        try:
            self._ensure_configured()

            # Paramètres de la requête
            model_name = request.model or settings.default_model
            temperature = request.temperature or settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            # Créer le modèle
            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }

            if request.top_p is not None:
                generation_config["top_p"] = request.top_p
            if request.top_k is not None:
                generation_config["top_k"] = request.top_k

            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=generation_config
            )

            # Convertir les messages au format Gemini
            # Gemini ne supporte pas le rôle "system" de la même manière
            # On l'inclut comme premier message utilisateur si présent
            chat_history = []
            system_instruction = None

            for msg in request.messages[:-1]:  # Tous sauf le dernier
                if msg.role.value == "system":
                    system_instruction = msg.content
                else:
                    role = "user" if msg.role.value == "user" else "model"
                    chat_history.append({
                        "role": role,
                        "parts": [msg.content]
                    })

            # Si on a une instruction système, recréer le modèle avec
            if system_instruction:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    generation_config=generation_config,
                    system_instruction=system_instruction
                )

            # Le dernier message (qui doit être un message utilisateur)
            last_message = request.messages[-1].content

            logger.info(f"Appel à Gemini API - Modèle: {model_name}, Messages: {len(request.messages)}")

            # Démarrer le chat et envoyer le message
            chat = model.start_chat(history=chat_history)
            response = chat.send_message(last_message)

            # Extraire la réponse
            if response and response.text:
                message = ChatMessage(
                    role="assistant",
                    content=response.text
                )

                # Extraire les statistiques d'utilisation
                usage = None
                if hasattr(response, 'usage_metadata') and response.usage_metadata:
                    usage = {
                        "prompt_tokens": response.usage_metadata.prompt_token_count,
                        "completion_tokens": response.usage_metadata.candidates_token_count,
                        "total_tokens": response.usage_metadata.total_token_count
                    }

                finish_reason = None
                if response.candidates and len(response.candidates) > 0:
                    finish_reason = str(response.candidates[0].finish_reason)

                logger.info(f"Réponse générée avec succès - Tokens: {usage}")

                return ChatResponse(
                    success=True,
                    message=message,
                    model=model_name,
                    usage=usage,
                    finish_reason=finish_reason
                )
            else:
                logger.warning("Aucune réponse générée par Gemini")
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
                error=f"Erreur lors de la communication avec Gemini: {str(e)}"
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
            self._ensure_configured()

            model_name = request.model or "text-embedding-004"

            logger.info(f"Génération d'embeddings - Modèle: {model_name}, Textes: {len(request.input)}")

            # Générer les embeddings
            embeddings = []
            for text in request.input:
                result = genai.embed_content(
                    model=f"models/{model_name}",
                    content=text,
                    task_type="retrieval_document"
                )
                embeddings.append(result['embedding'])

            logger.info(f"Embeddings générés avec succès - Vecteurs: {len(embeddings)}")

            return EmbeddingResponse(
                success=True,
                embeddings=embeddings,
                model=model_name,
                usage={"total_tokens": sum(len(text.split()) for text in request.input)}
            )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return EmbeddingResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la génération d'embeddings: {e}")
            return EmbeddingResponse(
                success=False,
                error=f"Erreur lors de la communication avec Gemini: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste tous les modèles Gemini disponibles

        Returns:
            Liste des modèles disponibles
        """
        try:
            self._ensure_configured()

            logger.info("Récupération de la liste des modèles Gemini")

            models_list = []
            for model in genai.list_models():
                if 'generateContent' in model.supported_generation_methods:
                    models_list.append(
                        ModelInfo(
                            id=model.name.replace('models/', ''),
                            object="model",
                            created=None,
                            owned_by="google"
                        )
                    )

            logger.info(f"Liste des modèles récupérée: {len(models_list)} modèles")

            return ListModelsResponse(
                success=True,
                models=models_list
            )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return ListModelsResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des modèles: {e}")
            return ListModelsResponse(
                success=False,
                error=f"Erreur lors de la communication avec Gemini: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Vérifie si le service est correctement configuré"""
        return self.configured
