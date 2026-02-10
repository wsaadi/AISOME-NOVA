"""
Agent Definition Models - Core data structures for the Agent Builder.

This module defines the complete schema for user-created agents, including:
- Agent metadata (name, description, category)
- Tool configurations (which tools to use and how)
- UI layout (visual interface components)
- AI behavior (system prompts, workflows, LLM settings)
"""

from typing import Any, Dict, List, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


# ============== ENUMS ==============

class AgentStatus(str, Enum):
    """Agent lifecycle status."""
    DRAFT = "draft"
    ACTIVE = "active"
    BETA = "beta"
    DISABLED = "disabled"
    ARCHIVED = "archived"


class AgentType(str, Enum):
    """Agent type indicating its origin and rendering mode."""
    STATIC = "static"      # Built-in agent with dedicated Angular component
    DYNAMIC = "dynamic"    # Created via Agent Builder, rendered by agent-runner
    RUNTIME = "runtime"    # Defined in YAML, loaded from agent-runtime service


class ComponentType(str, Enum):
    """Available UI component types for agent interfaces."""
    # Input Components
    TEXT_INPUT = "text_input"
    TEXTAREA = "textarea"
    NUMBER_INPUT = "number_input"
    EMAIL_INPUT = "email_input"
    PASSWORD_INPUT = "password_input"
    DATE_PICKER = "date_picker"
    TIME_PICKER = "time_picker"
    DATETIME_PICKER = "datetime_picker"
    SELECT = "select"
    MULTI_SELECT = "multi_select"
    CHECKBOX = "checkbox"
    RADIO_GROUP = "radio_group"
    SLIDER = "slider"
    TOGGLE = "toggle"

    # File Components
    FILE_UPLOAD = "file_upload"
    IMAGE_UPLOAD = "image_upload"
    DOCUMENT_UPLOAD = "document_upload"
    DOCUMENT_REPOSITORY = "document_repository"

    # Display Components
    TEXT_DISPLAY = "text_display"
    MARKDOWN_VIEWER = "markdown_viewer"
    PDF_VIEWER = "pdf_viewer"
    IMAGE_VIEWER = "image_viewer"
    CODE_VIEWER = "code_viewer"

    # Chart Components
    BAR_CHART = "bar_chart"
    LINE_CHART = "line_chart"
    PIE_CHART = "pie_chart"
    DONUT_CHART = "donut_chart"

    # Interactive Components
    CHAT_INTERFACE = "chat_interface"
    BUTTON = "button"
    BUTTON_GROUP = "button_group"
    PROGRESS_BAR = "progress_bar"

    # Layout Components
    CARD = "card"
    TABS = "tabs"
    ACCORDION = "accordion"
    DIVIDER = "divider"
    SPACER = "spacer"
    GRID = "grid"

    # Data Components
    DATA_TABLE = "data_table"
    LIST = "list"
    TREE_VIEW = "tree_view"


class ToolCategory(str, Enum):
    """Categories for available tools."""
    DOCUMENT_PROCESSING = "document_processing"
    CONTENT_GENERATION = "content_generation"
    DATA_EXTRACTION = "data_extraction"
    SEARCH = "search"
    COMMUNICATION = "communication"
    GOVERNANCE = "governance"
    ANALYTICS = "analytics"
    INTEGRATION = "integration"


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    MISTRAL = "mistral"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    PERPLEXITY = "perplexity"


class WorkflowStepType(str, Enum):
    """Types of workflow steps."""
    LLM_CALL = "llm_call"
    TOOL_CALL = "tool_call"
    CONDITION = "condition"
    LOOP = "loop"
    PARALLEL = "parallel"
    USER_INPUT = "user_input"
    DATA_TRANSFORM = "data_transform"
    VALIDATION = "validation"
    SET_VARIABLE = "set_variable"
    HTTP_REQUEST = "http_request"


class TriggerType(str, Enum):
    """Types of agent triggers."""
    USER_MESSAGE = "user_message"
    FORM_SUBMIT = "form_submit"
    FILE_UPLOAD = "file_upload"
    BUTTON_CLICK = "button_click"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"


# ============== UI COMPONENT MODELS ==============

class ValidationRule(BaseModel):
    """Validation rule for form inputs."""
    type: str = Field(..., description="Type of validation: required, min, max, pattern, custom")
    value: Optional[Any] = Field(None, description="Validation value (e.g., min length)")
    message: str = Field(..., description="Error message to display")


class SelectOption(BaseModel):
    """Option for select/radio components."""
    value: str
    label: str
    disabled: bool = False
    icon: Optional[str] = None


