"""
Agent Runner Router - API endpoints for executing agents.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import json
import asyncio

from ..models import (
    AgentExecutionRequest,
    AgentExecutionResponse,
    AgentInfo,
    AgentListResponse,
    ExecutionStatus,
    MessageRole,
)
from ..services import (
    get_agent_loader,
    get_workflow_executor,
    get_session_manager,
    get_tool_manager,
    get_llm_manager,
)

router = APIRouter(prefix="/api/v1", tags=["Agent Runtime"])


# ============== AGENT LISTING ==============

@router.get("/agents", response_model=AgentListResponse)
async def list_agents(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all available agents."""
    loader = get_agent_loader()

    if category:
        agents = loader.list_by_category(category)
    else:
        agents = loader.list_active()

    if status:
        agents = [a for a in agents if a.status == status]

    return AgentListResponse(
        agents=[a.to_info() for a in agents],
        total=len(agents),
    )


@router.get("/agents/slug/{slug}")
async def get_agent_by_slug(slug: str):
    """Get the full agent definition by slug (for UI rendering)."""
    loader = get_agent_loader()

    agent = loader.get_by_slug(slug)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")

    # Return the full agent data including UI configuration
    return agent.data


@router.get("/agents/slug/{slug}/definition")
async def get_agent_definition_by_slug(slug: str):
    """Get the full agent definition by slug (for UI rendering)."""
    loader = get_agent_loader()

    agent = loader.get_by_slug(slug)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")

    return agent.data


