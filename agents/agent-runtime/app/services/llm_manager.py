"""
LLM Manager Service - Handles LLM calls and streaming.
"""

from typing import Any, AsyncGenerator, Dict, List, Optional
import httpx
from datetime import datetime
import json

from ..config import settings, LLM_ENDPOINTS
from ..models import LLMRequest, LLMResponse


# Default models per provider
DEFAULT_MODELS = {
    "mistral": "mistral-small-latest",
    "openai": "gpt-4",
    "anthropic": "claude-3-5-sonnet-20241022",
    "gemini": "gemini-pro",
    "perplexity": "sonar-pro",
    "nvidia-nim": "meta/llama-3.1-8b-instruct",
}


class LLMManager:
    """
    Manager for LLM interactions.

    Handles:
    - Multiple LLM providers
    - Streaming and non-streaming responses
    - Fallback between providers
    - Token counting and usage tracking
    """

    def __init__(self):
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=settings.llm_timeout_seconds)
        return self._http_client

    async def close(self):
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider: str = "mistral",
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = False,
    ) -> LLMResponse:
        """
        Send a chat request to an LLM.

        Args:
            messages: List of messages [{"role": "user/assistant", "content": "..."}]
            provider: LLM provider name
            model: Specific model (uses default if not provided)
            system_prompt: System prompt to prepend
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            stream: Enable streaming (not implemented yet)

        Returns:
            LLMResponse with the result
        """
        start_time = datetime.utcnow()

        # Get endpoint
        base_url = LLM_ENDPOINTS.get(provider)
        if not base_url:
            return LLMResponse(
                success=False,
                content="",
                model=model or "unknown",
                provider=provider,
                error=f"Unknown LLM provider: {provider}",
            )

        # Prepare messages with system prompt
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        # Prepare request
        request_data = {
            "messages": full_messages,
            "model": model or DEFAULT_MODELS.get(provider, ""),
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,  # Streaming handled separately
        }

        try:
            client = await self._get_client()

            # Call the appropriate endpoint
            url = f"{base_url}/api/v1/chat"
            response = await client.post(url, json=request_data)

            if response.status_code >= 400:
                return LLMResponse(
                    success=False,
                    content="",
                    model=model or DEFAULT_MODELS.get(provider, ""),
                    provider=provider,
                    error=f"LLM returned error {response.status_code}: {response.text}",
                )

            # Parse response
            result = response.json()

            # Extract content based on provider response format
            content = self._extract_content(result, provider)
            usage = result.get("usage", {})

            return LLMResponse(
                success=True,
                content=content,
                model=result.get("model", model or DEFAULT_MODELS.get(provider, "")),
                provider=provider,
                usage=usage,
            )

        except httpx.TimeoutException:
            return LLMResponse(
                success=False,
                content="",
                model=model or DEFAULT_MODELS.get(provider, ""),
                provider=provider,
                error=f"LLM request timed out after {settings.llm_timeout_seconds}s",
            )
        except Exception as e:
            return LLMResponse(
                success=False,
                content="",
                model=model or DEFAULT_MODELS.get(provider, ""),
                provider=provider,
                error=f"LLM request failed: {str(e)}",
            )

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        provider: str = "mistral",
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat response from an LLM.

        Yields tokens as they are generated.
        """
        # Get endpoint
        base_url = LLM_ENDPOINTS.get(provider)
        if not base_url:
            yield f"[Error: Unknown LLM provider: {provider}]"
            return

        # Prepare messages
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        # Prepare request
        request_data = {
            "messages": full_messages,
            "model": model or DEFAULT_MODELS.get(provider, ""),
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        try:
            async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
                url = f"{base_url}/api/v1/chat/stream"

                async with client.stream("POST", url, json=request_data) as response:
                    if response.status_code >= 400:
                        yield f"[Error: LLM returned {response.status_code}]"
                        return

                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                token = self._extract_stream_token(chunk, provider)
                                if token:
                                    yield token
                            except json.JSONDecodeError:
                                continue

        except Exception as e:
            yield f"[Error: {str(e)}]"

    def _extract_content(self, result: Dict[str, Any], provider: str) -> str:
        """Extract content from provider response."""
        # Handle different response formats
        if "message" in result and isinstance(result["message"], dict):
            return result["message"].get("content", "")
        elif "content" in result:
            return result["content"]
        elif "choices" in result and result["choices"]:
            choice = result["choices"][0]
            if "message" in choice:
                return choice["message"].get("content", "")
            elif "text" in choice:
                return choice["text"]
        elif "response" in result:
            return result["response"]

        return str(result)

    def _extract_stream_token(self, chunk: Dict[str, Any], provider: str) -> Optional[str]:
        """Extract token from streaming chunk."""
        if "choices" in chunk and chunk["choices"]:
            choice = chunk["choices"][0]
            delta = choice.get("delta", {})
            return delta.get("content")
        elif "token" in chunk:
            return chunk["token"]
        elif "content" in chunk:
            return chunk["content"]
        return None

    def format_messages_for_context(
        self,
        history: List[Dict[str, Any]],
        limit: int = 10,
    ) -> List[Dict[str, str]]:
        """
        Format conversation history for LLM context.

        Args:
            history: List of message objects
            limit: Maximum messages to include

        Returns:
            Formatted messages list
        """
        messages = []

        for msg in history[-limit:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")

            if role in ["user", "assistant", "system"]:
                messages.append({"role": role, "content": content})

        return messages

    async def check_health(self, provider: str) -> tuple[bool, str]:
        """Check if an LLM provider is healthy."""
        base_url = LLM_ENDPOINTS.get(provider)
        if not base_url:
            return False, "No endpoint configured"

        try:
            client = await self._get_client()
            response = await client.get(f"{base_url}/health", timeout=5.0)
            if response.status_code == 200:
                return True, "healthy"
            return False, f"status {response.status_code}"
        except Exception as e:
            return False, str(e)

    async def check_all_health(self) -> Dict[str, str]:
        """Check health of all LLM providers."""
        results = {}
        for provider in LLM_ENDPOINTS:
            healthy, status = await self.check_health(provider)
            results[provider] = "healthy" if healthy else f"unhealthy: {status}"
        return results


# Singleton instance
_manager: Optional[LLMManager] = None


def get_llm_manager() -> LLMManager:
    """Get the LLM manager singleton."""
    global _manager
    if _manager is None:
        _manager = LLMManager()
    return _manager
