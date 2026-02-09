"""
NeMo Guardrails Settings Router - Configuration UI for NVIDIA NeMo Guardrails.

Manages guardrails configuration including topic filtering, content moderation,
and jailbreak detection settings.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json
import os
import httpx
from pathlib import Path


router = APIRouter(prefix="/api/v1/nemo-guardrails", tags=["NeMo Guardrails Settings"])


# ============== MODELS ==============

class ContentRule(BaseModel):
    """Regle de filtrage de contenu"""
    category: str = ""
    blocked: bool = True
    threshold: float = 0.7


class NeMoGuardrailsConfig(BaseModel):
    """Configuration NeMo Guardrails"""
    enabled: bool = True
    topic_check_enabled: bool = True
    content_check_enabled: bool = True
    jailbreak_check_enabled: bool = True
    allowed_topics: List[str] = Field(default_factory=lambda: [
        "technology", "science", "business", "education",
        "health", "finance", "legal", "general"
    ])
    blocked_topics: List[str] = Field(default_factory=lambda: [
        "weapons", "drugs", "illegal_activities", "exploitation",
        "hacking", "cybercrime", "piracy", "unauthorized_access"
    ])
    content_rules: List[ContentRule] = Field(default_factory=lambda: [
        ContentRule(category="violence", blocked=True, threshold=0.7),
        ContentRule(category="sexual", blocked=True, threshold=0.7),
        ContentRule(category="hate_speech", blocked=True, threshold=0.7),
        ContentRule(category="self_harm", blocked=True, threshold=0.8),
        ContentRule(category="dangerous_content", blocked=True, threshold=0.7),
        ContentRule(category="hacking", blocked=True, threshold=0.6),
        ContentRule(category="fraud", blocked=True, threshold=0.7),
    ])
    jailbreak_threshold: float = 0.8
    topic_model: Optional[str] = None
    content_model: Optional[str] = None
    jailbreak_model: Optional[str] = None


class AgentGuardrailsConfig(BaseModel):
    """Configuration guardrails specifique a un agent"""
    agent_id: str
    agent_name: str = ""
    enabled: bool = True
    config: Optional[NeMoGuardrailsConfig] = None


class NeMoGuardrailsSettings(BaseModel):
    """Configuration complete des guardrails NeMo"""
    enabled: bool = False
    config: NeMoGuardrailsConfig = Field(default_factory=NeMoGuardrailsConfig)
    agent_configs: List[AgentGuardrailsConfig] = Field(default_factory=list)


# ============== STORAGE ==============

_current_settings: Optional[NeMoGuardrailsSettings] = None
_settings_file_path = os.getenv("NEMO_GUARDRAILS_CONFIG_PATH", "/app/config/nemo_guardrails_config.json")


def get_default_settings() -> NeMoGuardrailsSettings:
    return NeMoGuardrailsSettings()


def load_settings_from_file() -> Optional[NeMoGuardrailsSettings]:
    try:
        if os.path.exists(_settings_file_path):
            with open(_settings_file_path, 'r') as f:
                data = json.load(f)
                return NeMoGuardrailsSettings(**data)
    except Exception as e:
        print(f"Error loading NeMo Guardrails settings: {e}")
    return None


def save_settings_to_file(settings: NeMoGuardrailsSettings) -> bool:
    try:
        Path(_settings_file_path).parent.mkdir(parents=True, exist_ok=True)
        with open(_settings_file_path, 'w') as f:
            json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving NeMo Guardrails settings: {e}")
        return False


def get_current_settings() -> NeMoGuardrailsSettings:
    global _current_settings
    if _current_settings is None:
        _current_settings = load_settings_from_file()
        if _current_settings is None:
            _current_settings = get_default_settings()
    return _current_settings


# ============== ENDPOINTS ==============

@router.get("/settings", response_model=NeMoGuardrailsSettings)
async def get_settings():
    """Get current NeMo Guardrails settings."""
    return get_current_settings()


@router.post("/settings", response_model=NeMoGuardrailsSettings)
async def save_settings(settings: NeMoGuardrailsSettings):
    """Save NeMo Guardrails settings."""
    global _current_settings
    _current_settings = settings
    save_settings_to_file(settings)
    return _current_settings


@router.post("/settings/reset", response_model=NeMoGuardrailsSettings)
async def reset_settings():
    """Reset NeMo Guardrails settings to defaults."""
    global _current_settings
    _current_settings = get_default_settings()
    save_settings_to_file(_current_settings)
    return _current_settings


@router.get("/settings/enums")
async def get_enums():
    """Get available enum values for the UI."""
    return {
        "content_categories": [
            "violence", "sexual", "hate_speech", "self_harm",
            "dangerous_content", "harassment", "profanity",
            "personal_information", "misinformation",
            "hacking", "fraud", "cybercrime"
        ],
        "default_topics_allowed": [
            "technology", "science", "business", "education",
            "health", "finance", "legal", "general",
            "arts", "sports", "entertainment", "travel"
        ],
        "default_topics_blocked": [
            "weapons", "drugs", "illegal_activities", "exploitation",
            "terrorism", "fraud", "hacking", "cybercrime",
            "piracy", "unauthorized_access"
        ],
        "safety_models": [
            {"id": "nvidia/llama-3.1-nemoguard-8b-topic-control", "label": "NeMoGuard 8B Topic Control", "type": "topic"},
            {"id": "nvidia/llama-3.1-nemoguard-8b-content-safety", "label": "NeMoGuard 8B Content Safety", "type": "content"},
            {"id": "nvidia/llama-3.1-nemoguard-8b-content-safety", "label": "NeMoGuard Content Safety (Jailbreak)", "type": "jailbreak"}
        ]
    }


# --- Agent config endpoints ---

@router.get("/agents/{agent_id}", response_model=Optional[AgentGuardrailsConfig])
async def get_agent_config(agent_id: str):
    """Get NeMo Guardrails config for a specific agent."""
    settings = get_current_settings()
    for config in settings.agent_configs:
        if config.agent_id == agent_id:
            return config
    return None


@router.post("/agents/{agent_id}", response_model=AgentGuardrailsConfig)
async def save_agent_config(agent_id: str, config: AgentGuardrailsConfig):
    """Save NeMo Guardrails config for a specific agent."""
    global _current_settings
    settings = get_current_settings()
    config.agent_id = agent_id

    found = False
    for i, existing in enumerate(settings.agent_configs):
        if existing.agent_id == agent_id:
            settings.agent_configs[i] = config
            found = True
            break
    if not found:
        settings.agent_configs.append(config)

    _current_settings = settings
    save_settings_to_file(settings)
    return config


@router.delete("/agents/{agent_id}")
async def delete_agent_config(agent_id: str):
    """Delete NeMo Guardrails config for a specific agent."""
    global _current_settings
    settings = get_current_settings()
    settings.agent_configs = [c for c in settings.agent_configs if c.agent_id != agent_id]
    _current_settings = settings
    save_settings_to_file(settings)
    return {"deleted": True}


class GuardrailTestRequest(BaseModel):
    content: str
    config: Optional[NeMoGuardrailsConfig] = None


@router.post("/test")
async def test_guardrails(request: GuardrailTestRequest):
    """Test guardrails by proxying to the nemo-guardrails-tool service."""
    tool_url = os.getenv("RUNTIME_TOOL_NEMO_GUARDRAILS", "http://nemo-guardrails-tool:8000")
    payload: Dict[str, Any] = {"content": request.content}
    if request.config:
        config_dict = request.config.model_dump()
        # The tool's GuardrailsConfig expects 'enabled: true' to run checks.
        # Always enable when testing explicitly from the UI.
        config_dict["enabled"] = True
        payload["config"] = config_dict
    else:
        payload["config"] = {"enabled": True}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{tool_url}/api/v1/guardrails/check", json=payload)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Guardrails tool unreachable: {str(e)}")
