"""
Global Settings Router - API endpoints for managing global LLM and moderation settings.

Provides endpoints for:
- Loading global settings (LLM + moderation)
- Saving global LLM settings
- Saving global moderation settings
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import json
import os
from pathlib import Path
from datetime import datetime


router = APIRouter(prefix="/api/v1/settings", tags=["Global Settings"])

# Settings file path
SETTINGS_DIR = Path(os.environ.get("SETTINGS_DIR", "/app/data"))
SETTINGS_FILE = SETTINGS_DIR / "global_settings.json"


# ============== MODELS ==============

class LLMDefaults(BaseModel):
    """LLM default parameters."""
    temperature: float = 0.7
    maxTokens: int = 4096
    topP: float = 1.0
    frequencyPenalty: float = 0.0
    presencePenalty: float = 0.0


class LLMLimits(BaseModel):
    """LLM limits for non-admin users."""
    maxTemperature: float = 2.0
    maxTokensLimit: int = 32000
    allowProviderChange: bool = True
    allowModelChange: bool = True


class LLMSettings(BaseModel):
    """Global LLM settings."""
    defaultProvider: str = "mistral"
    apiKeys: Dict[str, Optional[str]] = Field(default_factory=lambda: {
        "mistral": None,
        "openai": None,
        "anthropic": None,
        "gemini": None,
        "perplexity": None
    })
    defaultModels: Dict[str, str] = Field(default_factory=lambda: {
        "mistral": "mistral-small-latest",
        "openai": "gpt-4o-mini",
        "anthropic": "claude-3-5-sonnet-20241022",
        "gemini": "gemini-2.0-flash-exp",
        "perplexity": "sonar"
    })
    defaults: LLMDefaults = Field(default_factory=LLMDefaults)
    limits: LLMLimits = Field(default_factory=LLMLimits)


class ModerationSettings(BaseModel):
    """Global moderation settings (simplified)."""
    enabled: bool = True
    name: str = "Modération Globale"
    version: str = "1.0.0"


class GlobalSettings(BaseModel):
    """Complete global settings."""
    llm: LLMSettings = Field(default_factory=LLMSettings)
    moderation: ModerationSettings = Field(default_factory=ModerationSettings)
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updatedBy: str = "system"


# ============== HELPER FUNCTIONS ==============

def load_settings() -> GlobalSettings:
    """Load settings from file or return defaults."""
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return GlobalSettings(**data)
    except Exception:
        pass
    return GlobalSettings()


def save_settings(settings: GlobalSettings) -> None:
    """Save settings to file."""
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2, default=str)


# ============== ENDPOINTS ==============

@router.get("/global", response_model=GlobalSettings)
async def get_global_settings():
    """
    Get all global settings (LLM + moderation).

    Returns the combined settings for LLM configuration and moderation.
    """
    return load_settings()


@router.post("/global/llm")
async def save_llm_settings(llm_settings: LLMSettings):
    """
    Save global LLM settings.

    Updates the LLM portion of global settings.
    """
    settings = load_settings()
    settings.llm = llm_settings
    settings.updatedAt = datetime.utcnow().isoformat()
    save_settings(settings)
    return {"success": True, "message": "LLM settings saved"}


@router.post("/global/moderation")
async def save_moderation_settings(moderation_settings: ModerationSettings):
    """
    Save global moderation settings.

    Updates the moderation portion of global settings.
    """
    settings = load_settings()
    settings.moderation = moderation_settings
    settings.updatedAt = datetime.utcnow().isoformat()
    save_settings(settings)
    return {"success": True, "message": "Moderation settings saved"}
