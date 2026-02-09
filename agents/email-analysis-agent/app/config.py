"""
Email Analysis Agent Configuration.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # Service info
    service_name: str = "email-analysis-agent"
    service_version: str = "1.0.0"
    debug: bool = False

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000

    # Services URLs
    ollama_url: str = "http://ollama-connector:8000"
    wekan_url: str = "http://wekan-tool:8000"
    imap_url: str = "http://imap-tool:8000"

    # WeKan Configuration
    wekan_board_id: Optional[str] = None
    wekan_todo_list_id: Optional[str] = None  # Colonne "A faire"

    # Polling Configuration
    polling_interval_seconds: int = 30
    polling_enabled: bool = True

    # LLM Configuration
    llm_model: str = "gemma3:4b"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 2048

    # CORS
    cors_origins: str = "*"

    # Environment
    environment: str = "production"

    # Storage for processed emails
    processed_emails_file: str = "/app/data/processed_emails.json"

    class Config:
        env_prefix = "EMAIL_AGENT_"
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
