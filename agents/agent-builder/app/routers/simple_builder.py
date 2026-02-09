"""
Simple Builder Router - API endpoints pour le builder d'agents simplifié.

Ces endpoints gèrent:
- La création et gestion des conversations avec le Builder IA
- La création d'agents textuels simples
- La gestion des agents (CRUD)
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field
from datetime import datetime

from ..models.simple_agent import (
    SimpleAgentDefinition,
    SimpleAgentMetadata,
    CreateSimpleAgentRequest,
    UpdateSimpleAgentRequest,
    SimpleAgentListResponse,
    SimpleAgentResponse,
    BuilderConversation,
    BuilderResponse,
    AgentStatus,
    ExportFormat,
)
from ..services.simple_builder_service import get_simple_builder_service
from ..storage.agent_storage import get_storage


router = APIRouter(prefix="/api/v1/simple-builder", tags=["simple-builder"])


# ============== REQUEST/RESPONSE MODELS ==============

class StartConversationRequest(BaseModel):
    """Request to start a new builder conversation."""
    pass  # No parameters needed, user_id comes from header


class StartConversationResponse(BaseModel):
    """Response when starting a new conversation."""
    conversation_id: str
    welcome_message: str


class SendMessageRequest(BaseModel):
    """Request to send a message in a conversation."""
    message: str = Field(..., min_length=1, description="User message")
    attachments: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional attachments (documents, images)"
    )


class ConfirmAgentRequest(BaseModel):
    """Request to confirm and create the generated agent."""
    pass  # No parameters, uses conversation state


# ============== CONVERSATION ENDPOINTS ==============

@router.post("/conversations", response_model=StartConversationResponse)
async def start_conversation(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Start a new conversation with the Builder IA.

    Returns a conversation ID and the welcome message.
    """
    service = get_simple_builder_service()
    user_id = x_user_id or "anonymous"

    conversation = service.create_conversation(user_id)
    welcome_message = await service.get_welcome_message()

    return StartConversationResponse(
        conversation_id=conversation.id,
        welcome_message=welcome_message
    )


