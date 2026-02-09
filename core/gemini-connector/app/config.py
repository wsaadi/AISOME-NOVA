"""
Configuration pour le connecteur Gemini
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # API Gemini
    gemini_api_key: Optional[str] = None

    # Configuration de l'API
    api_title: str = "Gemini Connector"
    api_version: str = "1.0.0"
    api_description: str = "Connecteur central pour Google Gemini"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # Gemini Configuration
    default_model: str = "gemini-2.0-flash-exp"
    default_max_tokens: int = 1024
    default_temperature: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