class GridPosition(BaseModel):
    """Grid position for dashboard layout widgets."""
    x: int = Field(0, ge=0, description="Column position (0-based)")
    y: int = Field(0, ge=0, description="Row position (0-based)")
    w: int = Field(4, ge=1, le=12, description="Width in columns")
    h: int = Field(2, ge=1, description="Height in rows")


class ChartConfig(BaseModel):
    """Configuration for chart components."""
    show_legend: bool = True
    animate: bool = True
    colors: List[str] = Field(default_factory=list)


class DashboardConfig(BaseModel):
    """Configuration for dashboard grid layout."""
    columns: int = Field(12, ge=1, le=24, description="Number of grid columns")
    rowHeight: int = Field(80, ge=20, description="Height of each row in pixels")
    gap: int = Field(12, ge=0, description="Gap between widgets in pixels")


class ComponentStyle(BaseModel):
    """Styling options for UI components."""
    width: Optional[str] = Field(None, description="Width (e.g., '100%', '300px')")
    height: Optional[str] = None
    margin: Optional[str] = None
    padding: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    border_radius: Optional[str] = None
    custom_css: Optional[str] = None


class UIComponent(BaseModel):
    """Definition of a UI component in the agent interface."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ComponentType
    name: str = Field(..., description="Unique identifier name for this component")
    label: Optional[str] = Field(None, description="Display label")
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    default_value: Optional[Any] = None

    # Validation
    required: bool = False
    validation_rules: List[ValidationRule] = Field(default_factory=list)

    # Options for select/radio/checkbox
    options: List[SelectOption] = Field(default_factory=list)

    # File upload settings
    accept: Optional[str] = Field(None, description="Accepted file types")
    max_size_mb: Optional[float] = None
    multiple: bool = False

    # Layout
    grid_column: Optional[str] = Field(None, description="Grid column span (e.g., '1 / 3')")
    grid_row: Optional[str] = None
    order: int = 0

    # Styling
    style: ComponentStyle = Field(default_factory=ComponentStyle)

    # Visibility conditions
    visible_when: Optional[Dict[str, Any]] = Field(
        None,
        description="Condition for visibility (e.g., {'field': 'type', 'equals': 'advanced'})"
    )

    # Nested components (for containers like Card, Tabs)
    children: List["UIComponent"] = Field(default_factory=list)

    # Data binding
    data_source: Optional[str] = Field(None, description="Variable name to bind to")
    auto_bind_output: Optional[bool] = Field(False, description="If true, automatically binds agent output to this component")
    output_key: Optional[str] = Field(None, description="Key to extract from structured JSON output (e.g., 'swot', 'synthesis')")
    on_change_action: Optional[str] = Field(None, description="Action to trigger on change")

    # Button-specific properties
    button_action: Optional[str] = Field(None, description="Action for button: 'trigger_agent', 'submit_form', 'reset_form', 'navigate', 'custom'")
    button_variant: Optional[str] = Field(None, description="Button style: 'primary', 'secondary', 'success', 'warning', 'danger'")
    is_trigger_button: Optional[bool] = Field(False, description="Whether this button triggers the agent execution")

    # Dashboard grid position (for layout_mode='dashboard')
    gridPosition: Optional[GridPosition] = Field(None, description="Position and size on the dashboard grid")

    # Chart configuration
    chart_config: Optional[ChartConfig] = Field(None, description="Configuration for chart components")


# ============== TOOL CONFIGURATION MODELS ==============

class ToolParameter(BaseModel):
    """Parameter configuration for a tool."""
    name: str
    source: str = Field(..., description="Source of value: 'input', 'constant', 'variable', 'previous_output'")
    value: Optional[Any] = Field(None, description="Constant value or variable reference")
    input_component: Optional[str] = Field(None, description="UI component name for input binding")
    transform: Optional[str] = Field(None, description="Optional transformation expression")


class ToolConfiguration(BaseModel):
    """Configuration for a tool used by the agent."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tool_id: str = Field(..., description="ID of the tool to use")
    tool_name: str = Field(..., description="Display name of the tool")
    enabled: bool = True

    # Parameter mapping
    parameters: List[ToolParameter] = Field(default_factory=list)

    # Output handling
    output_variable: Optional[str] = Field(None, description="Variable name to store output")
    output_transform: Optional[str] = Field(None, description="Transform expression for output")

    # Error handling
    on_error: str = Field("continue", description="Behavior on error: 'stop', 'continue', 'retry'")
    retry_count: int = 0
    fallback_value: Optional[Any] = None


# ============== WORKFLOW MODELS ==============

