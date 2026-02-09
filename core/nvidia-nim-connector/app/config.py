"""
Configuration pour le connecteur NVIDIA NIM
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # API NVIDIA NIM
    nvidia_nim_api_key: Optional[str] = None

    # Base URL for NVIDIA NIM API
    nvidia_nim_base_url: str = "https://integrate.api.nvidia.com/v1"

    # Configuration de l'API
    api_title: str = "NVIDIA NIM Connector"
    api_version: str = "1.0.0"
    api_description: str = "Connecteur central pour NVIDIA NIM"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # NVIDIA NIM Configuration
    default_model: str = "meta/llama-3.1-8b-instruct"
    default_max_tokens: int = 1024
    default_temperature: float = 0.7

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
