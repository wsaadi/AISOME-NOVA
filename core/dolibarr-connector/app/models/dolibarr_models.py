"""
Modèles Pydantic pour le connecteur Dolibarr
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ProposalStatus(str, Enum):
    """Statuts des propositions commerciales Dolibarr"""
    DRAFT = "0"  # Brouillon
    VALIDATED = "1"  # Validée
    SIGNED = "2"  # Signée
    NOT_SIGNED = "3"  # Non signée
    BILLED = "4"  # Facturée


class OpportunityRequest(BaseModel):
    """Requête pour récupérer les opportunités"""
    start_date: Optional[str] = Field(None, description="Date de début (format: YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Date de fin (format: YYYY-MM-DD)")
    limit: Optional[int] = Field(100, description="Nombre maximum de résultats")
    sortfield: Optional[str] = Field("t.date_creation", description="Champ de tri")
    sortorder: Optional[str] = Field("DESC", description="Ordre de tri (ASC/DESC)")


class Opportunity(BaseModel):
    """Modèle d'une opportunité/proposition Dolibarr"""
    id: str
    ref: str
    status: str
    status_label: Optional[str] = None
    total_ht: float = 0.0  # Total HT
    total_ttc: float = 0.0  # Total TTC
    date: Optional[str] = None
    date_creation: Optional[str] = None
    date_validation: Optional[str] = None
    date_signature: Optional[str] = None
    socid: Optional[str] = None  # ID du client
    client_name: Optional[str] = None
    note_public: Optional[str] = None
    note_private: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None


class OpportunityStats(BaseModel):
    """Statistiques des opportunités"""
    total_count: int
    total_amount_ht: float
    total_amount_ttc: float
    by_status: Dict[str, int]
    by_status_amount: Dict[str, float]


class OpportunityResponse(BaseModel):
    """Réponse avec les opportunités"""
    success: bool
    opportunities: Optional[List[Opportunity]] = None
    stats: Optional[OpportunityStats] = None
    total: Optional[int] = None
    error: Optional[str] = None


class ThirdParty(BaseModel):
    """Modèle d'un tiers (client/fournisseur)"""
    id: str
    name: str
    client: Optional[str] = None
    code_client: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ThirdPartyResponse(BaseModel):
    """Réponse avec les tiers"""
    success: bool
    thirdparties: Optional[List[ThirdParty]] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Réponse du health check"""
    status: str
    service: str
    version: str
    dolibarr_configured: bool
    dolibarr_url: Optional[str] = None