class WorkflowCondition(BaseModel):
    """Condition for branching in workflows."""
    variable: str = Field(..., description="Variable to evaluate")
    operator: str = Field(..., description="Comparison operator: eq, ne, gt, lt, contains, etc.")
    value: Any = Field(..., description="Value to compare against")


class WorkflowStep(BaseModel):
    """A step in the agent workflow."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: WorkflowStepType
    description: Optional[str] = None

    # For LLM calls
    prompt_template: Optional[str] = None
    system_prompt: Optional[str] = None
    llm_provider: Optional[LLMProvider] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

    # For tool calls
    tool_config_id: Optional[str] = Field(None, description="Reference to ToolConfiguration.id")

    # For conditions
    condition: Optional[WorkflowCondition] = None
    on_true: Optional[str] = Field(None, description="Next step ID if condition is true")
    on_false: Optional[str] = Field(None, description="Next step ID if condition is false")

    # For loops
    loop_variable: Optional[str] = None
    loop_collection: Optional[str] = None
    loop_body: List["WorkflowStep"] = Field(default_factory=list)

    # For parallel execution
    parallel_steps: List["WorkflowStep"] = Field(default_factory=list)

    # For user input
    input_components: List[str] = Field(default_factory=list, description="UI component names to wait for")

    # Flow control
    next_step: Optional[str] = Field(None, description="ID of the next step")

    # Output
    output_variable: Optional[str] = None


class Workflow(BaseModel):
    """Complete workflow definition for an agent."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    trigger: TriggerType
    trigger_config: Dict[str, Any] = Field(default_factory=dict)

    # Steps
    steps: List[WorkflowStep] = Field(default_factory=list)
    entry_step: Optional[str] = Field(None, description="ID of the first step")

    # Variables
    variables: Dict[str, Any] = Field(default_factory=dict, description="Initial variables")

    # Error handling
    global_error_handler: Optional[str] = Field(None, description="Step ID for global error handling")


# ============== AI BEHAVIOR MODELS ==============

class PersonalityTrait(BaseModel):
    """AI personality trait."""
    trait: str = Field(..., description="Trait name (e.g., 'friendly', 'professional')")
    intensity: float = Field(1.0, ge=0, le=2, description="Trait intensity (0-2)")


class ResponseFormat(BaseModel):
    """Expected response format configuration."""
    type: str = Field(..., description="Format type: 'text', 'json', 'markdown', 'structured'")
    schema: Optional[Dict[str, Any]] = Field(None, description="JSON schema for structured output")
    example: Optional[str] = None


class AIBehavior(BaseModel):
    """AI behavior configuration for the agent."""
    # System prompt
    system_prompt: str = Field(..., description="Main system prompt for the agent")
    user_prompt: Optional[str] = Field(None, description="Default user prompt sent when agent is triggered (optional)")

    # Personality
    personality_traits: List[PersonalityTrait] = Field(default_factory=list)
    tone: str = Field("professional", description="Communication tone")

    # LLM Configuration
    default_provider: LLMProvider = LLMProvider.MISTRAL
    default_model: Optional[str] = None
    temperature: float = Field(0.7, ge=0, le=2)
    max_tokens: int = Field(2048, ge=1, le=32000)

    # Response formatting
    response_format: Optional[ResponseFormat] = None
    include_sources: bool = False
    include_confidence: bool = False

    # Context management
    context_window: int = Field(10, description="Number of messages to keep in context")
    include_system_context: bool = True

    # Guardrails
    enable_moderation: bool = True
    enable_classification: bool = True
    content_filters: List[str] = Field(default_factory=list)

    # Task-specific prompts
    task_prompts: Dict[str, str] = Field(
        default_factory=dict,
        description="Task-specific prompt templates"
    )


# ============== UI LAYOUT MODELS ==============

