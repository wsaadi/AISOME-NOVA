"""
Agent Runtime Engine - Main FastAPI Application.

A universal runtime that executes any agent defined in DSL (YAML/JSON).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .routers import agent_runner_router, chat_completions_router, moderation_settings_router, global_settings_router, nemo_guardrails_settings_router
from .services import (
    get_agent_loader,
    get_session_manager,
    get_tool_manager,
    get_llm_manager,
)
from .models import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print(f"🚀 Starting {settings.service_name} v{settings.service_version}")

    # Load agents
    loader = get_agent_loader()
    count = loader.load_all()
    print(f"📋 Loaded {count} agents")

    # Start session cleanup
    session_manager = get_session_manager()
    await session_manager.start_cleanup_task()

    yield

    # Shutdown
    print(f"👋 Shutting down {settings.service_name}")

    # Cleanup
    await session_manager.stop_cleanup_task()

    tool_manager = get_tool_manager()
    await tool_manager.close()

    llm_manager = get_llm_manager()
    await llm_manager.close()


app = FastAPI(
    title="Agent Runtime Engine",
    description="""
    ## Agent Runtime Engine

    A universal runtime that executes any agent defined in DSL (YAML/JSON).

    ### Features:
    - **Dynamic Agent Loading** - Load agents from YAML/JSON definitions
    - **Workflow Execution** - Execute complex workflows with conditions, loops, and parallel steps
    - **Tool Orchestration** - Call tools from the toolkit dynamically
    - **LLM Integration** - Support for multiple LLM providers
    - **Session Management** - Maintain conversation state across requests
    - **Streaming Support** - Real-time streaming responses

    ### Endpoints:
    - `GET /api/v1/agents` - List available agents
    - `GET /api/v1/agents/{id}` - Get agent info
    - `GET /api/v1/agents/{id}/ui` - Get agent UI definition
    - `POST /api/v1/agents/{id}/execute` - Execute an agent
    - `POST /api/v1/agents/{id}/execute/stream` - Execute with streaming
    - `POST /api/v1/agents/{id}/chat` - Simple chat endpoint
    - `POST /api/v1/chat/completions` - AI Chat with token usage tracking
    - `GET /api/v1/moderation/settings` - Get moderation settings
    - `POST /api/v1/moderation/settings` - Save moderation settings
    - `GET /api/v1/moderation/settings/enums` - Get enum values for settings UI

    ### How it works:
    1. Define your agent in a YAML or JSON file
    2. Place it in the agents storage directory
    3. The runtime loads and serves it automatically
    4. Frontend renders the UI and calls execution endpoints
    """,
    version=settings.service_version,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agent_runner_router)
app.include_router(chat_completions_router)
app.include_router(moderation_settings_router)
app.include_router(global_settings_router)
app.include_router(nemo_guardrails_settings_router)


@app.get("/", response_model=HealthResponse)
async def root():
    """Root endpoint with service information."""
    loader = get_agent_loader()

    return HealthResponse(
        status="running",
        service=settings.service_name,
        version=settings.service_version,
        agents_loaded=loader.count(),
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    loader = get_agent_loader()
    tool_manager = get_tool_manager()
    llm_manager = get_llm_manager()

    # Check dependencies
    dependencies = {}

    # Quick check of critical tools
    for tool_id in ["document-extractor", "web-search", "prompt-moderation"]:
        healthy, status = await tool_manager.check_health(tool_id)
        dependencies[f"tool:{tool_id}"] = "healthy" if healthy else status

    # Check default LLM
    healthy, status = await llm_manager.check_health("mistral")
    dependencies["llm:mistral"] = "healthy" if healthy else status

    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        version=settings.service_version,
        agents_loaded=loader.count(),
        dependencies=dependencies,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
