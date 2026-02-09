"""
Runtime Models - Data structures for agent execution.
"""

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import uuid


# ============== ENUMS ==============

class ExecutionStatus(str, Enum):
    """Status of an execution."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MessageRole(str, Enum):
    """Role in a conversation."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


# ============== EXECUTION MODELS ==============

class AgentExecutionRequest(BaseModel):
    """Request to execute an agent."""
    # Input data from UI components
    inputs: Dict[str, Any] = Field(default_factory=dict, description="Input values from UI components")

    # Optional file uploads
    files: Optional[Dict[str, Any]] = Field(None, description="Uploaded files by component name")

    # Chat message (for chat-based agents)
    message: Optional[str] = Field(None, description="User message for chat agents")

    # Session ID for conversation continuity
    session_id: Optional[str] = Field(None, description="Session ID for stateful conversations")

    # Specific workflow to trigger (optional)
    workflow_id: Optional[str] = Field(None, description="Specific workflow to run")

    # Trigger source
    trigger: Optional[str] = Field(None, description="What triggered this execution (button name, etc.)")

    # Stream response
    stream: bool = Field(default=False, description="Enable streaming response")


class StepExecutionResult(BaseModel):
    """Result of executing a single workflow step."""
    step_id: str
    step_name: str
    step_type: str
    status: ExecutionStatus
    output: Optional[Any] = None
    error: Optional[str] = None
    duration_ms: int = 0
    started_at: datetime
    completed_at: Optional[datetime] = None


class WorkflowExecutionContext(BaseModel):
    """Context maintained during workflow execution."""
    workflow_id: str
    workflow_name: str
    agent_id: str

    # Variables available during execution
    variables: Dict[str, Any] = Field(default_factory=dict)

    # Results from each step
    step_results: List[StepExecutionResult] = Field(default_factory=list)

    # Current state
    current_step_id: Optional[str] = None
    status: ExecutionStatus = ExecutionStatus.PENDING

    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Token usage tracking - aggregated across all LLM calls
    usage: Dict[str, int] = Field(default_factory=lambda: {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0})

    # Error info
    error: Optional[str] = None

    def add_usage(self, step_usage: Dict[str, int]) -> None:
        """Add usage from a step to the cumulative total."""
        if step_usage:
            self.usage["prompt_tokens"] += step_usage.get("prompt_tokens", 0)
            self.usage["completion_tokens"] += step_usage.get("completion_tokens", 0)
            self.usage["total_tokens"] += step_usage.get("total_tokens", 0)


class AgentExecutionResponse(BaseModel):
    """Response from agent execution."""
    success: bool
    agent_id: str
    agent_name: str

    # Execution info
    execution_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ExecutionStatus

    # Output data
    output: Optional[Any] = Field(None, description="Main output (text, structured data, etc.)")
    outputs: Dict[str, Any] = Field(default_factory=dict, description="Named outputs for UI binding")

    # Generated files
    files: List[Dict[str, Any]] = Field(default_factory=list, description="Generated file references")

    # For chat agents
    message: Optional[str] = Field(None, description="Assistant response message")
    session_id: Optional[str] = Field(None, description="Session ID for continuity")

    # Execution details
    workflow_executed: Optional[str] = None
    steps_executed: int = 0
    duration_ms: int = 0

    # Token usage tracking - CRITICAL for consumption monitoring
    usage: Optional[Dict[str, int]] = Field(None, description="Token usage: prompt_tokens, completion_tokens, total_tokens")

    # Errors/warnings
    error: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)


# ============== SESSION MODELS ==============

class SessionMessage(BaseModel):
    """A message in a conversation session."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Attached data (files, analysis results, etc.)
    attachments: List[Dict[str, Any]] = Field(default_factory=list)

    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentSession(BaseModel):
    """A stateful session with an agent."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    agent_name: str

    # Conversation history
    messages: List[SessionMessage] = Field(default_factory=list)

    # Session variables (persistent across messages)
    variables: Dict[str, Any] = Field(default_factory=dict)

    # Timing
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)

    # User info (if authenticated)
    user_id: Optional[str] = None

    def add_message(self, role: MessageRole, content: str, **kwargs) -> SessionMessage:
        """Add a message to the session."""
        message = SessionMessage(role=role, content=content, **kwargs)
        self.messages.append(message)
        self.last_activity = datetime.utcnow()
        return message

    def get_context_messages(self, limit: int = 10) -> List[SessionMessage]:
        """Get recent messages for context."""
        return self.messages[-limit:] if self.messages else []


# ============== INFO MODELS ==============

class AgentInfo(BaseModel):
    """Information about a loaded agent."""
    id: str
    name: str
    slug: str
    description: str
    category: str
    status: str
    icon: str

    # Capabilities
    has_chat: bool = False
    has_file_upload: bool = False
    has_workflows: bool = False

    # Tools used
    tools: List[str] = Field(default_factory=list)

    # LLM provider
    llm_provider: str = "mistral"

    # Route
    route: str


class AgentListResponse(BaseModel):
    """List of available agents."""
    agents: List[AgentInfo]
    total: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    agents_loaded: int = 0
    dependencies: Dict[str, str] = Field(default_factory=dict)


# ============== STREAMING MODELS ==============

class StreamEvent(BaseModel):
    """Event in a streaming response."""
    event: Literal["start", "token", "step", "tool", "complete", "error"]
    data: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============== TOOL EXECUTION ==============

class ToolExecutionRequest(BaseModel):
    """Request to execute a tool."""
    tool_id: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    files: Optional[Dict[str, bytes]] = None
    timeout_ms: int = 60000


class ToolExecutionResponse(BaseModel):
    """Response from tool execution."""
    success: bool
    tool_id: str
    output: Optional[Any] = None
    error: Optional[str] = None
    duration_ms: int = 0


# ============== LLM EXECUTION ==============

class LLMRequest(BaseModel):
    """Request to an LLM."""
    provider: str
    model: Optional[str] = None
    messages: List[Dict[str, str]]
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2048
    stream: bool = False


class LLMResponse(BaseModel):
    """Response from LLM."""
    success: bool
    content: str
    model: str
    provider: str
    usage: Dict[str, int] = Field(default_factory=dict)
    error: Optional[str] = None
