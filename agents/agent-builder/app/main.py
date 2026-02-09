"""
Agent Builder - Main FastAPI Application.

A no-code/low-code platform for creating custom AI agents.
Supports Agent Descriptor Language (ADL) for standardized agent definitions.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .routers import agent_builder_router, dsl_router, generator_router, simple_builder_router
from .models import ADL_VERSION


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print(f"🚀 Starting {settings.service_name} v{settings.service_version}")
    print(f"📋 Agent Descriptor Language (ADL) v{ADL_VERSION}")
    yield
    # Shutdown
    print(f"👋 Shutting down {settings.service_name}")


app = FastAPI(
    title="Agent Builder",
    description=f"""
    ## Agent Builder API

    A no-code/low-code platform for creating custom AI agents.
    Supports **Agent Descriptor Language (ADL) v{ADL_VERSION}** for standardized agent definitions.

    ### Features:
    - **Create agents** with custom configurations
    - **Configure tools** from the available toolkit
    - **Design UI layouts** using drag-and-drop components
    - **Define AI behavior** with prompts and personalities
    - **Create workflows** for complex task automation
    - **Import/Export** agent definitions in YAML or JSON
    - **DSL Support** for declarative agent creation

    ### Endpoints:
    - `/api/v1/agent-builder/agents` - CRUD operations for agents
    - `/api/v1/agent-builder/tools` - Available tools registry
    - `/api/v1/agent-builder/components` - UI component types
    - `/api/v1/agent-builder/templates` - Pre-built templates
    - `/api/v1/dsl/*` - Agent Descriptor Language operations

    ### DSL Features:
    - Parse and validate YAML/JSON agent definitions
    - Import agents from YAML/JSON files
    - Export agents to YAML/JSON format
    - Convert between legacy and DSL formats
    - Access pre-built templates
    - Get JSON schema for IDE integration
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
app.include_router(agent_builder_router)
app.include_router(dsl_router)
app.include_router(generator_router)
app.include_router(simple_builder_router)  # New simplified builder


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.service_name,
        "version": settings.service_version,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
