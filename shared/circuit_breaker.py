"""
Circuit Breaker Pattern Implementation.

Prevents cascading failures by detecting failures and stopping requests
to failing services, allowing them to recover.

States:
- CLOSED: Normal operation, requests pass through
- OPEN: Service is failing, requests are blocked immediately
- HALF_OPEN: Testing if service has recovered
"""

import asyncio
import time
import logging
from typing import Optional, Callable, Any, TypeVar, Dict
from functools import wraps
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking requests
    HALF_OPEN = "half_open"  # Testing recovery


class CircuitBreakerOpen(Exception):
    """Raised when circuit breaker is open and blocking requests."""

    def __init__(self, service_name: str, time_until_retry: float):
        self.service_name = service_name
        self.time_until_retry = time_until_retry
        super().__init__(
            f"Circuit breaker OPEN for '{service_name}'. "
            f"Retry in {time_until_retry:.1f} seconds."
        )


@dataclass
class CircuitBreakerStats:
    """Statistics for a circuit breaker."""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    last_failure_time: Optional[float] = None
    last_success_time: Optional[float] = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0


class CircuitBreaker:
    """
    Circuit Breaker implementation for fault tolerance.

    Usage:
        # Create a circuit breaker for a service
        cb = CircuitBreaker(
            name="mistral-api",
            failure_threshold=5,
            recovery_timeout=30.0,
            half_open_max_calls=3
        )

        # Use as decorator
        @cb
        async def call_mistral_api():
            async with httpx.AsyncClient() as client:
                return await client.post(...)

        # Or use directly
        try:
            result = await cb.call(some_async_function, arg1, arg2)
        except CircuitBreakerOpen as e:
            # Handle circuit open - return cached/fallback response
            logger.warning(f"Service unavailable: {e}")
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 3,
        success_threshold: int = 2,
        excluded_exceptions: Optional[tuple] = None,
    ):
        """
        Initialize a circuit breaker.

        Args:
            name: Identifier for this circuit breaker (e.g., service name)
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before trying again (half-open)
            half_open_max_calls: Max concurrent calls in half-open state
            success_threshold: Successes needed in half-open to close circuit
            excluded_exceptions: Exception types that don't count as failures
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.success_threshold = success_threshold
        self.excluded_exceptions = excluded_exceptions or ()

        self._state = CircuitState.CLOSED
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0
        self._lock = asyncio.Lock()
        self._stats = CircuitBreakerStats()

    @property
    def state(self) -> CircuitState:
        """Get current circuit state, automatically transitioning if needed."""
        if self._state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                logger.info(f"Circuit '{self.name}' transitioning to HALF_OPEN")
        return self._state

    @property
    def stats(self) -> CircuitBreakerStats:
        """Get circuit breaker statistics."""
        return self._stats

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt recovery."""
        if self._last_failure_time is None:
            return True
        return (time.time() - self._last_failure_time) >= self.recovery_timeout

    def _time_until_retry(self) -> float:
        """Get seconds until circuit will attempt reset."""
        if self._last_failure_time is None:
            return 0.0
        elapsed = time.time() - self._last_failure_time
        return max(0.0, self.recovery_timeout - elapsed)

    async def _handle_success(self) -> None:
        """Handle a successful call."""
        async with self._lock:
            self._stats.total_calls += 1
            self._stats.successful_calls += 1
            self._stats.last_success_time = time.time()
            self._stats.consecutive_failures = 0
            self._stats.consecutive_successes += 1

            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls -= 1
                if self._stats.consecutive_successes >= self.success_threshold:
                    self._state = CircuitState.CLOSED
                    logger.info(f"Circuit '{self.name}' CLOSED - service recovered")

    async def _handle_failure(self, exc: Exception) -> None:
        """Handle a failed call."""
        async with self._lock:
            self._stats.total_calls += 1
            self._stats.failed_calls += 1
            self._stats.last_failure_time = time.time()
            self._last_failure_time = time.time()
            self._stats.consecutive_failures += 1
            self._stats.consecutive_successes = 0

            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls -= 1
                self._state = CircuitState.OPEN
                logger.warning(
                    f"Circuit '{self.name}' OPEN - failed during recovery test: {exc}"
                )
            elif self._stats.consecutive_failures >= self.failure_threshold:
                self._state = CircuitState.OPEN
                logger.warning(
                    f"Circuit '{self.name}' OPEN - {self._stats.consecutive_failures} "
                    f"consecutive failures (threshold: {self.failure_threshold})"
                )

    async def _can_execute(self) -> bool:
        """Check if a call can be executed."""
        state = self.state  # This may transition OPEN -> HALF_OPEN

        if state == CircuitState.CLOSED:
            return True

        if state == CircuitState.OPEN:
            self._stats.rejected_calls += 1
            return False

        # HALF_OPEN state - allow limited calls
        async with self._lock:
            if self._half_open_calls < self.half_open_max_calls:
                self._half_open_calls += 1
                return True
            self._stats.rejected_calls += 1
            return False

    async def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """
        Execute a function through the circuit breaker.

        Args:
            func: Async function to call
            *args: Positional arguments for func
            **kwargs: Keyword arguments for func

        Returns:
            Result of func

        Raises:
            CircuitBreakerOpen: If circuit is open
            Exception: Any exception from func (after recording failure)
        """
        if not await self._can_execute():
            raise CircuitBreakerOpen(self.name, self._time_until_retry())

        try:
            result = await func(*args, **kwargs)
            await self._handle_success()
            return result
        except self.excluded_exceptions:
            # Don't count these as failures
            await self._handle_success()
            raise
        except Exception as e:
            await self._handle_failure(e)
            raise

    def __call__(self, func: Callable) -> Callable:
        """
        Use circuit breaker as a decorator.

        Example:
            @circuit_breaker
            async def my_api_call():
                ...
        """
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await self.call(func, *args, **kwargs)
        return wrapper

    def reset(self) -> None:
        """Manually reset the circuit breaker to closed state."""
        self._state = CircuitState.CLOSED
        self._last_failure_time = None
        self._half_open_calls = 0
        self._stats.consecutive_failures = 0
        self._stats.consecutive_successes = 0
        logger.info(f"Circuit '{self.name}' manually reset to CLOSED")


# Global registry of circuit breakers
_circuit_breakers: Dict[str, CircuitBreaker] = {}
_cb_lock = asyncio.Lock()


async def get_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: float = 30.0,
    **kwargs
) -> CircuitBreaker:
    """
    Get or create a circuit breaker by name.

    Args:
        name: Unique identifier for the circuit breaker
        failure_threshold: Number of failures before opening
        recovery_timeout: Seconds before attempting recovery
        **kwargs: Additional CircuitBreaker parameters

    Returns:
        CircuitBreaker instance
    """
    global _circuit_breakers

    if name not in _circuit_breakers:
        async with _cb_lock:
            if name not in _circuit_breakers:
                _circuit_breakers[name] = CircuitBreaker(
                    name=name,
                    failure_threshold=failure_threshold,
                    recovery_timeout=recovery_timeout,
                    **kwargs
                )
                logger.debug(f"Created circuit breaker: {name}")

    return _circuit_breakers[name]


def get_all_circuit_breakers() -> Dict[str, CircuitBreaker]:
    """Get all registered circuit breakers."""
    return _circuit_breakers.copy()


def get_circuit_breaker_status() -> Dict[str, Dict[str, Any]]:
    """Get status of all circuit breakers for monitoring."""
    return {
        name: {
            "state": cb.state.value,
            "total_calls": cb.stats.total_calls,
            "successful_calls": cb.stats.successful_calls,
            "failed_calls": cb.stats.failed_calls,
            "rejected_calls": cb.stats.rejected_calls,
            "consecutive_failures": cb.stats.consecutive_failures,
        }
        for name, cb in _circuit_breakers.items()
    }
