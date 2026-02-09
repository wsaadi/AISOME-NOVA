"""
Agent Builder API Router - REST endpoints for agent management.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from ..models import (
    AgentDefinition,
    AgentStatus,
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentListResponse,
    AgentResponse,
    ToolConfiguration,
    UILayout,
    AIBehavior,
    Workflow,
    ToolCategory,
)
from ..services import get_agent_builder_service

router = APIRouter(prefix="/api/v1/agent-builder", tags=["Agent Builder"])


# ============== AGENT CRUD ==============

@router.post("/agents", response_model=AgentResponse)
async def create_agent(request: CreateAgentRequest):
    """Create a new agent."""
    try:
        service = get_agent_builder_service()
        agent = await service.create_agent(request)
        return AgentResponse(success=True, agent=agent)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents", response_model=AgentListResponse)
async def list_agents(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[AgentStatus] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in name/description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """List all agents with optional filtering."""
    try:
        service = get_agent_builder_service()
        agents, total = await service.list_agents(
            category=category,
            status=status,
            search=search,
            page=page,
            page_size=page_size
        )
        return AgentListResponse(
            agents=agents,
            total=total,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    """Get an agent by ID."""
    service = get_agent_builder_service()
    agent = await service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


@router.put("/agents/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, request: UpdateAgentRequest):
    """Update an existing agent."""
    service = get_agent_builder_service()
    agent = await service.update_agent(agent_id, request)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    service = get_agent_builder_service()
    deleted = await service.delete_agent(agent_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"success": True, "message": "Agent deleted"}


@router.post("/agents/{agent_id}/duplicate", response_model=AgentResponse)
async def duplicate_agent(
    agent_id: str,
    new_name: str = Body(..., embed=True)
):
    """Duplicate an existing agent."""
    service = get_agent_builder_service()
    agent = await service.duplicate_agent(agent_id, new_name)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


# ============== AGENT LIFECYCLE ==============

@router.post("/agents/{agent_id}/validate")
async def validate_agent(agent_id: str):
    """Validate an agent definition."""
    service = get_agent_builder_service()
    agent = await service.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    validation = await service.validate_agent(agent)
    return validation


@router.post("/agents/{agent_id}/activate", response_model=AgentResponse)
async def activate_agent(agent_id: str):
    """Activate an agent for use."""
    service = get_agent_builder_service()
    try:
        agent = await service.activate_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return AgentResponse(success=True, agent=agent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents/{agent_id}/deactivate", response_model=AgentResponse)
async def deactivate_agent(agent_id: str):
    """Deactivate an agent."""
    service = get_agent_builder_service()
    agent = await service.deactivate_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


# ============== AGENT CONFIGURATION ==============

@router.put("/agents/{agent_id}/tools", response_model=AgentResponse)
async def update_agent_tools(
    agent_id: str,
    tools: List[ToolConfiguration] = Body(...)
):
    """Update agent tools configuration."""
    service = get_agent_builder_service()
    request = UpdateAgentRequest(tools=tools)
    agent = await service.update_agent(agent_id, request)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


@router.put("/agents/{agent_id}/ui-layout", response_model=AgentResponse)
async def update_agent_ui_layout(
    agent_id: str,
    ui_layout: UILayout = Body(...)
):
    """Update agent UI layout."""
    service = get_agent_builder_service()
    request = UpdateAgentRequest(ui_layout=ui_layout)
    agent = await service.update_agent(agent_id, request)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


@router.put("/agents/{agent_id}/ai-behavior", response_model=AgentResponse)
async def update_agent_ai_behavior(
    agent_id: str,
    ai_behavior: AIBehavior = Body(...)
):
    """Update agent AI behavior configuration."""
    service = get_agent_builder_service()
    request = UpdateAgentRequest(ai_behavior=ai_behavior)
    agent = await service.update_agent(agent_id, request)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


@router.put("/agents/{agent_id}/workflows", response_model=AgentResponse)
async def update_agent_workflows(
    agent_id: str,
    workflows: List[Workflow] = Body(...)
):
    """Update agent workflows."""
    service = get_agent_builder_service()
    request = UpdateAgentRequest(workflows=workflows)
    agent = await service.update_agent(agent_id, request)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentResponse(success=True, agent=agent)


# ============== IMPORT/EXPORT ==============

@router.get("/agents/{agent_id}/export")
async def export_agent(agent_id: str):
    """Export an agent definition as JSON."""
    service = get_agent_builder_service()
    data = await service.export_agent(agent_id)
    if not data:
        raise HTTPException(status_code=404, detail="Agent not found")
    return data


@router.post("/agents/import", response_model=AgentResponse)
async def import_agent(data: Dict[str, Any] = Body(...)):
    """Import an agent from JSON."""
    try:
        service = get_agent_builder_service()
        agent = await service.import_agent(data)
        return AgentResponse(success=True, agent=agent)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# ============== TOOLS REGISTRY ==============

@router.get("/tools")
async def get_available_tools(
    category: Optional[ToolCategory] = Query(None, description="Filter by category")
):
    """Get all available tools that agents can use."""
    service = get_agent_builder_service()
    tools = service.get_available_tools(category)
    return {"tools": [t.model_dump() for t in tools]}


@router.get("/tools/{tool_id}")
async def get_tool(tool_id: str):
    """Get a specific tool by ID."""
    service = get_agent_builder_service()
    tool = service.get_tool_by_id(tool_id)
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool.model_dump()


# ============== UI COMPONENTS ==============

@router.get("/components")
async def get_component_types():
    """Get all available UI component types."""
    service = get_agent_builder_service()
    return {"components": service.get_component_types()}


# ============== TEMPLATES & PRESETS ==============

@router.get("/templates/ui")
async def get_ui_templates():
    """Get available UI templates."""
    service = get_agent_builder_service()
    return {"templates": service.get_ui_templates()}


@router.get("/templates/personality")
async def get_personality_presets():
    """Get available AI personality presets."""
    service = get_agent_builder_service()
    return {"presets": service.get_personality_presets()}


# ============== CATEGORIES ==============

@router.get("/categories")
async def get_categories():
    """Get all available agent categories."""
    return {
        "categories": [
            {"id": "custom", "name": "Custom Agents", "icon": "fa fa-robot"},
            {"id": "document_analysis", "name": "Document Analysis", "icon": "fa fa-file-alt"},
            {"id": "data_processing", "name": "Data Processing", "icon": "fa fa-database"},
            {"id": "communication", "name": "Communication", "icon": "fa fa-comments"},
            {"id": "analytics", "name": "Analytics", "icon": "fa fa-chart-line"},
            {"id": "integration", "name": "Integration", "icon": "fa fa-plug"},
            {"id": "automation", "name": "Automation", "icon": "fa fa-cogs"},
        ]
    }
