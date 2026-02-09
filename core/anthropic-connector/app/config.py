"""
Configuration pour le connecteur Anthropic
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # API Anthropic
    anthropic_api_key: Optional[str] = None

    # Configuration de l'API
    api_title: str = "Anthropic Connector"
    api_version: str = "1.0.0"
    api_description: str = "Connecteur central pour Anthropic Claude"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # Anthropic Configuration
    default_model: str = "claude-3-5-sonnet-20241022"
    default_max_tokens: int = 1024
    default_temperature: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
