"""Agent Builder Routers."""

from .agent_builder import router as agent_builder_router
from .agent_dsl import router as dsl_router
from .agent_generator import router as generator_router
from .simple_builder import router as simple_builder_router

# Keep backward compatibility
router = agent_builder_router

__all__ = [
    "router",
    "agent_builder_router",
    "dsl_router",
    "generator_router",
    "simple_builder_router",
]
