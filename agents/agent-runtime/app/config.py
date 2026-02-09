"""
Agent Runtime Engine Configuration
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Runtime Engine settings."""

    # Service info
    service_name: str = "Agent Runtime Engine"
    service_version: str = "1.0.0"

    # Server
    host: str = "0.0.0.0"
    port: int = 8022

    # Environment
    environment: str = "development"
    debug: bool = False

    # CORS
    cors_origins: str = "*"

    # Storage
    agents_storage_path: str = "/app/storage/agents"

    # Tool endpoints
    tool_word_crud: str = "http://word-crud:8001"
    tool_web_search: str = "http://web-search:8002"
    tool_pdf_crud: str = "http://pdf-crud:8003"
    tool_excel_crud: str = "http://excel-crud:8004"
    tool_file_upload: str = "http://file-upload:8007"
    tool_document_extractor: str = "http://document-extractor:8008"
    tool_pptx_crud: str = "http://pptx-crud:8011"
    tool_prompt_moderation: str = "http://prompt-moderation:8013"
    tool_content_classification: str = "http://content-classification:8014"
    tool_dolibarr_connector: str = "http://dolibarr-connector:8015"
    tool_eml_parser: str = "http://eml-parser:8020"
    tool_image_analysis: str = "http://image-analysis:8021"
    tool_data_export: str = "http://data-export-tool:8000"
    tool_nemo_guardrails: str = "http://nemo-guardrails-tool:8000"
    tool_nvidia_multimodal: str = "http://nvidia-multimodal-tool:8000"
    tool_multi_llm_search: str = "http://multi-llm-search-tool:8000"

    # LLM Connectors
    llm_mistral_url: str = "http://mistral-connector:8005"
    llm_openai_url: str = "http://openai-connector:8006"
    llm_anthropic_url: str = "http://anthropic-connector:8023"
    llm_gemini_url: str = "http://gemini-connector:8024"
    llm_perplexity_url: str = "http://perplexity-connector:8025"
    llm_nvidia_nim_url: str = "http://nvidia-nim-connector:8028"

    # API Keys (from environment)
    mistral_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    # Timeouts
    tool_timeout_seconds: int = 60
    llm_timeout_seconds: int = 600

    class Config:
        env_prefix = "RUNTIME_"
        case_sensitive = False


settings = Settings()


# Tool registry mapping tool_id to URL
TOOL_ENDPOINTS = {
    "word-crud": settings.tool_word_crud,
    "web-search": settings.tool_web_search,
    "pdf-crud": settings.tool_pdf_crud,
    "excel-crud": settings.tool_excel_crud,
    "file-upload": settings.tool_file_upload,
    "document-extractor": settings.tool_document_extractor,
    "pptx-crud": settings.tool_pptx_crud,
    "prompt-moderation": settings.tool_prompt_moderation,
    "content-classification": settings.tool_content_classification,
    "dolibarr-connector": settings.tool_dolibarr_connector,
    "eml-parser": settings.tool_eml_parser,
    "image-analysis": settings.tool_image_analysis,
    "data-export": settings.tool_data_export,
    "nemo-guardrails": settings.tool_nemo_guardrails,
    "nvidia-multimodal": settings.tool_nvidia_multimodal,
    "multi-llm-search": settings.tool_multi_llm_search,
}

# LLM Connector mapping
LLM_ENDPOINTS = {
    "mistral": settings.llm_mistral_url,
    "openai": settings.llm_openai_url,
    "anthropic": settings.llm_anthropic_url,
    "gemini": settings.llm_gemini_url,
    "perplexity": settings.llm_perplexity_url,
    "nvidia-nim": settings.llm_nvidia_nim_url,
}
