"""
Configuration pour le connecteur Mistral AI
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # API Mistral
    mistral_api_key: Optional[str] = None

    # Configuration de l'API
    api_title: str = "Mistral AI Connector"
    api_version: str = "1.0.0"
    api_description: str = "Connecteur central pour Mistral AI"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # Mistral Configuration
    default_model: str = "mistral-small-latest"
    default_max_tokens: int = 1024
    default_temperature: float = 0.7
    request_timeout: int = 600

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
