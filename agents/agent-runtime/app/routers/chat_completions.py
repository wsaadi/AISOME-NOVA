"""
Chat Completions Router - API endpoint for AI chat with token usage tracking.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form
from pydantic import BaseModel, Field
import httpx
import json
import base64

from fastapi.responses import Response

from ..config import settings, LLM_ENDPOINTS, TOOL_ENDPOINTS
from ..services.document_extractor import DocumentExtractor


router = APIRouter(prefix="/api/v1/chat", tags=["Chat Completions"])


# ============== MODELS ==============

class ChatMessage(BaseModel):
    """Chat message."""
    role: str
    content: str
    images: Optional[List[str]] = None


class ChatCompletionRequest(BaseModel):
    """Request for chat completion."""
    messages: List[ChatMessage]
    provider: str = "mistral"
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 4096
    top_p: Optional[float] = None

    # Moderation context
    agent_id: Optional[str] = None
    user_id: Optional[str] = None

    # API keys (passed from frontend)
    mistral_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    nvidia_nim_api_key: Optional[str] = None


class ChatCompletionResponse(BaseModel):
    """Response from chat completion."""
    success: bool
    message: Optional[Dict[str, str]] = None
    model: Optional[str] = None
    error: Optional[str] = None
    blocked_reason: Optional[str] = None

    # Token usage - CRITICAL for consumption tracking
    usage: Optional[Dict[str, int]] = None

    # Moderation/classification info
    moderation: Optional[Dict[str, Any]] = None
    classification: Optional[Dict[str, Any]] = None
    guardrails: Optional[Dict[str, Any]] = None

    # Finish reason
    finish_reason: Optional[str] = None


# ============== HELPER FUNCTIONS ==============

def get_api_key(request: ChatCompletionRequest) -> Optional[str]:
    """Get the appropriate API key based on provider."""
    key_map = {
        "mistral": request.mistral_api_key,
        "openai": request.openai_api_key,
        "anthropic": request.anthropic_api_key,
        "gemini": request.gemini_api_key,
        "perplexity": request.perplexity_api_key,
        "nvidia-nim": request.nvidia_nim_api_key,
    }
    return key_map.get(request.provider)


def get_default_model(provider: str) -> str:
    """Get default model for a provider."""
    defaults = {
        "mistral": "mistral-small-latest",
        "openai": "gpt-4",
        "anthropic": "claude-3-5-sonnet-20241022",
        "gemini": "gemini-pro",
        "perplexity": "sonar-pro",
        "nvidia-nim": "meta/llama-3.1-8b-instruct",
    }
    return defaults.get(provider, "")


def get_connector_endpoint(provider: str) -> str:
    """Get the connector endpoint for a provider."""
    endpoints = {
        "mistral": f"{LLM_ENDPOINTS.get('mistral', 'http://localhost:8005')}/api/v1/mistral/chat",
        "openai": f"{LLM_ENDPOINTS.get('openai', 'http://localhost:8006')}/api/v1/openai/chat",
        "anthropic": f"{LLM_ENDPOINTS.get('anthropic', 'http://localhost:8023')}/api/v1/anthropic/chat",
        "gemini": f"{LLM_ENDPOINTS.get('gemini', 'http://localhost:8024')}/api/v1/gemini/chat",
        "perplexity": f"{LLM_ENDPOINTS.get('perplexity', 'http://localhost:8025')}/api/v1/perplexity/chat",
        "nvidia-nim": f"{LLM_ENDPOINTS.get('nvidia-nim', 'http://localhost:8028')}/api/v1/nvidia-nim/chat",
    }
    return endpoints.get(provider, "")


# ============== MODERATION ==============

async def check_moderation(content: str, agent_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Check content against AI-powered moderation rules.

    1. Fetch applicable rules from the moderation settings (global + agent + user)
    2. Send content + rules to the prompt-moderation tool for AI evaluation
    """
    try:
        # Step 1: Get applicable rules from the runtime moderation settings
        from .moderation_settings import get_rules_for_context
        rules = get_rules_for_context(agent_id=agent_id, user_id=user_id)

        if not rules:
            return {"approved": True, "reason": "Aucune règle de modération configurée.", "matched_rules": []}

        # Step 2: Send to prompt-moderation tool for AI evaluation
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{TOOL_ENDPOINTS.get('prompt-moderation', 'http://localhost:8013')}/api/v1/moderate/check"
            response = await client.post(url, json={
                "content": content,
                "rules": rules,
                "agent_id": agent_id,
                "user_id": user_id
            })

            if response.status_code == 200:
                result = response.json()
                return {
                    "approved": result.get("approved", True),
                    "reason": result.get("reason", ""),
                    "matched_rules": result.get("matched_rules", [])
                }
    except Exception as e:
        print(f"Moderation check failed: {e}")

    # Default: allow if moderation service unavailable
    return {"approved": True, "reason": "Service de modération indisponible", "matched_rules": []}


