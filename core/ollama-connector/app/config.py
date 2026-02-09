"""
Configuration pour le connecteur Ollama (inférence locale)
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # URL Ollama (local par défaut, ou via Docker network)
    ollama_base_url: str = "http://ollama:11434"

    # Configuration de l'API
    api_title: str = "Ollama Connector"
    api_version: str = "1.0.0"
    api_description: str = "Connecteur pour inférence locale avec Ollama"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # Ollama Configuration
    default_model: str = "gemma3:4b"
    default_max_tokens: int = 2048
    default_temperature: float = 0.7
    request_timeout: int = 300

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
