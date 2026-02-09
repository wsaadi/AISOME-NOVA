"""
Agent Templates Registry

This module provides access to pre-built agent templates in ADL format.
Templates can be used as starting points for creating new agents.
"""

from pathlib import Path
from typing import Dict, List, Optional
import yaml


# Template directory
TEMPLATES_DIR = Path(__file__).parent


# Available templates with metadata
TEMPLATES_REGISTRY: List[Dict[str, str]] = [
    {
        "id": "ai-chat-agent",
        "name": "AI Chat Agent",
        "description": "Agent de chat IA gouverné avec modération de contenu",
        "category": "conversation",
        "filename": "ai-chat-agent.yaml",
        "icon": "fa fa-comments"
    },
    {
        "id": "document-analyzer",
        "name": "Document Analyzer",
        "description": "Analyse de documents et génération de synthèses",
        "category": "document_analysis",
        "filename": "document-analyzer.yaml",
        "icon": "fa fa-file-alt"
    },
    {
        "id": "web-monitoring-agent",
        "name": "Web Monitoring Agent",
        "description": "Agent de veille technologique et marché",
        "category": "monitoring",
        "filename": "web-monitoring-agent.yaml",
        "icon": "fa fa-globe"
    },
    {
        "id": "contract-analysis-agent",
        "name": "Contract Analysis Agent",
        "description": "Analyse de contrats et documents juridiques",
        "category": "document_analysis",
        "filename": "contract-analysis-agent.yaml",
        "icon": "fa fa-gavel"
    },
    {
        "id": "email-pod-analyzer",
        "name": "Email POD Analyzer",
        "description": "Analyse d'emails et pièces jointes",
        "category": "data_processing",
        "filename": "email-pod-analyzer.yaml",
        "icon": "fa fa-envelope-open-text"
    },
    {
        "id": "dolibarr-stats-agent",
        "name": "Dolibarr Stats Agent",
        "description": "Tableau de bord analytique pour Dolibarr ERP",
        "category": "analytics",
        "filename": "dolibarr-stats-agent.yaml",
        "icon": "fa fa-chart-bar"
    },
]


def list_templates() -> List[Dict[str, str]]:
    """List all available agent templates."""
    return TEMPLATES_REGISTRY


def get_template_path(template_id: str) -> Optional[Path]:
    """Get the file path for a template by ID."""
    for template in TEMPLATES_REGISTRY:
        if template["id"] == template_id:
            return TEMPLATES_DIR / template["filename"]
    return None


def load_template(template_id: str) -> Optional[Dict]:
    """Load a template by ID and return as dictionary."""
    path = get_template_path(template_id)
    if path and path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return None


def load_template_yaml(template_id: str) -> Optional[str]:
    """Load a template by ID and return as YAML string."""
    path = get_template_path(template_id)
    if path and path.exists():
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    return None


def get_templates_by_category(category: str) -> List[Dict[str, str]]:
    """Get templates filtered by category."""
    return [t for t in TEMPLATES_REGISTRY if t["category"] == category]


def get_categories() -> List[str]:
    """Get list of unique categories."""
    return list(set(t["category"] for t in TEMPLATES_REGISTRY))
