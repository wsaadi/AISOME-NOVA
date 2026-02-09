"""
Agent Builder Configuration.
"""

import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    service_name: str = "agent-builder"
    service_version: str = "1.0.0"
    debug: bool = False

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8021

    # Storage
    agent_storage_dir: Optional[str] = None

    # CORS
    cors_origins: str = "*"

    class Config:
        env_prefix = "AGENT_BUILDER_"
        case_sensitive = False


settings = Settings()