@router.get("/agents/{agent_id}", response_model=AgentInfo)
async def get_agent(agent_id: str):
    """Get agent information by ID or slug."""
    loader = get_agent_loader()

    agent = loader.get(agent_id) or loader.get_by_slug(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    return agent.to_info()


@router.get("/agents/{agent_id}/definition")
async def get_agent_definition(agent_id: str):
    """Get the full agent definition (for UI rendering)."""
    loader = get_agent_loader()

    agent = loader.get(agent_id) or loader.get_by_slug(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    return agent.data


@router.get("/agents/{agent_id}/ui")
async def get_agent_ui(agent_id: str):
    """Get the agent UI layout definition."""
    loader = get_agent_loader()

    agent = loader.get(agent_id) or loader.get_by_slug(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    return {
        "agent_id": agent.id,
        "agent_name": agent.name,
        "icon": agent.icon,
        "ui": agent.ui,
    }


# ============== AGENT EXECUTION ==============

@router.post("/agents/{agent_id}/execute", response_model=AgentExecutionResponse)
async def execute_agent(
    agent_id: str,
    request: AgentExecutionRequest,
):
    """
    Execute an agent with the given inputs.

    This is the main endpoint for running agents.
    """
    loader = get_agent_loader()
    executor = get_workflow_executor()
    session_manager = get_session_manager()

    # Get agent
    agent = loader.get(agent_id) or loader.get_by_slug(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    # Get or create session
    session = None
    if request.session_id or agent.has_chat_interface():
        session = session_manager.get_or_create(
            session_id=request.session_id,
            agent_id=agent.id,
            agent_name=agent.name,
        )

        # Add user message to session
        if request.message:
            session.add_message(MessageRole.USER, request.message)
            request.inputs["user_message"] = request.message

    # Determine which workflow to run
    workflow = None

    if request.workflow_id:
        workflow = agent.get_workflow(request.workflow_id)
    elif request.trigger:
        # Find workflow by trigger
        if request.trigger.startswith("button:"):
            button_name = request.trigger[7:]
            workflow = agent.get_workflow_by_trigger(
                "button_click",
                {"button": button_name}
            )
        else:
            workflow = agent.get_workflow_by_trigger(request.trigger)
    elif request.message:
        # Chat message - find user_message workflow
        workflow = agent.get_workflow_by_trigger("user_message")

    if not workflow:
        workflow = agent.get_default_workflow()

    if not workflow:
        # No workflow - just do a simple LLM call
        return await _simple_llm_execution(agent, request, session)

    # Execute workflow
    context = await executor.execute(
        agent=agent,
        workflow=workflow,
        inputs=request.inputs,
        files=request.files,
        session=session,
    )

    # Build response
    response = AgentExecutionResponse(
        success=context.status == ExecutionStatus.COMPLETED,
        agent_id=agent.id,
        agent_name=agent.name,
        status=context.status,
        workflow_executed=workflow.get("name"),
        steps_executed=len(context.step_results),
        duration_ms=int((context.completed_at - context.started_at).total_seconds() * 1000) if context.completed_at and context.started_at else 0,
    )

    # Extract outputs
    for var_name, value in context.variables.items():
        if var_name not in request.inputs:
            response.outputs[var_name] = value

    # Get main output
    main_output = context.variables.get("response") or context.variables.get("output") or context.variables.get("result")
    if main_output:
        response.output = main_output
        response.message = main_output if isinstance(main_output, str) else str(main_output)

        # Add assistant message to session
        if session:
            session.add_message(MessageRole.ASSISTANT, response.message)

    # Session ID for continuity
    if session:
        response.session_id = session.session_id

    # Include token usage from workflow execution
    if context.usage and (context.usage.get("prompt_tokens", 0) > 0 or context.usage.get("completion_tokens", 0) > 0):
        response.usage = context.usage

    # Error handling
    if context.error:
        response.error = context.error

    return response


async def _simple_llm_execution(
    agent,
    request: AgentExecutionRequest,
    session=None,
) -> AgentExecutionResponse:
    """Execute a simple LLM call without a workflow."""
    llm_manager = get_llm_manager()

    # Build messages
    messages = []

    if session:
        for msg in session.get_context_messages(agent.business_logic.get("context_window_messages", 10)):
            messages.append({"role": msg.role.value, "content": msg.content})

    if request.message:
        messages.append({"role": "user", "content": request.message})

    # Call LLM
    response = await llm_manager.chat(
        messages=messages,
        provider=agent.llm_provider,
        model=agent.llm_model,
        system_prompt=agent.system_prompt,
        temperature=agent.temperature,
        max_tokens=agent.max_tokens,
    )

    # Add to session
    if session and response.success:
        session.add_message(MessageRole.ASSISTANT, response.content)

    # Extract and format usage data
    usage = None
    if response.usage:
        usage = {
            "prompt_tokens": response.usage.get("prompt_tokens", 0),
            "completion_tokens": response.usage.get("completion_tokens", 0),
            "total_tokens": response.usage.get("total_tokens", 0),
        }
        # Ensure total_tokens is calculated if not provided
        if usage["total_tokens"] == 0:
            usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]

    return AgentExecutionResponse(
        success=response.success,
        agent_id=agent.id,
        agent_name=agent.name,
        status=ExecutionStatus.COMPLETED if response.success else ExecutionStatus.FAILED,
        output=response.content,
        message=response.content,
        session_id=session.session_id if session else None,
        usage=usage,
        error=response.error,
    )


@router.post("/agents/{agent_id}/execute/stream")
async def execute_agent_stream(
    agent_id: str,
    request: AgentExecutionRequest,
):
    """
    Execute an agent with streaming response.

    Returns Server-Sent Events (SSE) stream.
    """
    loader = get_agent_loader()
    llm_manager = get_llm_manager()
    session_manager = get_session_manager()

    agent = loader.get(agent_id) or loader.get_by_slug(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")

    # Get or create session
    session = session_manager.get_or_create(
        session_id=request.session_id,
        agent_id=agent.id,
        agent_name=agent.name,
    )

    if request.message:
        session.add_message(MessageRole.USER, request.message)

    # Build messages
    messages = []
    for msg in session.get_context_messages(10):
        messages.append({"role": msg.role.value, "content": msg.content})

    if request.message:
        messages.append({"role": "user", "content": request.message})

    async def generate():
        full_response = ""

        yield f"data: {json.dumps({'event': 'start', 'session_id': session.session_id})}\n\n"

        async for token in llm_manager.chat_stream(
            messages=messages,
            provider=agent.llm_provider,
            model=agent.llm_model,
            system_prompt=agent.system_prompt,
            temperature=agent.temperature,
            max_tokens=agent.max_tokens,
        ):
            full_response += token
            yield f"data: {json.dumps({'event': 'token', 'content': token})}\n\n"

        # Save to session
        session.add_message(MessageRole.ASSISTANT, full_response)

        yield f"data: {json.dumps({'event': 'complete', 'content': full_response})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/agents/{agent_id}/execute/upload")
async def execute_agent_with_files(
    agent_id: str,
    files: List[UploadFile] = File(...),
    inputs: str = Form("{}"),
    message: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    trigger: Optional[str] = Form(None),
):
    """
    Execute an agent with file uploads.

    Use multipart/form-data for file uploads.
    """
    # Parse inputs
    try:
        inputs_dict = json.loads(inputs)
    except:
        inputs_dict = {}

    # Process files
    files_dict = {}
    for file in files:
        content = await file.read()
        files_dict[file.filename] = {
            "filename": file.filename,
            "content_type": file.content_type,
            "content": content,
        }

    # Create request
    request = AgentExecutionRequest(
        inputs=inputs_dict,
        files=files_dict,
        message=message,
        session_id=session_id,
        trigger=trigger,
    )

    return await execute_agent(agent_id, request)


# ============== CHAT ENDPOINT ==============

@router.post("/agents/{agent_id}/chat")
async def chat_with_agent(
    agent_id: str,
    message: str = Body(..., embed=True),
    session_id: Optional[str] = Body(None, embed=True),
):
    """
    Simple chat endpoint for conversational agents.
    """
    request = AgentExecutionRequest(
        message=message,
        session_id=session_id,
        inputs={"user_message": message},
    )

    return await execute_agent(agent_id, request)


# ============== SESSION MANAGEMENT ==============

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session information."""
    session_manager = get_session_manager()
    session = session_manager.get(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session.session_id,
        "agent_id": session.agent_id,
        "agent_name": session.agent_name,
        "message_count": len(session.messages),
        "created_at": session.created_at.isoformat(),
        "last_activity": session.last_activity.isoformat(),
    }


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    limit: int = Query(50, ge=1, le=200),
):
    """Get messages from a session."""
    session_manager = get_session_manager()
    messages = session_manager.get_messages(session_id, limit)

    return {
        "session_id": session_id,
        "messages": [
            {
                "id": m.id,
                "role": m.role.value,
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    session_manager = get_session_manager()
    deleted = session_manager.delete(session_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"success": True, "message": "Session deleted"}


@router.post("/sessions/{session_id}/clear")
async def clear_session_messages(session_id: str):
    """Clear all messages in a session."""
    session_manager = get_session_manager()
    cleared = session_manager.clear_messages(session_id)

    if not cleared:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"success": True, "message": "Messages cleared"}


# ============== MANAGEMENT ==============

@router.post("/reload")
async def reload_agents():
    """Reload all agents from storage."""
    loader = get_agent_loader()
    count = loader.reload()

    return {
        "success": True,
        "message": f"Reloaded {count} agents",
        "agents_count": count,
    }


@router.get("/stats")
async def get_runtime_stats():
    """Get runtime statistics."""
    loader = get_agent_loader()
    session_manager = get_session_manager()

    return {
        "agents_loaded": loader.count(),
        "active_sessions": session_manager.count(),
    }