class LayoutSection(BaseModel):
    """A section of the agent interface."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    title: Optional[str] = None
    description: Optional[str] = None

    # Layout type
    layout_type: str = Field("column", description="Layout type: 'column', 'row', 'grid'")
    grid_columns: Optional[int] = Field(None, description="Number of grid columns")
    gap: str = Field("16px", description="Gap between components")

    # Components
    components: List[UIComponent] = Field(default_factory=list)

    # Visibility
    visible_when: Optional[Dict[str, Any]] = None

    # Styling
    style: ComponentStyle = Field(default_factory=ComponentStyle)


class UILayout(BaseModel):
    """Complete UI layout for the agent."""
    # Layout mode
    layout_mode: str = Field("sections", description="Layout mode: 'sections' (legacy) or 'dashboard' (grid-based)")

    # Header
    show_header: bool = True
    header_title: Optional[str] = None
    header_subtitle: Optional[str] = None
    header_icon: Optional[str] = None

    # Dashboard mode configuration (when layout_mode='dashboard')
    dashboard_config: Optional[DashboardConfig] = Field(default_factory=DashboardConfig)
    widgets: List[UIComponent] = Field(default_factory=list, description="Widgets for dashboard mode")

    # Main content (for sections mode - legacy)
    sections: List[LayoutSection] = Field(default_factory=list)

    # Sidebar (optional)
    show_sidebar: bool = False
    sidebar_sections: List[LayoutSection] = Field(default_factory=list)
    sidebar_position: str = Field("left", description="'left' or 'right'")
    sidebar_width: str = Field("300px")

    # Footer
    show_footer: bool = False
    footer_content: Optional[str] = None

    # Actions bar (buttons at bottom)
    show_actions: bool = True
    actions: List[UIComponent] = Field(default_factory=list)

    # Theme customization
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    custom_css: Optional[str] = None


# ============== MAIN AGENT DEFINITION ==============

class AgentMetadata(BaseModel):
    """Metadata for an agent."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
    version: str = Field("1.0.0")
    tags: List[str] = Field(default_factory=list)


class AgentDefinition(BaseModel):
    """
    Complete definition of a user-created agent.

    This is the main model that encompasses all aspects of an agent:
    - Identity (name, description, category)
    - Tools (what capabilities it has)
    - UI (how users interact with it)
    - AI Behavior (how it thinks and responds)
    - Workflows (how it processes requests)
    """
    # Identity
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    long_description: Optional[str] = Field(None, max_length=2000)
    icon: str = Field("fa fa-robot", description="Font Awesome icon class")
    category: str = Field("custom", description="Agent category")
    status: AgentStatus = AgentStatus.DRAFT
    agent_type: AgentType = Field(AgentType.DYNAMIC, description="Agent type: static, dynamic, or runtime")

    # Metadata
    metadata: AgentMetadata = Field(default_factory=AgentMetadata)

    # Tools Configuration
    tools: List[ToolConfiguration] = Field(default_factory=list)

    # UI Layout
    ui_layout: UILayout = Field(default_factory=UILayout)

    # AI Behavior
    ai_behavior: AIBehavior = Field(
        default_factory=lambda: AIBehavior(
            system_prompt="You are a helpful AI assistant."
        )
    )

    # Workflows
    workflows: List[Workflow] = Field(default_factory=list)

    # Configuration for deployed agent
    route: Optional[str] = Field(None, description="URL route for the agent page")
    requires_auth: bool = False
    allowed_roles: List[str] = Field(default_factory=list)

    def generate_route(self) -> str:
        """Generate a URL-safe route from the agent ID."""
        return f"/agent/{self.id}"


# ============== API REQUEST/RESPONSE MODELS ==============

class CreateAgentRequest(BaseModel):
    """Request to create a new agent."""
    name: str
    description: str
    category: Optional[str] = "custom"
    icon: Optional[str] = "fa fa-robot"


class UpdateAgentRequest(BaseModel):
    """Request to update an existing agent."""
    name: Optional[str] = None
    description: Optional[str] = None
    long_description: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None
    status: Optional[AgentStatus] = None
    tools: Optional[List[ToolConfiguration]] = None
    ui_layout: Optional[UILayout] = None
    ai_behavior: Optional[AIBehavior] = None
    workflows: Optional[List[Workflow]] = None


class AgentListResponse(BaseModel):
    """Response containing a list of agents."""
    agents: List[AgentDefinition]
    total: int
    page: int = 1
    page_size: int = 20


class AgentResponse(BaseModel):
    """Response containing a single agent."""
    success: bool
    agent: Optional[AgentDefinition] = None
    message: Optional[str] = None


# ============== AVAILABLE TOOLS REGISTRY ==============

class AvailableTool(BaseModel):
    """Definition of an available tool that can be used by agents."""
    id: str
    name: str
    description: str
    category: ToolCategory
    icon: str
    endpoint: str
    port: int

    # Input/Output schema
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)

    # Capabilities
    supports_streaming: bool = False
    supports_batch: bool = False
    requires_file_input: bool = False
    produces_file_output: bool = False

    # Requirements
    required_api_keys: List[str] = Field(default_factory=list)


class ToolsRegistry(BaseModel):
    """Registry of all available tools."""
    tools: List[AvailableTool] = Field(default_factory=list)


# Update forward references for nested models
UIComponent.model_rebuild()
WorkflowStep.model_rebuild()
