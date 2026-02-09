"""
Modèles Pydantic pour le connecteur Anthropic
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class MessageRole(str, Enum):
    """Rôles possibles pour un message"""
    system = "system"
    user = "user"
    assistant = "assistant"


class ChatMessage(BaseModel):
    """Message dans une conversation"""
    role: MessageRole = Field(..., description="Rôle du message (system, user, assistant)")
    content: str = Field(..., description="Contenu du message")

    class Config:
        json_schema_extra = {
            "example": {
                "role": "user",
                "content": "Explique-moi l'apprentissage par renforcement"
            }
        }


class ChatRequest(BaseModel):
    """Requête pour générer une réponse via chat"""
    messages: List[ChatMessage] = Field(..., description="Historique de la conversation")
    model: Optional[str] = Field(None, description="Modèle Claude à utiliser")
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0, description="Température de génération (0.0 - 1.0)")
    max_tokens: Optional[int] = Field(None, gt=0, description="Nombre maximum de tokens à générer")
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0, description="Top-p sampling")
    top_k: Optional[int] = Field(None, gt=0, description="Top-k sampling")
    stream: Optional[bool] = Field(False, description="Activer le streaming de la réponse")

    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {"role": "user", "content": "Explique-moi l'apprentissage par renforcement"}
                ],
                "model": "claude-3-5-sonnet-20241022",
                "temperature": 0.7,
                "max_tokens": 500
            }
        }


class ChatResponse(BaseModel):
    """Réponse d'une génération de chat"""
    success: bool = Field(..., description="Indique si la requête a réussi")
    message: Optional[ChatMessage] = Field(None, description="Message généré par l'assistant")
    model: Optional[str] = Field(None, description="Modèle utilisé")
    usage: Optional[Dict[str, int]] = Field(None, description="Statistiques d'utilisation des tokens")
    finish_reason: Optional[str] = Field(None, description="Raison de fin de génération")
    error: Optional[str] = Field(None, description="Message d'erreur si applicable")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "L'apprentissage par renforcement est une méthode..."
                },
                "model": "claude-3-5-sonnet-20241022",
                "usage": {
                    "prompt_tokens": 20,
                    "completion_tokens": 150,
                    "total_tokens": 170
                },
                "finish_reason": "end_turn"
            }
        }


class ModelInfo(BaseModel):
    """Informations sur un modèle Anthropic"""
    id: str = Field(..., description="Identifiant du modèle")
    object: str = Field(..., description="Type d'objet (model)")
    created: Optional[int] = Field(None, description="Timestamp de création")
    owned_by: Optional[str] = Field(None, description="Propriétaire du modèle")


class ListModelsResponse(BaseModel):
    """Liste des modèles disponibles"""
    success: bool = Field(..., description="Indique si la requête a réussi")
    models: Optional[List[ModelInfo]] = Field(None, description="Liste des modèles disponibles")
    error: Optional[str] = Field(None, description="Message d'erreur si applicable")


class HealthResponse(BaseModel):
    """Réponse du health check"""
    status: str = Field(..., description="État du service")
    service: str = Field(..., description="Nom du service")
    version: str = Field(..., description="Version de l'API")
    anthropic_configured: bool = Field(..., description="Indique si la clé API Anthropic est configurée")
