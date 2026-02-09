"""
HTTP Client Manager with Connection Pooling.

This module provides a centralized HTTP client with:
- Connection pooling to prevent resource exhaustion
- Configurable limits for max connections
- Automatic cleanup on application shutdown
- Thread-safe singleton pattern
"""

import asyncio
import httpx
import logging
from typing import Optional, Dict
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class HTTPClientManager:
    """
    Manages a shared HTTP client with connection pooling.

    This prevents the issue of creating new connections for each request,
    which can exhaust system resources under high load.

    Usage:
        # Initialize once at startup
        manager = HTTPClientManager()
        await manager.start()

        # Get client for requests
        client = manager.get_client()
        response = await client.get("https://api.example.com/data")

        # Cleanup on shutdown
        await manager.stop()
    """

    _instance: Optional['HTTPClientManager'] = None
    _lock: asyncio.Lock = asyncio.Lock()

    def __init__(
        self,
        max_connections: int = 100,
        max_keepalive_connections: int = 20,
        keepalive_expiry: float = 30.0,
        default_timeout: float = 30.0,
        connect_timeout: float = 10.0,
    ):
        """
        Initialize the HTTP Client Manager.

        Args:
            max_connections: Maximum number of concurrent connections
            max_keepalive_connections: Maximum connections to keep alive
            keepalive_expiry: Time in seconds before closing idle connections
            default_timeout: Default request timeout in seconds
            connect_timeout: Connection establishment timeout
        """
        self._max_connections = max_connections
        self._max_keepalive_connections = max_keepalive_connections
        self._keepalive_expiry = keepalive_expiry
        self._default_timeout = default_timeout
        self._connect_timeout = connect_timeout

        self._client: Optional[httpx.AsyncClient] = None
        self._started = False
        self._request_count = 0
        self._clients_by_timeout: Dict[float, httpx.AsyncClient] = {}

    @classmethod
    async def get_instance(cls) -> 'HTTPClientManager':
        """
        Get or create the singleton instance.

        This method is thread-safe and ensures only one instance exists.
        """
        if cls._instance is None:
            async with cls._lock:
                # Double-check locking pattern
                if cls._instance is None:
                    cls._instance = cls()
                    await cls._instance.start()
        return cls._instance

    async def start(self) -> None:
        """Initialize the HTTP client with connection pooling."""
        if self._started:
            return

        limits = httpx.Limits(
            max_connections=self._max_connections,
            max_keepalive_connections=self._max_keepalive_connections,
            keepalive_expiry=self._keepalive_expiry
        )

        # Configure explicit timeouts for better control over long-running requests
        timeout = httpx.Timeout(
            timeout=self._default_timeout,  # Total request timeout
            connect=self._connect_timeout,   # Connection establishment timeout
            read=self._default_timeout,      # Read timeout for receiving responses
            write=self._default_timeout,     # Write timeout for sending data
            pool=5.0                         # Pool acquisition timeout
        )

        self._client = httpx.AsyncClient(
            limits=limits,
            timeout=timeout,
            http2=True,  # Enable HTTP/2 for better performance
        )

        self._started = True
        logger.info(
            f"HTTP Client Manager started with limits: "
            f"max_connections={self._max_connections}, "
            f"max_keepalive={self._max_keepalive_connections}"
        )

    async def stop(self) -> None:
        """Close the HTTP client and release resources."""
        if self._client:
            await self._client.aclose()
            self._client = None

        # Close any timeout-specific clients
        for client in self._clients_by_timeout.values():
            await client.aclose()
        self._clients_by_timeout.clear()

        self._started = False
        logger.info(f"HTTP Client Manager stopped. Total requests served: {self._request_count}")

    def get_client(self, timeout: Optional[float] = None) -> httpx.AsyncClient:
        """
        Get the shared HTTP client.

        Args:
            timeout: Optional custom timeout. If provided, returns a client
                     configured with this timeout.

        Returns:
            The shared httpx.AsyncClient instance

        Raises:
            RuntimeError: If the manager hasn't been started
        """
        if not self._started or not self._client:
            raise RuntimeError(
                "HTTPClientManager not started. Call 'await manager.start()' first."
            )

        self._request_count += 1

        # Return default client if no custom timeout
        if timeout is None or timeout == self._default_timeout:
            return self._client

        # For custom timeouts, use or create a dedicated client
        # This is still better than creating a new client per request
        if timeout not in self._clients_by_timeout:
            limits = httpx.Limits(
                max_connections=self._max_connections // 2,
                max_keepalive_connections=self._max_keepalive_connections // 2,
            )
            # Use explicit timeout configuration for better control
            # read timeout is especially important for long-running AI requests
            timeout_config = httpx.Timeout(
                timeout=timeout,           # Total request timeout
                connect=self._connect_timeout,  # Connection establishment timeout
                read=timeout,              # Explicit read timeout for streaming responses
                write=timeout,             # Write timeout for large uploads
                pool=5.0                   # Pool acquisition timeout
            )
            self._clients_by_timeout[timeout] = httpx.AsyncClient(
                limits=limits,
                timeout=timeout_config,
                http2=True,
            )
            logger.debug(f"Created HTTP client with custom timeout: {timeout}s (read/write/total)")

        return self._clients_by_timeout[timeout]

    @property
    def is_started(self) -> bool:
        """Check if the manager is started."""
        return self._started

    @property
    def request_count(self) -> int:
        """Get total number of requests served."""
        return self._request_count


# Global instance for easy access
_http_manager: Optional[HTTPClientManager] = None
_http_lock = asyncio.Lock()


async def get_http_client(timeout: Optional[float] = None) -> httpx.AsyncClient:
    """
    Get the shared HTTP client.

    This is a convenience function that handles manager initialization.

    Args:
        timeout: Optional custom timeout in seconds

    Returns:
        Shared httpx.AsyncClient instance

    Example:
        client = await get_http_client()
        response = await client.get("https://api.example.com/data")

        # With custom timeout
        client = await get_http_client(timeout=120.0)
        response = await client.post("https://api.example.com/slow-endpoint")
    """
    global _http_manager

    if _http_manager is None:
        async with _http_lock:
            if _http_manager is None:
                _http_manager = HTTPClientManager()
                await _http_manager.start()

    return _http_manager.get_client(timeout)


async def close_http_client() -> None:
    """Close the global HTTP client. Call this on application shutdown."""
    global _http_manager

    if _http_manager:
        await _http_manager.stop()
        _http_manager = None


@asynccontextmanager
async def http_client_lifespan():
    """
    Context manager for HTTP client lifecycle.

    Use this in FastAPI lifespan events:

        from contextlib import asynccontextmanager
        from shared.http_client import http_client_lifespan

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            async with http_client_lifespan():
                yield

        app = FastAPI(lifespan=lifespan)
    """
    manager = await HTTPClientManager.get_instance()
    try:
        yield manager
    finally:
        await manager.stop()
