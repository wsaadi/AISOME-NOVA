"""
Simple Agent Definition - Modèle simplifié pour agents textuels.

Ce module définit le schéma simplifié pour les agents créés via le Builder IA.
Les agents sont purement textuels avec:
- Prompt système personnalisé
- Prompt utilisateur personnalisé
- Inputs multimodaux (texte, images, documents)
- Outputs en markdown avec options d'export (Excel, Word, PPT, PDF)
"""

from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class AgentStatus(str, Enum):
    """Statut du cycle de vie de l'agent."""
    DRAFT = "draft"
    ACTIVE = "active"
    DISABLED = "disabled"


class ExportFormat(str, Enum):
    """Formats d'export disponibles."""
    EXCEL = "excel"
    WORD = "word"
    POWERPOINT = "powerpoint"
    PDF = "pdf"


class TemplateDocument(BaseModel):
    """Document template ou exemple fourni à l'agent."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Nom du document")
    description: Optional[str] = Field(None, description="Description du document")
    file_path: Optional[str] = Field(None, description="Chemin vers le fichier uploadé")
    content: Optional[str] = Field(None, description="Contenu textuel si applicable")
    document_type: str = Field("example", description="Type: 'example', 'template', 'reference'")


class SimpleAgentMetadata(BaseModel):
    """Métadonnées de l'agent."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(None, description="ID de l'utilisateur créateur")
    version: str = Field("1.0.0")
    tags: List[str] = Field(default_factory=list)


class SimpleAgentDefinition(BaseModel):
    """
    Définition simplifiée d'un agent textuel.

    Un agent textuel est composé de:
    - Une identité (nom, description, icône)
    - Un prompt système qui définit son comportement
    - Un prompt utilisateur optionnel (template de message initial)
    - Des documents templates/exemples optionnels
    - Des options d'export (Excel, Word, PPT, PDF)

    L'interface est toujours la même: chat multimodal hérité de l'Assistant IA Pro.
    """
    # Identité
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100, description="Nom de l'agent")
    description: str = Field(..., min_length=1, max_length=500, description="Description courte")
    long_description: Optional[str] = Field(None, max_length=5000, description="Description détaillée")
    icon: str = Field("fa fa-robot", description="Icône Font Awesome")
    category: str = Field("custom", description="Catégorie de l'agent")
    status: AgentStatus = Field(AgentStatus.DRAFT, description="Statut de l'agent")

    # Métadonnées
    metadata: SimpleAgentMetadata = Field(default_factory=SimpleAgentMetadata)

    # Comportement IA
    system_prompt: str = Field(
        ...,
        min_length=10,
        description="Prompt système définissant le comportement de l'agent"
    )
    user_prompt_template: Optional[str] = Field(
        None,
        description="Template de prompt utilisateur (variables: {{user_input}}, {{document_content}})"
    )

    # Documents templates/exemples
    template_documents: List[TemplateDocument] = Field(
        default_factory=list,
        description="Documents exemples ou templates fournis à l'agent"
    )

    # Options d'export
    export_formats: List[ExportFormat] = Field(
        default_factory=list,
        description="Formats d'export disponibles pour les résultats"
    )

    # Configuration simple
    temperature: float = Field(0.7, ge=0, le=2, description="Température du LLM")
    max_tokens: int = Field(4096, ge=256, le=32000, description="Tokens maximum")

    # Sécurité (géré par les admins)
    requires_auth: bool = Field(False, description="Authentification requise")
    allowed_roles: List[str] = Field(default_factory=list, description="Rôles autorisés")
    is_public: bool = Field(False, description="Agent visible par tous les utilisateurs")

    def generate_route(self) -> str:
        """Génère une route URL-safe à partir de l'ID de l'agent."""
        return f"/agent/{self.id}"

    def to_chat_config(self) -> Dict[str, Any]:
        """
        Convertit l'agent en configuration pour l'interface chat.
        Utilisé pour initialiser le chat multimodal avec les paramètres de l'agent.
        """
        return {
            "agent_id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "system_prompt": self.system_prompt,
            "user_prompt_template": self.user_prompt_template,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "export_formats": [f.value for f in self.export_formats],
            "template_documents": [doc.model_dump() for doc in self.template_documents],
            "multimodal": True,  # Toujours multimodal (texte, images, documents)
        }


# ============== API REQUEST/RESPONSE MODELS ==============

class CreateSimpleAgentRequest(BaseModel):
    """Requête de création d'agent via le Builder IA."""
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    system_prompt: str = Field(..., min_length=10)
    user_prompt_template: Optional[str] = None
    icon: Optional[str] = "fa fa-robot"
    category: Optional[str] = "custom"
    export_formats: Optional[List[ExportFormat]] = None
    long_description: Optional[str] = None
    tags: Optional[List[str]] = None


class UpdateSimpleAgentRequest(BaseModel):
    """Requête de mise à jour d'un agent."""
    name: Optional[str] = None
    description: Optional[str] = None
    system_prompt: Optional[str] = None
    user_prompt_template: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    status: Optional[AgentStatus] = None
    export_formats: Optional[List[ExportFormat]] = None
    long_description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None


class SimpleAgentListResponse(BaseModel):
    """Réponse contenant une liste d'agents."""
    agents: List[SimpleAgentDefinition]
    total: int
    page: int = 1
    page_size: int = 20


class SimpleAgentResponse(BaseModel):
    """Réponse contenant un agent."""
    success: bool
    agent: Optional[SimpleAgentDefinition] = None
    message: Optional[str] = None


# ============== BUILDER IA MODELS ==============

class BuilderConversation(BaseModel):
    """Conversation avec le Builder IA."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field("in_progress", description="Status: 'in_progress', 'completed', 'out_of_scope'")
    generated_agent: Optional[SimpleAgentDefinition] = None
    out_of_scope_summary: Optional[str] = Field(
        None,
        description="Résumé formaté du besoin hors périmètre à envoyer aux admins IA"
    )


class BuilderMessage(BaseModel):
    """Message dans la conversation avec le Builder IA."""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Contenu du message")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    attachments: List[Dict[str, Any]] = Field(default_factory=list, description="Documents joints")


class BuilderResponse(BaseModel):
    """Réponse du Builder IA."""
    message: str = Field(..., description="Message de réponse")
    conversation_status: str = Field(..., description="Status: 'needs_more_info', 'ready_to_create', 'out_of_scope'")
    generated_agent: Optional[SimpleAgentDefinition] = Field(None, description="Agent généré si prêt")
    out_of_scope_summary: Optional[str] = Field(None, description="Résumé si hors périmètre")
    questions: Optional[List[str]] = Field(None, description="Questions de clarification si besoin")
