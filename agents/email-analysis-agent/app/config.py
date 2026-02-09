"""
Configuration pour l'agent d'analyse d'emails
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Configuration de l'application"""

    # Services URLs
    ollama_url: str = "http://ollama-connector:8000"
    wekan_url: str = "http://wekan-tool:8000"
    imap_url: str = "http://imap-tool:8000"

    # WeKan Configuration
    wekan_board_id: Optional[str] = None
    wekan_todo_list_id: Optional[str] = None  # Colonne "À faire"

    # Polling Configuration
    polling_interval_seconds: int = 30
    polling_enabled: bool = True

    # LLM Configuration
    llm_model: str = "gemma3:4b"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 2048

    # Configuration de l'API
    api_title: str = "Email Analysis Agent"
    api_version: str = "1.0.0"
    api_description: str = "Agent d'analyse d'emails avec création de tâches WeKan"

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # Storage for processed emails
    processed_emails_file: str = "/app/data/processed_emails.json"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des settings
settings = Settings()
