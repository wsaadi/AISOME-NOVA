"""
Configuration pour le connecteur OpenAI
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # API OpenAI
    openai_api_key: Optional[str] = None

    # Configuration de l'API
    api_title: str = "OpenAI Connector"
    api_version: str = "1.0.0"
    api_description: str = "Connecteur central pour OpenAI"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # OpenAI Configuration
    default_model: str = "gpt-3.5-turbo"
    default_max_tokens: int = 1024
    default_temperature: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
