"""
Email Analysis Agent - Main FastAPI Application.

Autonomous agent that analyses incoming emails and creates WeKan tasks.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging
from typing import Optional

from .config import settings
from .routers import email_analysis_router
from .routers.email_analysis import (
    set_analyzer_service,
    get_analyzer_service,
    set_polling_state,
    get_polling_state,
)
from .services.email_analyzer import EmailAnalyzerService


# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Scheduler (module-level so the router /start endpoint can access it)
# ---------------------------------------------------------------------------

_scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> Optional[AsyncIOScheduler]:
    """Return the current scheduler instance."""
    return _scheduler


# ---------------------------------------------------------------------------
# Polling job
# ---------------------------------------------------------------------------


async def polling_job():
    """Job de polling execute periodiquement."""
    if not get_polling_state():
        return

    logger.info("Demarrage du job de polling...")

    try:
        analyzer = get_analyzer_service()
        if analyzer:
            results = await analyzer.process_emails()
            if results:
                logger.info(f"Traite {len(results)} emails")
    except Exception as e:
        logger.error(f"Erreur dans le job de polling: {e}")


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global _scheduler

    # --- Startup ---
    logger.info(f"Starting {settings.service_name} v{settings.service_version}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Polling interval: {settings.polling_interval_seconds}s")
    logger.info(f"Polling enabled: {settings.polling_enabled}")
    logger.info(f"LLM Model: {settings.llm_model}")

    # Initialise the analyzer service and share it with the router
    analyzer_service = EmailAnalyzerService()
    set_analyzer_service(analyzer_service)

    # Configure the scheduler
    _scheduler = AsyncIOScheduler()

    if settings.polling_enabled:
        _scheduler.add_job(
            polling_job,
            IntervalTrigger(seconds=settings.polling_interval_seconds),
            id="email_polling",
            name="Email Polling Job",
            replace_existing=True,
        )
        _scheduler.start()
        set_polling_state(True)
        logger.info(f"Polling demarre (intervalle: {settings.polling_interval_seconds}s)")
    else:
        logger.info("Polling desactive par configuration")

    yield

    # --- Shutdown ---
    set_polling_state(False)

    if _scheduler:
        _scheduler.shutdown()

    set_analyzer_service(None)
    logger.info(f"Shutting down {settings.service_name}")


# ---------------------------------------------------------------------------
# Security headers middleware (same pattern as connectors)
# ---------------------------------------------------------------------------


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add OWASP-recommended security headers to every response."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------


app = FastAPI(
    title="Email Analysis Agent",
    description="""
    ## Email Analysis Agent

    Autonomous agent that analyses incoming emails and creates WeKan tasks.

    ### How it works:
    1. **IMAP Polling** - Checks for new emails at a configurable interval
    2. **AI Analysis** - Uses an LLM (via Ollama) to identify actionable tasks
    3. **WeKan Cards** - Automatically creates cards in the configured board

    ### Endpoints:
    - `GET /status` - Detailed agent status (services, statistics)
    - `POST /start` - Start the polling loop
    - `POST /stop` - Stop the polling loop
    - `POST /process-now` - Trigger an immediate processing run
    - `POST /process-email` - Process a specific email by UID
    - `GET /stats` - Processing statistics
    """,
    version=settings.service_version,
    lifespan=lifespan,
)


# Hardened CORS (same pattern as connectors)
origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Include routers
app.include_router(email_analysis_router)


# ---------------------------------------------------------------------------
# Root & health (kept in main.py, same as agent-builder / agent-runtime)
# ---------------------------------------------------------------------------


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint for Docker health checks."""
    analyzer = get_analyzer_service()

    services_ok = False
    if analyzer:
        services = await analyzer.check_services_health()
        services_ok = all(services.values())

    return JSONResponse(
        status_code=200 if services_ok else 503,
        content={
            "status": "healthy" if services_ok else "degraded",
            "service": settings.service_name,
            "version": settings.service_version,
            "polling_enabled": settings.polling_enabled,
            "polling_running": get_polling_state(),
        },
    )


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": (
                "Internal server error"
                if settings.environment == "production"
                else f"{type(exc).__name__}: {str(exc)}"
            ),
            "error": type(exc).__name__,
        },
    )


# ---------------------------------------------------------------------------
# Development entry-point
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