# ============== NEMO GUARDRAILS ==============

async def check_nemo_guardrails(content: str, agent_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Check content against NeMo Guardrails (NVIDIA safety models).

    Calls the nemo-guardrails-tool for topic, content, and jailbreak checks.
    Returns a guardrails result dict. Fail-open if the service is unavailable.
    """
    try:
        # Load guardrails config from settings file
        guardrails_config = _load_guardrails_config(agent_id)

        if not guardrails_config.get("enabled", False):
            return {"approved": True, "reason": "NeMo Guardrails désactivé", "checks": [], "risk_score": 0.0}

        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{TOOL_ENDPOINTS.get('nemo-guardrails', 'http://localhost:8029')}/api/v1/guardrails/check"
            # Force enabled=true in config sent to tool (top-level enabled already gates this call)
            tool_config = guardrails_config.get("config") or {}
            tool_config["enabled"] = True
            response = await client.post(url, json={
                "content": content,
                "guardrail_type": "all",
                "config": tool_config,
                "context": {"agent_id": agent_id, "user_id": user_id}
            })

            if response.status_code == 200:
                result = response.json()
                return {
                    "approved": result.get("approved", True),
                    "reason": result.get("blocked_reason", ""),
                    "checks": result.get("checks", []),
                    "risk_score": result.get("risk_score", 0.0),
                    "processing_time_ms": result.get("processing_time_ms")
                }
    except Exception as e:
        print(f"NeMo Guardrails check failed: {e}")

    # Default: allow if guardrails service unavailable
    return {"approved": True, "reason": "Service NeMo Guardrails indisponible", "checks": [], "risk_score": 0.0}


def _load_guardrails_config(agent_id: Optional[str] = None) -> Dict[str, Any]:
    """Load NeMo Guardrails configuration from file."""
    import os
    config_path = os.getenv("NEMO_GUARDRAILS_CONFIG_PATH", "/app/config/nemo_guardrails_config.json")
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)

                # Check for agent-specific config
                if agent_id and "agent_configs" in config:
                    agent_cfg = next(
                        (c for c in config["agent_configs"] if c.get("agent_id") == agent_id),
                        None
                    )
                    if agent_cfg:
                        return {
                            "enabled": agent_cfg.get("enabled", config.get("enabled", False)),
                            "config": {**config.get("config", {}), **agent_cfg.get("config", {})}
                        }

                return config
    except Exception as e:
        print(f"Error loading NeMo Guardrails config: {e}")

    return {"enabled": False}


# ============== ENDPOINTS ==============

@router.post("/completions", response_model=ChatCompletionResponse)
async def chat_completions(request: ChatCompletionRequest):
    """
    Chat completion endpoint with moderation and token usage tracking.

    Returns token usage in the response for consumption tracking.
    """
    # Get the last user message for moderation
    user_messages = [m for m in request.messages if m.role == "user"]
    last_user_content = user_messages[-1].content if user_messages else ""

    # AI-powered moderation check
    moderation = await check_moderation(
        last_user_content,
        agent_id=request.agent_id,
        user_id=request.user_id
    )
    if not moderation.get("approved", True):
        return ChatCompletionResponse(
            success=False,
            blocked_reason=moderation.get("reason", "Contenu bloqué par la modération"),
            moderation=moderation
        )

    # NeMo Guardrails check (NVIDIA safety models)
    guardrails = await check_nemo_guardrails(
        last_user_content,
        agent_id=request.agent_id,
        user_id=request.user_id
    )
    if not guardrails.get("approved", True):
        return ChatCompletionResponse(
            success=False,
            blocked_reason=guardrails.get("reason", "Contenu bloqué par NeMo Guardrails"),
            guardrails=guardrails,
            moderation=moderation
        )

    classification = None

    # Get connector endpoint and API key
    endpoint = get_connector_endpoint(request.provider)
    if not endpoint:
        return ChatCompletionResponse(
            success=False,
            error=f"Provider inconnu: {request.provider}"
        )

    api_key = get_api_key(request)

    # Prepare messages for connector
    connector_messages = []
    for msg in request.messages:
        message_data = {
            "role": msg.role,
            "content": msg.content
        }
        if msg.images:
            message_data["images"] = msg.images
        connector_messages.append(message_data)

    # Build request for connector
    connector_request = {
        "messages": connector_messages,
        "model": request.model or get_default_model(request.provider),
        "temperature": request.temperature,
        "max_tokens": request.max_tokens,
    }

    if request.top_p is not None:
        connector_request["top_p"] = request.top_p

    # Call the LLM connector
    try:
        headers = {}
        if api_key:
            headers["X-API-Key"] = api_key

        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(
                endpoint,
                json=connector_request,
                headers=headers
            )

            if response.status_code >= 400:
                return ChatCompletionResponse(
                    success=False,
                    error=f"Erreur du connecteur LLM: {response.status_code} - {response.text}"
                )

            result = response.json()

            # Extract usage data - THIS IS THE KEY PART
            usage = result.get("usage")
            if usage:
                # Ensure we have all the fields
                usage = {
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0)
                }

            # Build response
            if result.get("success"):
                message = result.get("message", {})
                return ChatCompletionResponse(
                    success=True,
                    message={
                        "role": message.get("role", "assistant"),
                        "content": message.get("content", "")
                    },
                    model=result.get("model"),
                    usage=usage,
                    finish_reason=result.get("finish_reason"),
                    moderation=moderation,
                    classification=classification,
                    guardrails=guardrails
                )
            else:
                return ChatCompletionResponse(
                    success=False,
                    error=result.get("error", "Erreur inconnue"),
                    moderation=moderation,
                    classification=classification
                )

    except httpx.TimeoutException:
        return ChatCompletionResponse(
            success=False,
            error=f"Timeout après {settings.llm_timeout_seconds}s"
        )
    except Exception as e:
        return ChatCompletionResponse(
            success=False,
            error=f"Erreur lors de l'appel LLM: {str(e)}"
        )


@router.post("/completions/multipart", response_model=ChatCompletionResponse)
async def chat_completions_multipart(
    provider: str = Form("mistral"),
    model: Optional[str] = Form(None),
    temperature: float = Form(0.7),
    max_tokens: int = Form(4096),
    agent_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    # API keys for all providers
    mistral_api_key: Optional[str] = Form(None),
    openai_api_key: Optional[str] = Form(None),
    anthropic_api_key: Optional[str] = Form(None),
    gemini_api_key: Optional[str] = Form(None),
    perplexity_api_key: Optional[str] = Form(None),
    nvidia_nim_api_key: Optional[str] = Form(None),
    message: str = Form(...),
    conversation_history: Optional[str] = Form(None),
    # Accept 'files' field name (what frontend sends)
    files: List[UploadFile] = File(default=[]),
):
    """
    Chat completion with file uploads (multipart/form-data).
    Accepts files and automatically categorizes them as images or documents.
    """
    # Parse conversation history
    messages = []
    if conversation_history:
        try:
            history = json.loads(conversation_history)
            for h in history:
                messages.append(ChatMessage(
                    role=h.get("role", "user"),
                    content=h.get("content", ""),
                    images=h.get("images")
                ))
        except:
            pass

    # Check if OCR model is being used - documents should be sent as base64 directly
    is_ocr_model = model and "ocr" in model.lower()

    # Separate files into images and documents based on content type
    image_data = []
    doc_content = ""

    for file in files:
        content = await file.read()
        content_type = file.content_type or ""
        filename = file.filename or "document"

        if content_type.startswith("image/"):
            # Process as image - convert to base64
            b64 = base64.b64encode(content).decode("utf-8")
            image_data.append(f"data:{content_type};base64,{b64}")
        elif is_ocr_model:
            # For OCR models, send documents as base64 data URIs
            # so the Mistral OCR API can process them natively
            b64 = base64.b64encode(content).decode("utf-8")
            mime = content_type or "application/pdf"
            image_data.append(f"data:{mime};base64,{b64}")
        else:
            # Process as document - use DocumentExtractor for proper extraction
            if DocumentExtractor.is_supported(filename):
                result = DocumentExtractor.extract(content, filename, content_type)
                if result.success and result.text:
                    doc_content += f"\n\n--- Document: {filename} ({result.document_type}) ---\n{result.text}"
                else:
                    # Extraction failed, log the error
                    error_msg = result.error or "Extraction failed"
                    doc_content += f"\n\n--- Document: {filename} (erreur d'extraction: {error_msg}) ---"
            else:
                # Try basic UTF-8 decode for unsupported file types
                try:
                    text = content.decode("utf-8")
                    doc_content += f"\n\n--- Document: {filename} ---\n{text}"
                except:
                    # Binary file that we can't process
                    doc_content += f"\n\n--- Document: {filename} (fichier binaire non supporté) ---"

    # Build final message
    final_content = message
    if doc_content:
        final_content += f"\n\nContenu des documents:{doc_content}"

    messages.append(ChatMessage(
        role="user",
        content=final_content,
        images=image_data if image_data else None
    ))

    # Create request and call main endpoint
    request = ChatCompletionRequest(
        messages=messages,
        provider=provider,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        agent_id=agent_id,
        user_id=user_id,
        mistral_api_key=mistral_api_key,
        openai_api_key=openai_api_key,
        anthropic_api_key=anthropic_api_key,
        gemini_api_key=gemini_api_key,
        perplexity_api_key=perplexity_api_key,
        nvidia_nim_api_key=nvidia_nim_api_key,
    )

    return await chat_completions(request)


# ============== DOCUMENT EXPORT ==============

class ExportRequest(BaseModel):
    """Request to export content to a document."""
    content: str
    title: str = "Document"
    format: str = "word"  # word, pdf


class ProfessionalExportRequest(BaseModel):
    """Request to export content to a professional Word document."""
    content: str
    title: str = "Document"
    company_name: Optional[str] = None
    subtitle: Optional[str] = None
    author: Optional[str] = None
    include_cover_page: bool = True
    include_toc: bool = True
    include_header: bool = True
    include_footer: bool = True
    include_page_numbers: bool = True
    primary_color: str = "#1E40AF"
    footer_text: Optional[str] = None


@router.post("/export")
async def export_document(request: ExportRequest):
    """
    Export markdown content to a Word document via word-crud-tool.

    Args:
        request: Export request with content and title

    Returns:
        Document file as response
    """
    if request.format == "word":
        # Call word-crud-tool API
        word_crud_url = TOOL_ENDPOINTS.get("word-crud")
        if not word_crud_url:
            raise HTTPException(status_code=500, detail="Word CRUD tool not configured")

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{word_crud_url}/api/v1/word/from-markdown",
                    json={"content": request.content, "title": request.title}
                )

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Word generation failed: {response.text}"
                    )

                # Get filename from Content-Disposition header if present
                content_disposition = response.headers.get("content-disposition", "")
                filename = "document.docx"
                if "filename=" in content_disposition:
                    filename = content_disposition.split("filename=")[-1].strip()

                return Response(
                    content=response.content,
                    media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    headers={
                        "Content-Disposition": f'attachment; filename="{filename}"'
                    }
                )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Word generation timed out")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Failed to connect to word-crud-tool: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")


@router.post("/export/professional")
async def export_professional_document(request: ProfessionalExportRequest):
    """
    Export markdown content to a professional Word document with cover page,
    table of contents, headers, footers, and professional formatting.

    Args:
        request: Professional export request with all formatting options

    Returns:
        Document file as response
    """
    word_crud_url = TOOL_ENDPOINTS.get("word-crud")
    if not word_crud_url:
        raise HTTPException(status_code=500, detail="Word CRUD tool not configured")

    try:
        # Build the professional document request
        professional_request = {
            "content": request.content,
            "title": request.title,
            "company_name": request.company_name,
            "subtitle": request.subtitle,
            "author": request.author,
            "include_cover_page": request.include_cover_page,
            "include_toc": request.include_toc,
            "include_header": request.include_header,
            "include_footer": request.include_footer,
            "include_page_numbers": request.include_page_numbers,
            "primary_color": request.primary_color,
            "footer_text": request.footer_text or "Document confidentiel"
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{word_crud_url}/api/v1/word/professional",
                json=professional_request
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Professional document generation failed: {response.text}"
                )

            # Get filename from Content-Disposition header if present
            content_disposition = response.headers.get("content-disposition", "")
            filename = f"{request.title or 'document'}.docx"
            if "filename=" in content_disposition:
                filename = content_disposition.split("filename=")[-1].strip().strip('"')

            return Response(
                content=response.content,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Professional document generation timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to word-crud-tool: {str(e)}")
