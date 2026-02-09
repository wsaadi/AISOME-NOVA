"""
Modèles Pydantic pour le connecteur Ollama
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
                "content": "Bonjour, comment vas-tu ?"
            }
        }


class ChatRequest(BaseModel):
    """Requête pour générer une réponse via chat"""
    messages: List[ChatMessage] = Field(..., description="Historique de la conversation")
    model: Optional[str] = Field(None, description="Modèle Ollama à utiliser (par défaut: gemma3:4b)")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Température de génération (0.0 - 2.0)")
    max_tokens: Optional[int] = Field(None, gt=0, description="Nombre maximum de tokens à générer")
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0, description="Top-p sampling")
    stream: Optional[bool] = Field(False, description="Activer le streaming de la réponse")

    class Config:
        json_schema_extra = {
            "example": {
                "messages": [
                    {"role": "user", "content": "Analyse cet email et identifie les tâches à faire"}
                ],
                "model": "gemma3:4b",
                "temperature": 0.7,
                "max_tokens": 1024
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
    eval_duration: Optional[float] = Field(None, description="Durée d'évaluation en secondes")
    total_duration: Optional[float] = Field(None, description="Durée totale en secondes")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": {
                    "role": "assistant",
                    "content": "J'ai identifié les tâches suivantes..."
                },
                "model": "gemma3:4b",
                "usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 200,
                    "total_tokens": 250
                },
                "finish_reason": "stop"
            }
        }


class ModelInfo(BaseModel):
    """Informations sur un modèle Ollama"""
    name: str = Field(..., description="Nom du modèle")
    model: str = Field(..., description="Identifiant du modèle")
    modified_at: Optional[str] = Field(None, description="Date de modification")
    size: Optional[int] = Field(None, description="Taille du modèle en bytes")
    digest: Optional[str] = Field(None, description="Digest du modèle")
    details: Optional[Dict[str, Any]] = Field(None, description="Détails du modèle")


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
    ollama_connected: bool = Field(..., description="Indique si Ollama est accessible")
    default_model: Optional[str] = Field(None, description="Modèle par défaut configuré")


class PullModelRequest(BaseModel):
    """Requête pour télécharger un modèle"""
    name: str = Field(..., description="Nom du modèle à télécharger (ex: gemma3:4b)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "gemma3:4b"
            }
        }


class PullModelResponse(BaseModel):
    """Réponse du téléchargement d'un modèle"""
    success: bool = Field(..., description="Indique si le téléchargement a réussi")
    message: Optional[str] = Field(None, description="Message de statut")
    error: Optional[str] = Field(None, description="Message d'erreur si applicable")
