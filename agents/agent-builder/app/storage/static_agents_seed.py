"""
Static Agents Seed - Registers all built-in (static) agents in the unified storage.

These agents have dedicated Angular components but are tracked in the same storage
system as dynamic and runtime agents for unified catalog management.
"""

from datetime import datetime
from ..models import AgentDefinition, AgentStatus, AgentType, AgentMetadata, AIBehavior, UILayout


# All static agents that ship with the platform
STATIC_AGENTS = [
    {
        "id": "document-analyzer",
        "name": "Document Analyzer",
        "description": "Analyse intelligente de documents avec extraction de données structurées",
        "icon": "fa fa-file-contract",
        "category": "document_analysis",
        "route": "/document-analyzer",
        "tags": ["document", "analysis", "extraction"],
    },
    {
        "id": "appointment-scheduler",
        "name": "Appointment Scheduler",
        "description": "Planification et gestion intelligente des rendez-vous",
        "icon": "fa fa-calendar-check",
        "category": "sales",
        "route": "/appointment-scheduler",
        "tags": ["scheduling", "calendar", "sales"],
    },
    {
        "id": "dolibarr-stats",
        "name": "Dolibarr Stats",
        "description": "Analyse et visualisation des statistiques Dolibarr ERP",
        "icon": "fa fa-chart-pie",
        "category": "sales_analysis",
        "route": "/dolibarr-stats",
        "tags": ["erp", "dolibarr", "analytics"],
    },
    {
        "id": "web-monitoring",
        "name": "Web Monitoring",
        "description": "Surveillance et analyse de sites web en temps réel",
        "icon": "fa fa-globe",
        "category": "intelligence",
        "route": "/web-monitoring",
        "tags": ["monitoring", "web", "intelligence"],
    },
    {
        "id": "ai-chat",
        "name": "AI Chat",
        "description": "Assistant conversationnel IA multi-modèle",
        "icon": "fa fa-comments",
        "category": "ai_assistant",
        "route": "/ai-chat",
        "tags": ["chat", "assistant", "conversation"],
    },
    {
        "id": "data-extractor",
        "name": "Data Extractor",
        "description": "Extraction automatique de données depuis différentes sources",
        "icon": "fa fa-database",
        "category": "extraction",
        "route": None,
        "tags": ["extraction", "data", "automation"],
    },
    {
        "id": "report-generator",
        "name": "Report Generator",
        "description": "Génération automatique de rapports professionnels",
        "icon": "fa fa-file-word",
        "category": "generation",
        "route": None,
        "tags": ["report", "generation", "document"],
    },
    {
        "id": "contract-analyzer",
        "name": "Contract Analyzer",
        "description": "Analyse juridique automatisée de contrats",
        "icon": "fa fa-gavel",
        "category": "legal_analysis",
        "route": "/contract-analysis",
        "tags": ["legal", "contract", "analysis"],
    },
    {
        "id": "legal-contract-agent",
        "name": "Legal Contract Agent",
        "description": "Agent spécialisé en droit des contrats",
        "icon": "fa fa-scale-balanced",
        "category": "legal_analysis",
        "route": "/legal-contract-agent",
        "tags": ["legal", "contract", "law"],
    },
    {
        "id": "pod-analyzer",
        "name": "POD Analyzer",
        "description": "Analyse de preuves de livraison (Proof of Delivery)",
        "icon": "fa fa-file-pdf",
        "category": "logistics",
        "route": "/pod-analyzer",
        "tags": ["logistics", "delivery", "pdf"],
    },
    {
        "id": "iso9001-audit",
        "name": "Audit ISO 9001",
        "description": "Assistant d'audit qualité ISO 9001:2015 avec génération de documents",
        "icon": "fa fa-clipboard-check",
        "category": "audit_quality",
        "route": "/iso9001-audit",
        "tags": ["iso9001", "audit", "quality"],
    },
    {
        "id": "nvidia-multimodal",
        "name": "NVIDIA Multimodal",
        "description": "Agent multimodal NVIDIA avec LLM, génération d'images, TTS et avatar 3D",
        "icon": "fa fa-microchip",
        "category": "nvidia_ai",
        "route": "/nvidia-multimodal",
        "tags": ["nvidia", "multimodal", "llm", "tts", "image"],
    },
    {
        "id": "nvidia-vista3d",
        "name": "NVIDIA Vista 3D",
        "description": "Segmentation médicale 3D avec NVIDIA Vista 3D",
        "icon": "fa fa-cube",
        "category": "nvidia_ai",
        "route": "/nvidia-vista3d",
        "tags": ["nvidia", "medical", "3d", "segmentation"],
    },
    {
        "id": "nvidia-fourcastnet",
        "name": "NVIDIA FourCastNet",
        "description": "Prévisions météorologiques avec NVIDIA FourCastNet",
        "icon": "fa fa-cloud-sun",
        "category": "nvidia_ai",
        "route": "/nvidia-fourcastnet",
        "tags": ["nvidia", "weather", "forecasting"],
    },
    {
        "id": "nvidia-openfold3",
        "name": "NVIDIA OpenFold3",
        "description": "Prédiction de structures protéiques avec OpenFold3",
        "icon": "fa fa-dna",
        "category": "nvidia_ai",
        "route": "/nvidia-openfold3",
        "tags": ["nvidia", "protein", "biology"],
    },
    {
        "id": "nvidia-grounding-dino",
        "name": "NVIDIA Grounding DINO",
        "description": "Détection d'objets zero-shot avec Grounding DINO",
        "icon": "fa fa-crosshairs",
        "category": "nvidia_ai",
        "route": "/nvidia-grounding-dino",
        "tags": ["nvidia", "detection", "vision"],
    },
    {
        "id": "webgpu-local-agent",
        "name": "Vision IA Locale (WebGPU)",
        "description": "Agent de vision IA exécuté localement via WebGPU",
        "icon": "fa fa-eye",
        "category": "nvidia_ai",
        "route": "/webgpu-local-agent",
        "tags": ["webgpu", "local", "vision", "ai"],
    },
]


def _build_agent_definition(data: dict) -> AgentDefinition:
    """Build an AgentDefinition from static agent data."""
    return AgentDefinition(
        id=data["id"],
        name=data["name"],
        description=data["description"],
        icon=data["icon"],
        category=data["category"],
        status=AgentStatus.ACTIVE,
        agent_type=AgentType.STATIC,
        route=data.get("route"),
        metadata=AgentMetadata(
            created_at=datetime(2024, 1, 1),
            updated_at=datetime.utcnow(),
            created_by="system",
            version="1.0.0",
            tags=data.get("tags", []),
        ),
        ai_behavior=AIBehavior(
            system_prompt=f"You are the {data['name']} agent. {data['description']}",
        ),
        ui_layout=UILayout(sections=[]),
    )


async def seed_static_agents(storage) -> int:
    """
    Seed all static agents into the storage if they don't already exist.

    Args:
        storage: The AgentStorage instance.

    Returns:
        Number of agents seeded.
    """
    seeded = 0
    for agent_data in STATIC_AGENTS:
        agent_id = agent_data["id"]
        existing = await storage.get(agent_id)
        if existing is None:
            agent = _build_agent_definition(agent_data)
            await storage.save(agent)
            seeded += 1
        else:
            # Ensure existing static agents have the correct agent_type
            if not hasattr(existing, 'agent_type') or existing.agent_type != AgentType.STATIC:
                existing.agent_type = AgentType.STATIC
                await storage.save(existing)

    return seeded
