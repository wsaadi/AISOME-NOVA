"""
Service pour interagir avec l'API NVIDIA NIM

NVIDIA NIM expose une API compatible OpenAI (chat/completions),
on utilise donc le client OpenAI avec une base_url personnalisee.
"""
from openai import OpenAI
from typing import Optional
import logging

from app.config import settings
from app.models.nvidia_nim_models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ModelInfo,
    ListModelsResponse
)


logger = logging.getLogger(__name__)


class NvidiaNimService:
    """Service pour gerer les interactions avec NVIDIA NIM"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialise le service NVIDIA NIM

        Args:
            api_key: Cle API NVIDIA NIM (utilise settings.nvidia_nim_api_key par defaut)
        """
        self.api_key = api_key or settings.nvidia_nim_api_key
        self.client = None

        if self.api_key:
            try:
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url=settings.nvidia_nim_base_url
                )
                logger.info("Client NVIDIA NIM initialise avec succes")
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du client NVIDIA NIM: {e}")
                raise

    def _ensure_client(self) -> OpenAI:
        """Verifie que le client NVIDIA NIM est initialise"""
        if not self.client:
            raise ValueError(
                "Client NVIDIA NIM non initialise. Veuillez configurer la cle API NVIDIA_NIM_API_KEY"
            )
        return self.client

    async def chat_completion(self, request: ChatRequest) -> ChatResponse:
        """
        Genere une reponse via l'API de chat NVIDIA NIM
        """
        try:
            client = self._ensure_client()

            openai_messages = []
            for msg in request.messages:
                openai_messages.append({
                    "role": msg.role.value,
                    "content": msg.content
                })

            model = request.model or settings.default_model
            temperature = request.temperature if request.temperature is not None else settings.default_temperature
            max_tokens = request.max_tokens or settings.default_max_tokens

            logger.info(f"Appel a NVIDIA NIM API - Modele: {model}, Messages: {len(openai_messages)}")

            params = {
                "model": model,
                "messages": openai_messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }

            if request.top_p is not None:
                params["top_p"] = request.top_p
            if request.frequency_penalty is not None:
                params["frequency_penalty"] = request.frequency_penalty
            if request.presence_penalty is not None:
                params["presence_penalty"] = request.presence_penalty

            response = client.chat.completions.create(**params)

            if response.choices and len(response.choices) > 0:
                choice = response.choices[0]
                message = ChatMessage(
                    role=choice.message.role,
                    content=choice.message.content
                )

                usage = None
                if response.usage:
                    usage = {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    }

                logger.info(f"Reponse generee avec succes - Tokens: {usage}")

                return ChatResponse(
                    success=True,
                    message=message,
                    model=model,
                    usage=usage,
                    finish_reason=choice.finish_reason
                )
            else:
                logger.warning("Aucune reponse generee par NVIDIA NIM")
                return ChatResponse(
                    success=False,
                    error="Aucune reponse generee par le modele"
                )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return ChatResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la generation: {e}")
            return ChatResponse(
                success=False,
                error=f"Erreur lors de la communication avec NVIDIA NIM: {str(e)}"
            )

    async def list_models(self) -> ListModelsResponse:
        """
        Liste les modeles NVIDIA NIM disponibles
        """
        try:
            client = self._ensure_client()

            logger.info("Recuperation de la liste des modeles NVIDIA NIM")

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

            logger.info(f"Liste des modeles recuperee: {len(models)} modeles")

            return ListModelsResponse(
                success=True,
                models=models
            )

        except ValueError as e:
            logger.error(f"Erreur de configuration: {e}")
            return ListModelsResponse(success=False, error=str(e))
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation des modeles: {e}")
            return ListModelsResponse(
                success=False,
                error=f"Erreur lors de la communication avec NVIDIA NIM: {str(e)}"
            )

    def is_configured(self) -> bool:
        """Verifie si le service est correctement configure"""
        return self.client is not None
