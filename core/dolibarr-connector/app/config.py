"""
Configuration du connecteur Dolibarr
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Paramètres de configuration du connecteur Dolibarr"""

    # API Information
    api_title: str = "Connecteur Dolibarr"
    api_version: str = "1.0.0"

    # Dolibarr Configuration
    dolibarr_url: str = "http://localhost:8081"
    dolibarr_api_key: Optional[str] = None

    # Environment
    environment: str = "development"

    # CORS
    cors_origins: str = "*"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
