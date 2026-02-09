"""
Modèles Pydantic pour l'agent d'analyse d'emails
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Task(BaseModel):
    """Représentation d'une tâche extraite d'un email"""
    title: str = Field(..., description="Titre de la tâche")
    description: str = Field(..., description="Description détaillée")
    due_date: Optional[str] = Field(None, description="Date d'échéance (ISO 8601)")
    priority: Optional[str] = Field(None, description="Priorité (haute, moyenne, basse)")
    email_uid: str = Field(..., description="UID de l'email source")
    email_subject: str = Field(..., description="Objet de l'email source")
    email_sender: str = Field(..., description="Expéditeur de l'email")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Répondre à la demande de devis",
                "description": "Le client ABC demande un devis pour 100 unités du produit X",
                "due_date": "2024-01-20T18:00:00Z",
                "priority": "haute",
                "email_uid": "12345",
                "email_subject": "Demande de devis urgente",
                "email_sender": "client@example.com"
            }
        }


class EmailAnalysisResult(BaseModel):
    """Résultat de l'analyse d'un email"""
    email_uid: str = Field(..., description="UID de l'email analysé")
    email_subject: str = Field(..., description="Objet de l'email")
    email_sender: str = Field(..., description="Expéditeur")
    tasks: List[Task] = Field(default_factory=list, description="Tâches identifiées")
    raw_analysis: Optional[str] = Field(None, description="Analyse brute du LLM")
    cards_created: List[str] = Field(default_factory=list, description="IDs des cartes WeKan créées")
    processed_at: str = Field(..., description="Date de traitement")
    success: bool = Field(True, description="Succès du traitement")
    error: Optional[str] = Field(None, description="Message d'erreur si échec")


class ProcessingStatus(BaseModel):
    """Statut du traitement en cours"""
    is_running: bool = Field(..., description="Indique si le polling est actif")
    last_check: Optional[str] = Field(None, description="Dernière vérification")
    emails_processed: int = Field(0, description="Nombre d'emails traités")
    tasks_created: int = Field(0, description="Nombre de tâches créées")
    errors_count: int = Field(0, description="Nombre d'erreurs")
    next_check: Optional[str] = Field(None, description="Prochaine vérification prévue")


class AgentStatus(BaseModel):
    """Statut global de l'agent"""
    status: str = Field(..., description="État de l'agent")
    service: str = Field(..., description="Nom du service")
    version: str = Field(..., description="Version")
    polling_enabled: bool = Field(..., description="Polling activé")
    polling_interval: int = Field(..., description="Intervalle de polling en secondes")
    services_status: dict = Field(default_factory=dict, description="État des services dépendants")
    processing: ProcessingStatus = Field(..., description="Statut du traitement")


class ProcessEmailRequest(BaseModel):
    """Requête pour traiter un email spécifique"""
    email_uid: str = Field(..., description="UID de l'email à traiter")
    folder: str = Field("INBOX", description="Dossier IMAP")

    class Config:
        json_schema_extra = {
            "example": {
                "email_uid": "12345",
                "folder": "INBOX"
            }
        }


class ProcessEmailResponse(BaseModel):
    """Réponse du traitement d'un email"""
    success: bool = Field(..., description="Succès du traitement")
    result: Optional[EmailAnalysisResult] = Field(None, description="Résultat de l'analyse")
    error: Optional[str] = Field(None, description="Message d'erreur")