@router.post("/conversations/{conversation_id}/messages", response_model=BuilderResponse)
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Send a message in an existing conversation.

    The Builder IA will respond and may:
    - Ask clarification questions (status: needs_more_info)
    - Generate an agent ready to create (status: ready_to_create)
    - Indicate the request is out of scope (status: out_of_scope)
    """
    service = get_simple_builder_service()
    user_id = x_user_id or "anonymous"

    try:
        response = await service.process_message(
            conversation_id=conversation_id,
            user_message=request.message,
            attachments=request.attachments,
            user_id=user_id
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """
    Get the current state of a conversation.

    Useful for recovering a conversation after page reload.
    """
    service = get_simple_builder_service()
    conversation = service.get_conversation(conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conversation.id,
        "status": conversation.status,
        "messages": conversation.messages,
        "created_at": conversation.created_at.isoformat(),
        "generated_agent": conversation.generated_agent.model_dump() if conversation.generated_agent else None,
        "out_of_scope_summary": conversation.out_of_scope_summary
    }


@router.post("/conversations/{conversation_id}/confirm", response_model=SimpleAgentResponse)
async def confirm_and_create_agent(
    conversation_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID")
):
    """
    Confirm and create the agent from a conversation.

    This endpoint is called when the user confirms they want to create
    the agent that was generated during the conversation.
    """
    service = get_simple_builder_service()
    storage = get_storage()
    user_id = x_user_id or "anonymous"

    # Get the generated agent from conversation
    agent = await service.confirm_and_create_agent(conversation_id, user_id)

    if not agent:
        raise HTTPException(
            status_code=400,
            detail="No agent ready to create. Continue the conversation first."
        )

    # Convert to legacy format for storage compatibility
    legacy_agent = _convert_to_legacy_format(agent)

    # Save to storage
    saved_agent = await storage.save(legacy_agent)

    return SimpleAgentResponse(
        success=True,
        agent=agent,
        message="Agent créé avec succès!"
    )


# ============== AGENT CRUD ENDPOINTS ==============

@router.get("/agents", response_model=SimpleAgentListResponse)
async def list_agents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """
    List agents.

    - Regular users see only their own agents
    - Admins see all agents
    """
    storage = get_storage()
    user_id = x_user_id or "anonymous"
    is_admin = x_user_role == "admin"

    # Get all agents (returns tuple of agents list and total count)
    all_agents, _ = await storage.list(page_size=1000)

    # Filter based on permissions
    filtered_agents = []
    for agent in all_agents:
        # Convert to simple format
        simple_agent = _convert_from_legacy_format(agent)
        if not simple_agent:
            continue

        # Permission check: admin sees all, users see their own + public
        if is_admin:
            filtered_agents.append(simple_agent)
        elif simple_agent.metadata.created_by == user_id or simple_agent.is_public:
            filtered_agents.append(simple_agent)

    # Apply filters
    if category:
        filtered_agents = [a for a in filtered_agents if a.category == category]
    if status:
        filtered_agents = [a for a in filtered_agents if a.status.value == status]
    if search:
        search_lower = search.lower()
        filtered_agents = [
            a for a in filtered_agents
            if search_lower in a.name.lower() or search_lower in a.description.lower()
        ]

    # Pagination
    total = len(filtered_agents)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = filtered_agents[start:end]

    return SimpleAgentListResponse(
        agents=paginated,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/agents/{agent_id}", response_model=SimpleAgentResponse)
async def get_agent(
    agent_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """Get a specific agent by ID."""
    storage = get_storage()
    user_id = x_user_id or "anonymous"
    is_admin = x_user_role == "admin"

    agent = await storage.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    simple_agent = _convert_from_legacy_format(agent)
    if not simple_agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Permission check
    if not is_admin and simple_agent.metadata.created_by != user_id and not simple_agent.is_public:
        raise HTTPException(status_code=403, detail="Access denied")

    return SimpleAgentResponse(success=True, agent=simple_agent)


@router.put("/agents/{agent_id}", response_model=SimpleAgentResponse)
async def update_agent(
    agent_id: str,
    request: UpdateSimpleAgentRequest,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """
    Update an agent.

    Users can only update their own agents.
    Admins can update any agent.
    """
    storage = get_storage()
    user_id = x_user_id or "anonymous"
    is_admin = x_user_role == "admin"

    # Get existing agent
    existing = await storage.get(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Permission check
    created_by = existing.metadata.created_by if existing.metadata else None
    if not is_admin and created_by != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Build update dict
    update_data = request.model_dump(exclude_unset=True)

    # Apply updates to existing agent
    if "name" in update_data:
        existing.name = update_data["name"]
    if "description" in update_data:
        existing.description = update_data["description"]
    if "icon" in update_data:
        existing.icon = update_data["icon"]
    if "category" in update_data:
        existing.category = update_data["category"]
    if "status" in update_data:
        existing.status = update_data["status"]
    if "system_prompt" in update_data and existing.ai_behavior:
        existing.ai_behavior.system_prompt = update_data["system_prompt"]
    if "user_prompt_template" in update_data and existing.ai_behavior:
        existing.ai_behavior.user_prompt = update_data["user_prompt_template"]

    # Update metadata
    if existing.metadata:
        existing.metadata.updated_at = datetime.utcnow()

    # Save
    updated = await storage.save(existing)

    simple_agent = _convert_from_legacy_format(updated)
    return SimpleAgentResponse(success=True, agent=simple_agent)


@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """
    Delete an agent.

    Users can only delete their own agents.
    Admins can delete any agent.
    """
    storage = get_storage()
    user_id = x_user_id or "anonymous"
    is_admin = x_user_role == "admin"

    # Get existing agent
    existing = await storage.get(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Permission check
    created_by = existing.metadata.created_by if existing.metadata else None
    if not is_admin and created_by != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Delete
    success = await storage.delete(agent_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete agent")

    return {"success": True, "message": "Agent deleted"}


@router.post("/agents/{agent_id}/activate")
async def activate_agent(
    agent_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """Activate an agent (make it active)."""
    storage = get_storage()
    user_id = x_user_id or "anonymous"
    is_admin = x_user_role == "admin"

    existing = await storage.get(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")

    created_by = existing.metadata.created_by if existing.metadata else None
    if not is_admin and created_by != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    existing.status = AgentStatus.ACTIVE
    if existing.metadata:
        existing.metadata.updated_at = datetime.utcnow()

    await storage.save(existing)
    return {"success": True, "message": "Agent activated"}


@router.post("/agents/{agent_id}/deactivate")
async def deactivate_agent(
    agent_id: str,
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    """Deactivate an agent."""
    storage = get_storage()
    user_id = x_user_id or "anonymous"
    is_admin = x_user_role == "admin"

    existing = await storage.get(agent_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agent not found")

    created_by = existing.metadata.created_by if existing.metadata else None
    if not is_admin and created_by != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    existing.status = AgentStatus.DISABLED
    if existing.metadata:
        existing.metadata.updated_at = datetime.utcnow()

    await storage.save(existing)
    return {"success": True, "message": "Agent deactivated"}


# ============== HELPER FUNCTIONS ==============

def _convert_to_legacy_format(simple_agent: SimpleAgentDefinition) -> Any:
    """Convert simple agent to legacy AgentDefinition format for storage."""
    from ..models.agent_definition import (
        AgentDefinition,
        AgentMetadata,
        AgentStatus as LegacyStatus,
        AIBehavior,
        UILayout,
        LayoutSection,
        UIComponent,
        ComponentType,
        ToolConfiguration,
    )

    # Map status
    status_map = {
        "draft": LegacyStatus.DRAFT,
        "active": LegacyStatus.ACTIVE,
        "disabled": LegacyStatus.DISABLED,
    }

    # Create the chat interface component
    chat_component = UIComponent(
        type=ComponentType.CHAT_INTERFACE,
        name="main_chat",
        label="Conversation",
        auto_bind_output=True,
        style={"height": "calc(100vh - 200px)"}
    )

    # Create main section
    main_section = LayoutSection(
        name="chat_section",
        layout_type="column",
        components=[chat_component]
    )

    # Create UI layout (inherited from AI Chat Agent)
    ui_layout = UILayout(
        layout_mode="sections",
        show_header=True,
        header_title=simple_agent.name,
        header_subtitle=simple_agent.description,
        header_icon=simple_agent.icon,
        sections=[main_section],
        show_sidebar=False,
        show_footer=False,
        show_actions=False,
    )

    # Create AI behavior
    ai_behavior = AIBehavior(
        system_prompt=simple_agent.system_prompt,
        user_prompt=simple_agent.user_prompt_template,
        temperature=simple_agent.temperature,
        max_tokens=simple_agent.max_tokens,
        enable_moderation=True,
        enable_classification=True,
    )

    # Configure export tools if needed
    tools = []
    tool_map = {
        ExportFormat.EXCEL: ("excel-crud", "Export Excel"),
        ExportFormat.WORD: ("word-crud", "Export Word"),
        ExportFormat.POWERPOINT: ("pptx-crud", "Export PowerPoint"),
        ExportFormat.PDF: ("pdf-crud", "Export PDF"),
    }

    for fmt in simple_agent.export_formats:
        if fmt in tool_map:
            tool_id, tool_name = tool_map[fmt]
            tools.append(ToolConfiguration(
                tool_id=tool_id,
                tool_name=tool_name,
                enabled=True
            ))

    # Always add document-extractor for multimodal support
    tools.append(ToolConfiguration(
        tool_id="document-extractor",
        tool_name="Document Extractor",
        enabled=True
    ))

    # Create legacy agent
    legacy_agent = AgentDefinition(
        id=simple_agent.id,
        name=simple_agent.name,
        description=simple_agent.description,
        long_description=simple_agent.long_description,
        icon=simple_agent.icon,
        category=simple_agent.category,
        status=status_map.get(simple_agent.status.value, LegacyStatus.DRAFT),
        metadata=AgentMetadata(
            created_at=simple_agent.metadata.created_at,
            updated_at=simple_agent.metadata.updated_at,
            created_by=simple_agent.metadata.created_by,
            version=simple_agent.metadata.version,
            tags=simple_agent.metadata.tags,
        ),
        tools=tools,
        ui_layout=ui_layout,
        ai_behavior=ai_behavior,
        requires_auth=simple_agent.requires_auth,
        allowed_roles=simple_agent.allowed_roles,
    )

    return legacy_agent


def _convert_from_legacy_format(legacy_agent: Any) -> Optional[SimpleAgentDefinition]:
    """Convert legacy AgentDefinition to simple format."""
    try:
        # Extract export formats from tools
        export_formats = []
        tool_format_map = {
            "excel-crud": ExportFormat.EXCEL,
            "word-crud": ExportFormat.WORD,
            "pptx-crud": ExportFormat.POWERPOINT,
            "pdf-crud": ExportFormat.PDF,
        }

        if legacy_agent.tools:
            for tool in legacy_agent.tools:
                if tool.tool_id in tool_format_map:
                    export_formats.append(tool_format_map[tool.tool_id])

        # Map status
        status_map = {
            "draft": AgentStatus.DRAFT,
            "active": AgentStatus.ACTIVE,
            "disabled": AgentStatus.DISABLED,
            "beta": AgentStatus.ACTIVE,
            "archived": AgentStatus.DISABLED,
        }

        return SimpleAgentDefinition(
            id=legacy_agent.id,
            name=legacy_agent.name,
            description=legacy_agent.description,
            long_description=legacy_agent.long_description,
            icon=legacy_agent.icon,
            category=legacy_agent.category,
            status=status_map.get(legacy_agent.status.value, AgentStatus.DRAFT),
            metadata=SimpleAgentMetadata(
                created_at=legacy_agent.metadata.created_at if legacy_agent.metadata else datetime.utcnow(),
                updated_at=legacy_agent.metadata.updated_at if legacy_agent.metadata else datetime.utcnow(),
                created_by=legacy_agent.metadata.created_by if legacy_agent.metadata else None,
                version=legacy_agent.metadata.version if legacy_agent.metadata else "1.0.0",
                tags=legacy_agent.metadata.tags if legacy_agent.metadata else [],
            ),
            system_prompt=legacy_agent.ai_behavior.system_prompt if legacy_agent.ai_behavior else "",
            user_prompt_template=legacy_agent.ai_behavior.user_prompt if legacy_agent.ai_behavior else None,
            export_formats=export_formats,
            temperature=legacy_agent.ai_behavior.temperature if legacy_agent.ai_behavior else 0.7,
            max_tokens=legacy_agent.ai_behavior.max_tokens if legacy_agent.ai_behavior else 4096,
            requires_auth=legacy_agent.requires_auth,
            allowed_roles=legacy_agent.allowed_roles,
        )
    except Exception as e:
        import logging
        logging.error(f"Error converting legacy agent: {e}")
        return None
