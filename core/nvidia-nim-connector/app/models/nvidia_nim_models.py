"""
Modeles Pydantic pour le connecteur NVIDIA NIM
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum


class MessageRole(str, Enum):
    """Roles possibles pour un message"""
    system = "system"
    user = "user"
    assistant = "assistant"


class ChatMessage(BaseModel):
    """Message dans une conversation"""
    role: MessageRole = Field(..., description="Role du message (system, user, assistant)")
    content: str = Field(..., description="Contenu du message")

    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "Bonjour, comment vas-tu ?"
            }
        }


class ChatRequest(BaseModel):
    """Requete pour generer une reponse via chat"""
    messages: List[ChatMessage] = Field(..., description="Historique de la conversation")
    model: Optional[str] = Field(None, description="Modele NVIDIA NIM a utiliser")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Temperature de generation (0.0 - 2.0)")
    max_tokens: Optional[int] = Field(None, gt=0, description="Nombre maximum de tokens a generer")
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0, description="Top-p sampling")
    frequency_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0, description="Penalite de frequence")
    presence_penalty: Optional[float] = Field(None, ge=-2.0, le=2.0, description="Penalite de presence")
    stream: Optional[bool] = Field(False, description="Activer le streaming de la reponse")

    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {"role": "user", "content": "Explique-moi la photosynthese en termes simples"}
                ],
                "model": "meta/llama-3.1-8b-instruct",
                "temperature": 0.7,
                "max_tokens": 500
            }
        }


class ChatResponse(BaseModel):
    """Reponse d'une generation de chat"""
    success: bool = Field(..., description="Indique si la requete a reussi")
    message: Optional[ChatMessage] = Field(None, description="Message genere par l'assistant")
    model: Optional[str] = Field(None, description="Modele utilise")
    usage: Optional[Dict[str, int]] = Field(None, description="Statistiques d'utilisation des tokens")
    finish_reason: Optional[str] = Field(None, description="Raison de fin de generation")
    error: Optional[str] = Field(None, description="Message d'erreur si applicable")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "La photosynthese est le processus par lequel les plantes..."
                },
                "model": "meta/llama-3.1-8b-instruct",
                "usage": {
                    "prompt_tokens": 20,
                    "completion_tokens": 150,
                    "total_tokens": 170
                },
                "finish_reason": "stop"
            }
        }


class ModelInfo(BaseModel):
    """Informations sur un modele NVIDIA NIM"""
    id: str = Field(..., description="Identifiant du modele")
    object: str = Field(..., description="Type d'objet (model)")
    created: Optional[int] = Field(None, description="Timestamp de creation")
    owned_by: Optional[str] = Field(None, description="Proprietaire du modele")


class ListModelsResponse(BaseModel):
    """Liste des modeles disponibles"""
    success: bool = Field(..., description="Indique si la requete a reussi")
    models: Optional[List[ModelInfo]] = Field(None, description="Liste des modeles disponibles")
    error: Optional[str] = Field(None, description="Message d'erreur si applicable")


class HealthResponse(BaseModel):
    """Reponse du health check"""
    status: str = Field(..., description="Etat du service")
    service: str = Field(..., description="Nom du service")
    version: str = Field(..., description="Version de l'API")
    nvidia_nim_configured: bool = Field(..., description="Indique si la cle API NVIDIA NIM est configuree")
