"""
Thread-safe Service Registry.

Provides a centralized registry for managing service instances
with proper synchronization to prevent race conditions.
"""

import asyncio
import logging
from typing import Optional, Dict, TypeVar, Generic, Callable, Any
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class ServiceEntry:
    """Entry in the service registry."""
    service: Any
    created_at: datetime
    api_key: Optional[str] = None
    config_hash: Optional[str] = None


class ServiceRegistry(Generic[T]):
    """
    Thread-safe registry for managing service instances.

    This solves the race condition problem where multiple concurrent
    requests could create multiple service instances.

    Usage:
        # Define your service factory
        def create_mistral_service(api_key: str = None) -> MistralService:
            return MistralService(api_key=api_key)

        # Create registry
        registry = ServiceRegistry(factory=create_mistral_service)

        # Get service (thread-safe)
        service = await registry.get_service()

        # Get service with custom API key
        service = await registry.get_service(api_key="custom-key")
    """

    def __init__(
        self,
        factory: Callable[..., T],
        name: str = "service",
        cache_custom_keys: bool = False,
        max_cached_instances: int = 10,
    ):
        """
        Initialize the service registry.

        Args:
            factory: Callable that creates new service instances
            name: Name of the service (for logging)
            cache_custom_keys: Whether to cache instances with custom API keys
            max_cached_instances: Maximum number of cached instances
        """
        self._factory = factory
        self._name = name
        self._cache_custom_keys = cache_custom_keys
        self._max_cached_instances = max_cached_instances

        self._default_service: Optional[T] = None
        self._custom_services: Dict[str, ServiceEntry] = {}
        self._lock = asyncio.Lock()
        self._initialized = False

    async def get_service(
        self,
        api_key: Optional[str] = None,
        **kwargs
    ) -> T:
        """
        Get a service instance (thread-safe).

        Args:
            api_key: Optional API key for custom instance
            **kwargs: Additional arguments for service factory

        Returns:
            Service instance
        """
        # Custom API key - create or get cached instance
        if api_key:
            return await self._get_custom_service(api_key, **kwargs)

        # Default instance - use singleton pattern
        return await self._get_default_service(**kwargs)

    async def _get_default_service(self, **kwargs) -> T:
        """Get the default service instance (singleton)."""
        if self._default_service is not None:
            return self._default_service

        async with self._lock:
            # Double-check locking pattern
            if self._default_service is None:
                logger.info(f"Creating default {self._name} service instance")
                self._default_service = self._factory(**kwargs)
                self._initialized = True

            return self._default_service

    async def _get_custom_service(
        self,
        api_key: str,
        **kwargs
    ) -> T:
        """Get or create a service instance with custom API key."""
        # If not caching custom keys, always create new instance
        if not self._cache_custom_keys:
            logger.debug(f"Creating {self._name} service with custom API key")
            return self._factory(api_key=api_key, **kwargs)

        # Check cache
        if api_key in self._custom_services:
            return self._custom_services[api_key].service

        async with self._lock:
            # Double-check
            if api_key in self._custom_services:
                return self._custom_services[api_key].service

            # Clean up old entries if at capacity
            if len(self._custom_services) >= self._max_cached_instances:
                self._evict_oldest()

            # Create new instance
            logger.debug(f"Creating cached {self._name} service with custom API key")
            service = self._factory(api_key=api_key, **kwargs)
            self._custom_services[api_key] = ServiceEntry(
                service=service,
                created_at=datetime.now(),
                api_key=api_key[:8] + "..." if len(api_key) > 8 else api_key,
            )

            return service

    def _evict_oldest(self) -> None:
        """Remove the oldest cached service instance."""
        if not self._custom_services:
            return

        oldest_key = min(
            self._custom_services.keys(),
            key=lambda k: self._custom_services[k].created_at
        )
        del self._custom_services[oldest_key]
        logger.debug(f"Evicted oldest {self._name} service instance from cache")

    async def clear(self) -> None:
        """Clear all cached service instances."""
        async with self._lock:
            self._default_service = None
            self._custom_services.clear()
            self._initialized = False
            logger.info(f"Cleared {self._name} service registry")

    @property
    def is_initialized(self) -> bool:
        """Check if the default service has been initialized."""
        return self._initialized

    @property
    def cached_count(self) -> int:
        """Get number of cached custom service instances."""
        return len(self._custom_services)


# Global registries for common services
_registries: Dict[str, ServiceRegistry] = {}
_registry_lock = asyncio.Lock()


async def get_service(
    name: str,
    factory: Callable[..., T],
    api_key: Optional[str] = None,
    **kwargs
) -> T:
    """
    Get a service from the global registry.

    This is a convenience function for accessing services without
    managing registry instances manually.

    Args:
        name: Service name (e.g., "mistral", "openai")
        factory: Factory function to create service instances
        api_key: Optional API key for custom instance
        **kwargs: Additional arguments for service factory

    Returns:
        Service instance

    Example:
        from app.services.mistral_service import MistralService

        service = await get_service(
            name="mistral",
            factory=MistralService,
            api_key=request_api_key
        )
    """
    global _registries

    if name not in _registries:
        async with _registry_lock:
            if name not in _registries:
                _registries[name] = ServiceRegistry(
                    factory=factory,
                    name=name,
                    cache_custom_keys=True,
                )

    return await _registries[name].get_service(api_key=api_key, **kwargs)


def get_registry_stats() -> Dict[str, Dict[str, Any]]:
    """Get statistics for all service registries."""
    return {
        name: {
            "initialized": registry.is_initialized,
            "cached_instances": registry.cached_count,
        }
        for name, registry in _registries.items()
    }
