"""
Security Middleware for FastAPI/Starlette Services.

This module provides shared security components for all microservices:
- Security headers middleware (OWASP recommended headers)
- Rate limiting middleware (token bucket per IP)
- Safe error message sanitization
- CORS configuration helper

Usage:
    from shared.security_middleware import (
        SecurityHeadersMiddleware,
        RateLimitMiddleware,
        sanitize_error_message,
        configure_cors,
    )

    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
    configure_cors(app, allowed_origins="https://example.com", environment="production")
"""

import logging
import time
from typing import Dict, List, Optional, Tuple

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all HTTP responses.

    Applies OWASP-recommended security headers to protect against common
    web vulnerabilities including clickjacking, XSS, MIME-type sniffing,
    and information leakage.

    Headers added:
        - X-Content-Type-Options: Prevents MIME-type sniffing
        - X-Frame-Options: Prevents clickjacking via iframes
        - X-XSS-Protection: Enables browser XSS filtering
        - Strict-Transport-Security: Enforces HTTPS connections
        - Cache-Control: Prevents caching of sensitive responses
        - Referrer-Policy: Controls referrer information leakage
        - Permissions-Policy: Restricts browser feature access

    Usage:
        app = FastAPI()
        app.add_middleware(SecurityHeadersMiddleware)
    """

    SECURITY_HEADERS: Dict[str, str] = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    }

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Process the request and add security headers to the response.

        Args:
            request: The incoming HTTP request.
            call_next: The next middleware or route handler in the chain.

        Returns:
            The HTTP response with security headers applied.
        """
        response = await call_next(request)

        for header_name, header_value in self.SECURITY_HEADERS.items():
            response.headers[header_name] = header_value

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using an in-memory token bucket per client IP.

    Tracks request counts within a sliding time window for each unique
    client IP address. When the limit is exceeded, returns a 429 Too Many
    Requests response with a Retry-After header.

    Args:
        app: The ASGI application.
        max_requests: Maximum number of requests allowed per window. Defaults to 100.
        window_seconds: Time window duration in seconds. Defaults to 60.

    Usage:
        app = FastAPI()
        app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

    Note:
        This implementation uses in-memory storage and is suitable for
        single-instance deployments. For distributed setups, consider
        using Redis-backed rate limiting instead.
    """

    def __init__(
        self,
        app,
        max_requests: int = 100,
        window_seconds: int = 60,
    ) -> None:
        """
        Initialize the rate limiter.

        Args:
            app: The ASGI application instance.
            max_requests: Maximum requests allowed per IP within the window.
            window_seconds: Duration of the rate limit window in seconds.
        """
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Mapping of IP -> (token_count, last_refill_timestamp)
        self._buckets: Dict[str, Tuple[float, float]] = {}

    def _get_client_ip(self, request: Request) -> str:
        """
        Extract the client IP address from the request.

        Checks the X-Forwarded-For header first (for requests behind a
        reverse proxy), then falls back to the direct client host.

        Args:
            request: The incoming HTTP request.

        Returns:
            The client IP address as a string.
        """
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For can contain multiple IPs; the first is the client
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _consume_token(self, client_ip: str) -> Tuple[bool, float]:
        """
        Attempt to consume a token from the bucket for the given IP.

        Uses the token bucket algorithm: tokens are refilled at a constant
        rate up to the maximum. Each request consumes one token.

        Args:
            client_ip: The client's IP address.

        Returns:
            A tuple of (allowed, remaining_tokens). If allowed is False,
            the request should be rejected.
        """
        now = time.monotonic()

        if client_ip in self._buckets:
            tokens, last_refill = self._buckets[client_ip]

            # Calculate tokens to add based on elapsed time
            elapsed = now - last_refill
            refill_rate = self.max_requests / self.window_seconds
            tokens = min(self.max_requests, tokens + elapsed * refill_rate)

            if tokens < 1.0:
                # Not enough tokens; calculate wait time
                wait_time = (1.0 - tokens) / refill_rate
                self._buckets[client_ip] = (tokens, now)
                return False, wait_time

            # Consume one token
            tokens -= 1.0
            self._buckets[client_ip] = (tokens, now)
            return True, tokens
        else:
            # First request from this IP; initialize bucket (consume one token)
            self._buckets[client_ip] = (self.max_requests - 1.0, now)
            return True, self.max_requests - 1.0

    def _cleanup_stale_buckets(self) -> None:
        """
        Remove stale bucket entries to prevent unbounded memory growth.

        Entries that have been idle long enough to have fully refilled
        are removed, since they would behave identically to new entries.
        """
        now = time.monotonic()
        stale_threshold = self.window_seconds * 2
        stale_ips = [
            ip
            for ip, (_, last_refill) in self._buckets.items()
            if now - last_refill > stale_threshold
        ]
        for ip in stale_ips:
            del self._buckets[ip]

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """
        Process the request, enforcing rate limits.

        Args:
            request: The incoming HTTP request.
            call_next: The next middleware or route handler in the chain.

        Returns:
            The HTTP response, or a 429 response if rate limit is exceeded.
        """
        client_ip = self._get_client_ip(request)
        allowed, value = self._consume_token(client_ip)

        if not allowed:
            retry_after = int(value) + 1  # Round up to next whole second
            logger.warning(
                f"Rate limit exceeded for {client_ip}. "
                f"Retry after {retry_after}s."
            )

            # Periodically clean up stale entries
            if len(self._buckets) > 1000:
                self._cleanup_stale_buckets()

            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please try again later.",
                },
                headers={"Retry-After": str(retry_after)},
            )

        response = await call_next(request)

        # Add rate limit info headers for client awareness
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(int(value))

        return response


def sanitize_error_message(exc: Exception, debug: bool = False) -> str:
    """
    Sanitize an exception into a safe error message for API responses.

    In debug mode, returns the full exception message to aid development.
    In production mode, returns a generic message to prevent leaking
    internal implementation details, stack traces, or sensitive data.

    Args:
        exc: The exception to sanitize.
        debug: If True, include the actual error message. Defaults to False.

    Returns:
        A safe error message string suitable for API responses.

    Examples:
        >>> sanitize_error_message(ValueError("invalid column 'password_hash'"))
        'Internal server error'

        >>> sanitize_error_message(ValueError("bad input"), debug=True)
        "ValueError: bad input"
    """
    if debug:
        return f"{type(exc).__name__}: {exc}"

    return "Internal server error"


def configure_cors(
    app,
    allowed_origins: str,
    environment: str,
) -> None:
    """
    Configure CORS middleware on a FastAPI/Starlette application.

    Applies sensible CORS defaults based on the deployment environment.
    In development with wildcard origins, allows all origins without
    credentials for convenience. In production, only explicitly listed
    origins are permitted and credentials are enabled.

    Args:
        app: The FastAPI or Starlette application instance.
        allowed_origins: Comma-separated string of allowed origins,
            or "*" to allow all origins (development only).
        environment: The deployment environment name
            (e.g., "development", "staging", "production").

    Usage:
        app = FastAPI()
        configure_cors(
            app,
            allowed_origins=os.getenv("ALLOWED_ORIGINS", "https://app.example.com"),
            environment=os.getenv("ENVIRONMENT", "production"),
        )
    """
    allow_methods: List[str] = [
        "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH",
    ]
    allow_headers: List[str] = [
        "Content-Type", "Authorization", "X-API-Key", "X-Request-ID",
    ]

    if environment == "development" and allowed_origins.strip() == "*":
        # Development mode: allow all origins for local testing convenience
        logger.info("CORS configured for development: allowing all origins")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=allow_methods,
            allow_headers=allow_headers,
        )
    else:
        # Production / staging: restrict to explicit origins
        origins = [
            origin.strip()
            for origin in allowed_origins.split(",")
            if origin.strip()
        ]

        if not origins:
            logger.warning(
                "No valid CORS origins configured. "
                "Cross-origin requests will be rejected."
            )

        logger.info(f"CORS configured for {environment}: {origins}")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=allow_methods,
            allow_headers=allow_headers,
        )
