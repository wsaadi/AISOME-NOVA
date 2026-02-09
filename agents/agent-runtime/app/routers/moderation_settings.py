"""
Moderation Settings Router - AI-powered natural language moderation system.

Admins define moderation rules per agent and per user in natural language.
The AI evaluates user messages against these rules at runtime.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json
import os
from pathlib import Path


router = APIRouter(prefix="/api/v1/moderation", tags=["Moderation Settings"])


# ============== MODELS ==============

class ModerationRule(BaseModel):
    """A single natural language moderation rule."""
    id: str = ""
    instruction: str = Field(..., description="Natural language moderation instruction, e.g. 'Block any request about cooking recipes'")
    enabled: bool = True


class AgentModerationConfig(BaseModel):
    """Moderation configuration for a specific agent."""
    agent_id: str
    agent_name: str = ""
    enabled: bool = True
    rules: List[ModerationRule] = Field(default_factory=list)


class UserModerationConfig(BaseModel):
    """Moderation configuration for a specific user."""
    user_id: str
    username: str = ""
    enabled: bool = True
    rules: List[ModerationRule] = Field(default_factory=list)


class GlobalModerationConfig(BaseModel):
    """Global moderation rules applied to all agents and users."""
    enabled: bool = True
    rules: List[ModerationRule] = Field(default_factory=list)


class ModerationSettings(BaseModel):
    """Complete moderation settings."""
    global_config: GlobalModerationConfig = Field(default_factory=GlobalModerationConfig)
    agent_configs: List[AgentModerationConfig] = Field(default_factory=list)
    user_configs: List[UserModerationConfig] = Field(default_factory=list)


class ModerationCheckRequest(BaseModel):
    """Request to check content against moderation rules."""
    content: str
    agent_id: Optional[str] = None
    user_id: Optional[str] = None


class ModerationCheckResponse(BaseModel):
    """Response from AI moderation check."""
    approved: bool
    reason: str = ""
    matched_rules: List[str] = Field(default_factory=list)


class TestModerationRequest(BaseModel):
    """Request to test moderation rules."""
    content: str
    agent_id: Optional[str] = None
    user_id: Optional[str] = None


# ============== SETTINGS STORAGE ==============

_current_settings: Optional[ModerationSettings] = None
_settings_file_path = os.getenv("MODERATION_SETTINGS_PATH", "/app/config/moderation_settings.json")


def get_default_settings() -> ModerationSettings:
    """Get default moderation settings."""
    return ModerationSettings(
        global_config=GlobalModerationConfig(
            enabled=True,
            rules=[
                ModerationRule(
                    id="default-1",
                    instruction="Bloquer les messages contenant des insultes, du langage vulgaire ou des propos haineux.",
                    enabled=True
                ),
                ModerationRule(
                    id="default-2",
                    instruction="Bloquer les messages contenant des données sensibles comme des mots de passe, numéros de carte bancaire, ou clés API.",
                    enabled=True
                ),
            ]
        ),
        agent_configs=[],
        user_configs=[]
    )


def load_settings_from_file() -> Optional[ModerationSettings]:
    """Load settings from file if exists."""
    try:
        if os.path.exists(_settings_file_path):
            with open(_settings_file_path, 'r') as f:
                data = json.load(f)
                return ModerationSettings(**data)
    except Exception as e:
        print(f"Error loading moderation settings from file: {e}")
    return None


def save_settings_to_file(settings: ModerationSettings) -> bool:
    """Save settings to file."""
    try:
        Path(_settings_file_path).parent.mkdir(parents=True, exist_ok=True)
        with open(_settings_file_path, 'w') as f:
            json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving moderation settings to file: {e}")
        return False


def get_current_settings() -> ModerationSettings:
    """Get current settings (load from file or use defaults)."""
    global _current_settings
    if _current_settings is None:
        _current_settings = load_settings_from_file()
        if _current_settings is None:
            _current_settings = get_default_settings()
    return _current_settings


def get_rules_for_context(agent_id: Optional[str] = None, user_id: Optional[str] = None) -> List[str]:
    """
    Collect all applicable moderation rules for a given agent/user context.
    Returns a list of natural language instructions.
    """
    settings = get_current_settings()
    rules: List[str] = []

    # Global rules
    if settings.global_config.enabled:
        for rule in settings.global_config.rules:
            if rule.enabled:
                rules.append(rule.instruction)

    # Agent-specific rules
    if agent_id:
        for agent_config in settings.agent_configs:
            if agent_config.agent_id == agent_id and agent_config.enabled:
                for rule in agent_config.rules:
                    if rule.enabled:
                        rules.append(rule.instruction)

    # User-specific rules
    if user_id:
        for user_config in settings.user_configs:
            if user_config.user_id == user_id and user_config.enabled:
                for rule in user_config.rules:
                    if rule.enabled:
                        rules.append(rule.instruction)

    return rules


# ============== ENDPOINTS ==============

@router.get("/settings", response_model=ModerationSettings)
async def get_settings():
    """Get current moderation settings."""
    return get_current_settings()


@router.post("/settings", response_model=ModerationSettings)
async def save_settings(settings: ModerationSettings):
    """Save moderation settings."""
    global _current_settings
    _current_settings = settings
    save_settings_to_file(settings)
    return _current_settings


@router.post("/settings/reset", response_model=ModerationSettings)
async def reset_settings():
    """Reset moderation settings to defaults."""
    global _current_settings
    _current_settings = get_default_settings()
    save_settings_to_file(_current_settings)
    return _current_settings


@router.get("/rules")
async def get_rules_for(agent_id: Optional[str] = None, user_id: Optional[str] = None):
    """Get applicable rules for a given agent/user context."""
    rules = get_rules_for_context(agent_id, user_id)
    return {"rules": rules, "count": len(rules)}


# --- Agent config endpoints ---

@router.get("/agents/{agent_id}", response_model=Optional[AgentModerationConfig])
async def get_agent_config(agent_id: str):
    """Get moderation config for a specific agent."""
    settings = get_current_settings()
    for config in settings.agent_configs:
        if config.agent_id == agent_id:
            return config
    return None


@router.post("/agents/{agent_id}", response_model=AgentModerationConfig)
async def save_agent_config(agent_id: str, config: AgentModerationConfig):
    """Save moderation config for a specific agent."""
    global _current_settings
    settings = get_current_settings()
    config.agent_id = agent_id

    # Replace or add
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
    """Delete moderation config for a specific agent."""
    global _current_settings
    settings = get_current_settings()
    settings.agent_configs = [c for c in settings.agent_configs if c.agent_id != agent_id]
    _current_settings = settings
    save_settings_to_file(settings)
    return {"deleted": True}


# --- User config endpoints ---

@router.get("/users/{user_id}", response_model=Optional[UserModerationConfig])
async def get_user_config(user_id: str):
    """Get moderation config for a specific user."""
    settings = get_current_settings()
    for config in settings.user_configs:
        if config.user_id == user_id:
            return config
    return None


@router.post("/users/{user_id}", response_model=UserModerationConfig)
async def save_user_config(user_id: str, config: UserModerationConfig):
    """Save moderation config for a specific user."""
    global _current_settings
    settings = get_current_settings()
    config.user_id = user_id

    found = False
    for i, existing in enumerate(settings.user_configs):
        if existing.user_id == user_id:
            settings.user_configs[i] = config
            found = True
            break
    if not found:
        settings.user_configs.append(config)

    _current_settings = settings
    save_settings_to_file(settings)
    return config


@router.delete("/users/{user_id}")
async def delete_user_config(user_id: str):
    """Delete moderation config for a specific user."""
    global _current_settings
    settings = get_current_settings()
    settings.user_configs = [c for c in settings.user_configs if c.user_id != user_id]
    _current_settings = settings
    save_settings_to_file(settings)
    return {"deleted": True}
