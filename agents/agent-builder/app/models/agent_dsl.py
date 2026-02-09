"""
Agent Descriptor Language (ADL) - Standardized agent definition schema.

This module defines the complete DSL for creating, importing, and exporting agents.
All agents (created via Agent Builder or descriptively) follow this exact structure.

The ADL Schema ensures:
- Consistent structure across all agents
- Easy import/export in YAML or JSON format
- Validation at every level
- Clear separation of concerns (business logic, UI, tools, connectors)
"""

from typing import Any, Dict, List, Literal, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
import uuid
import re


# ============== DSL VERSION ==============

ADL_VERSION = "1.0.0"
ADL_SCHEMA_URL = "https://agent-pf.io/schemas/adl/v1"


# ============== ENUMS ==============

class AgentCategory(str, Enum):
    """Standard agent categories."""
    CUSTOM = "custom"
    DOCUMENT_ANALYSIS = "document_analysis"
    DATA_PROCESSING = "data_processing"
    CONVERSATION = "conversation"
    AUTOMATION = "automation"
    MONITORING = "monitoring"
    INTEGRATION = "integration"
    ANALYTICS = "analytics"


class AgentStatus(str, Enum):
    """Agent lifecycle status."""
    DRAFT = "draft"
    ACTIVE = "active"
    BETA = "beta"
    DISABLED = "disabled"
    ARCHIVED = "archived"


class LLMProvider(str, Enum):
    """Supported LLM providers (connectors)."""
    MISTRAL = "mistral"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    PERPLEXITY = "perplexity"


class ToolCategory(str, Enum):
    """Tool categories."""
    DOCUMENT_PROCESSING = "document_processing"
    CONTENT_GENERATION = "content_generation"
    DATA_EXTRACTION = "data_extraction"
    SEARCH = "search"
    COMMUNICATION = "communication"
    GOVERNANCE = "governance"
    ANALYTICS = "analytics"
    INTEGRATION = "integration"


class ComponentType(str, Enum):
    """UI component types."""
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


class TriggerType(str, Enum):
    """Workflow trigger types."""
    USER_MESSAGE = "user_message"
    FORM_SUBMIT = "form_submit"
    FILE_UPLOAD = "file_upload"
    BUTTON_CLICK = "button_click"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"
    ON_LOAD = "on_load"


class WorkflowStepType(str, Enum):
    """Workflow step types."""
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


class ErrorHandling(str, Enum):
    """Error handling strategies."""
    STOP = "stop"
    CONTINUE = "continue"
    RETRY = "retry"
    FALLBACK = "fallback"


# ============== SECTION 1: AGENT IDENTITY ==============

class ADLMetadata(BaseModel):
    """
    DSL metadata section - Contains version and authorship information.
    """
    adl_version: str = Field(default=ADL_VERSION, description="ADL schema version")
    schema_url: Optional[str] = Field(default=ADL_SCHEMA_URL, description="Schema reference URL")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(None, description="Author identifier")
    version: str = Field(default="1.0.0", description="Agent version")
    tags: List[str] = Field(default_factory=list, description="Searchable tags")
    changelog: List[str] = Field(default_factory=list, description="Version history")


class ADLIdentity(BaseModel):
    """
    Agent identity section - Core identification and classification.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique agent identifier")
    name: str = Field(..., min_length=1, max_length=100, description="Agent display name")
    slug: Optional[str] = Field(None, description="URL-friendly identifier (auto-generated if not provided)")
    description: str = Field(..., min_length=1, max_length=500, description="Short description")
    long_description: Optional[str] = Field(None, max_length=5000, description="Detailed description (markdown)")
    icon: str = Field(default="fa fa-robot", description="Font Awesome icon class")
    category: AgentCategory = Field(default=AgentCategory.CUSTOM, description="Agent category")
    status: AgentStatus = Field(default=AgentStatus.DRAFT, description="Lifecycle status")

    @field_validator('slug', mode='before')
    @classmethod
    def generate_slug(cls, v, info):
        if v:
            return v
        name = info.data.get('name', '')
        if name:
            slug = name.lower()
            slug = re.sub(r'[^a-z0-9\s-]', '', slug)
            slug = re.sub(r'[\s_]+', '-', slug)
            slug = re.sub(r'-+', '-', slug)
            return slug.strip('-')
        return None


# ============== SECTION 2: BUSINESS LOGIC ==============

class PersonalityTrait(BaseModel):
    """AI personality trait definition."""
    name: str = Field(..., description="Trait name (e.g., 'professional', 'friendly')")
    intensity: float = Field(default=1.0, ge=0.0, le=2.0, description="Trait intensity (0-2)")


class ResponseFormat(BaseModel):
    """Expected response format configuration."""
    type: Literal["text", "json", "markdown", "structured"] = Field(default="text")
    json_schema: Optional[Dict[str, Any]] = Field(None, description="JSON schema for structured output")
    example: Optional[str] = Field(None, description="Example response")


class ModerationConfig(BaseModel):
    """Content moderation configuration."""
    enabled: bool = Field(default=True, description="Enable content moderation")
    provider: Optional[str] = Field(default="prompt-moderation", description="Moderation tool to use")
    block_on_fail: bool = Field(default=True, description="Block request if moderation fails")
    risk_threshold: str = Field(default="medium", description="Risk level threshold: low, medium, high")


class ClassificationConfig(BaseModel):
    """Content classification configuration."""
    enabled: bool = Field(default=True, description="Enable content classification")
    provider: Optional[str] = Field(default="content-classification", description="Classification tool")
    allowed_domains: List[str] = Field(default_factory=list, description="Allowed business domains")
    min_professional_score: float = Field(default=0.0, ge=0.0, le=1.0)


class ADLBusinessLogic(BaseModel):
    """
    Business logic section - Defines what the agent does and how it behaves.
    This is the core "brain" of the agent.
    """
    # Core prompts
    system_prompt: str = Field(..., description="Main system prompt defining agent behavior")
    user_prompt_template: Optional[str] = Field(
        None,
        description="Default user prompt template (supports {{variable}} placeholders)"
    )

    # Personality
    personality_traits: List[PersonalityTrait] = Field(default_factory=list)
    tone: str = Field(default="professional", description="Communication tone")
    language: str = Field(default="auto", description="Response language (auto, en, fr, etc.)")

    # LLM Configuration (Connector settings)
    llm_provider: LLMProvider = Field(default=LLMProvider.MISTRAL, description="Default LLM provider")
    llm_model: Optional[str] = Field(None, description="Specific model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="LLM temperature")
    max_tokens: int = Field(default=2048, ge=1, le=128000, description="Max response tokens")
    top_p: Optional[float] = Field(None, ge=0.0, le=1.0)
    top_k: Optional[int] = Field(None, ge=1)

    # Context management
    context_window_messages: int = Field(default=10, ge=0, description="Messages to keep in context")
    include_system_context: bool = Field(default=True)

    # Response configuration
    response_format: Optional[ResponseFormat] = Field(None)
    include_sources: bool = Field(default=False, description="Include source citations")
    include_confidence: bool = Field(default=False, description="Include confidence scores")
    streaming_enabled: bool = Field(default=True, description="Enable streaming responses")

    # Governance
    moderation: ModerationConfig = Field(default_factory=ModerationConfig)
    classification: ClassificationConfig = Field(default_factory=ClassificationConfig)

    # Task-specific prompts (for different scenarios)
    task_prompts: Dict[str, str] = Field(
        default_factory=dict,
        description="Named prompt templates for specific tasks"
    )

    # Instructions and constraints
    instructions: List[str] = Field(
        default_factory=list,
        description="Specific instructions/rules for the agent"
    )
    constraints: List[str] = Field(
        default_factory=list,
        description="Things the agent should NOT do"
    )


# ============== SECTION 3: TOOLS CONFIGURATION ==============

class ToolParameterMapping(BaseModel):
    """Mapping configuration for a tool parameter."""
    name: str = Field(..., description="Parameter name in the tool")
    source: Literal["input", "constant", "variable", "previous_output", "context"] = Field(
        ...,
        description="Where the value comes from"
    )
    value: Optional[Any] = Field(None, description="Constant value or variable reference")
    input_component: Optional[str] = Field(None, description="UI component name (if source=input)")
    transform: Optional[str] = Field(None, description="Transformation expression (e.g., 'upper()', 'json.loads()')")
    required: bool = Field(default=True)


class ADLToolConfig(BaseModel):
    """
    Configuration for a single tool used by the agent.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Configuration ID")
    tool_id: str = Field(..., description="ID of the tool from the registry")
    name: str = Field(..., description="Display name for this tool usage")
    enabled: bool = Field(default=True)
    description: Optional[str] = Field(None, description="Why this tool is used in this agent")

    # Parameter mappings
    parameters: List[ToolParameterMapping] = Field(default_factory=list)

    # Output handling
    output_variable: Optional[str] = Field(None, description="Variable to store output")
    output_transform: Optional[str] = Field(None, description="Transform expression for output")

    # Error handling
    on_error: ErrorHandling = Field(default=ErrorHandling.CONTINUE)
    retry_count: int = Field(default=0, ge=0, le=5)
    retry_delay_ms: int = Field(default=1000, ge=0)
    fallback_value: Optional[Any] = Field(None, description="Value to use on error")

    # Execution settings
    timeout_ms: int = Field(default=30000, ge=1000, le=300000)
    async_execution: bool = Field(default=False, description="Run asynchronously")


class ADLTools(BaseModel):
    """
    Tools section - All tools used by the agent.
    """
    tools: List[ADLToolConfig] = Field(default_factory=list, description="List of tool configurations")

    # Global tool settings
    default_error_handling: ErrorHandling = Field(default=ErrorHandling.CONTINUE)
    parallel_execution: bool = Field(default=False, description="Execute independent tools in parallel")
    max_parallel_tools: int = Field(default=3, ge=1, le=10)


# ============== SECTION 4: UI COMPONENTS (GRAPHICAL BRICKS) ==============

class ValidationRule(BaseModel):
    """Validation rule for form inputs."""
    type: Literal["required", "min", "max", "minLength", "maxLength", "pattern", "email", "custom"] = Field(...)
    value: Optional[Any] = Field(None, description="Validation value")
    message: str = Field(..., description="Error message to display")
    custom_validator: Optional[str] = Field(None, description="Custom validation expression")


class SelectOption(BaseModel):
    """Option for select/radio components."""
    value: str
    label: str
    disabled: bool = False
    icon: Optional[str] = None
    description: Optional[str] = None


class ComponentStyle(BaseModel):
    """Styling options for UI components."""
    width: Optional[str] = None
    height: Optional[str] = None
    min_width: Optional[str] = None
    max_width: Optional[str] = None
    margin: Optional[str] = None
    padding: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    border: Optional[str] = None
    border_radius: Optional[str] = None
    box_shadow: Optional[str] = None
    custom_css: Optional[str] = None
    css_classes: List[str] = Field(default_factory=list)


class ConditionalVisibility(BaseModel):
    """Conditional visibility configuration."""
    field: str = Field(..., description="Field to check")
    operator: Literal["equals", "not_equals", "contains", "not_contains", "gt", "lt", "gte", "lte", "is_empty", "is_not_empty"] = Field(...)
    value: Optional[Any] = Field(None, description="Value to compare against")


class GridPosition(BaseModel):
    """Grid position for dashboard layout widgets."""
    x: int = Field(0, ge=0, description="Column position (0-based)")
    y: int = Field(0, ge=0, description="Row position (0-based)")
    w: int = Field(4, ge=1, le=12, description="Width in columns")
    h: int = Field(2, ge=1, description="Height in rows")


class DashboardConfig(BaseModel):
    """Configuration for dashboard grid layout."""
    columns: int = Field(12, ge=1, le=24, description="Number of grid columns")
    rowHeight: int = Field(80, ge=20, description="Height of each row in pixels")
    gap: int = Field(12, ge=0, description="Gap between widgets in pixels")


class ADLUIComponent(BaseModel):
    """
    Definition of a UI component (graphical brick) in the agent interface.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: ComponentType = Field(..., description="Component type")
    name: str = Field(..., description="Unique identifier name")
    label: Optional[str] = Field(None, description="Display label")
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    default_value: Optional[Any] = None

    # Validation
    required: bool = False
    disabled: bool = False
    readonly: bool = False
    validation_rules: List[ValidationRule] = Field(default_factory=list)

    # Options (for select/radio/checkbox)
    options: List[SelectOption] = Field(default_factory=list)
    options_source: Optional[str] = Field(None, description="Variable name for dynamic options")

    # File upload settings
    accept: Optional[str] = Field(None, description="Accepted file types (e.g., '.pdf,.doc')")
    max_size_mb: Optional[float] = None
    multiple: bool = False

    # Layout positioning
    grid_column: Optional[str] = None
    grid_row: Optional[str] = None
    order: int = 0
    flex: Optional[str] = None

    # Styling
    style: ComponentStyle = Field(default_factory=ComponentStyle)

    # Conditional visibility
    visible_when: Optional[ConditionalVisibility] = None
    hidden: bool = False

    # Nested components (for containers)
    children: List["ADLUIComponent"] = Field(default_factory=list)

    # Data binding
    data_source: Optional[str] = Field(None, description="Variable to bind to")
    auto_bind_output: bool = Field(default=False, description="Auto-bind agent output")
    output_key: Optional[str] = Field(None, description="Key to extract from structured JSON output")
    on_change_action: Optional[str] = Field(None, description="Action on value change")

    # Button-specific
    button_action: Optional[Literal["trigger_agent", "submit_form", "reset_form", "navigate", "custom"]] = None
    button_variant: Optional[Literal["primary", "secondary", "success", "warning", "danger", "link"]] = None
    is_trigger_button: bool = False
    navigate_to: Optional[str] = Field(None, description="URL for navigate action")
    custom_action: Optional[str] = Field(None, description="Custom action handler name")

    # Chart-specific
    chart_config: Optional[Dict[str, Any]] = Field(None, description="Chart.js configuration")

    # Dashboard grid position (for layout_mode='dashboard')
    gridPosition: Optional[GridPosition] = Field(None, description="Position and size on the dashboard grid")


# Update forward reference
ADLUIComponent.model_rebuild()


class ADLLayoutSection(BaseModel):
    """A section of the agent interface."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Section identifier")
    title: Optional[str] = Field(None, description="Section title")
    description: Optional[str] = None
    icon: Optional[str] = None

    # Layout configuration
    layout_type: Literal["column", "row", "grid"] = Field(default="column")
    grid_columns: Optional[int] = Field(None, ge=1, le=12)
    gap: str = Field(default="16px")
    align_items: Optional[Literal["start", "center", "end", "stretch"]] = None
    justify_content: Optional[Literal["start", "center", "end", "space-between", "space-around"]] = None

    # Components
    components: List[ADLUIComponent] = Field(default_factory=list)

    # Visibility
    visible_when: Optional[ConditionalVisibility] = None
    collapsible: bool = False
    collapsed_by_default: bool = False

    # Styling
    style: ComponentStyle = Field(default_factory=ComponentStyle)


class ADLUILayout(BaseModel):
    """
    Complete UI layout definition - How the agent interface looks.
    """
    # Layout mode
    layout_mode: Literal["sections", "dashboard"] = Field(default="sections", description="Layout mode: 'sections' (legacy) or 'dashboard' (grid-based)")

    # Header
    show_header: bool = True
    header_title: Optional[str] = None
    header_subtitle: Optional[str] = None
    header_icon: Optional[str] = None
    header_actions: List[ADLUIComponent] = Field(default_factory=list, description="Header action buttons")

    # Dashboard mode configuration (when layout_mode='dashboard')
    dashboard_config: Optional[DashboardConfig] = Field(default_factory=DashboardConfig)
    widgets: List[ADLUIComponent] = Field(default_factory=list, description="Widgets for dashboard mode")

    # Main content (for sections mode - legacy)
    sections: List[ADLLayoutSection] = Field(default_factory=list)

    # Sidebar
    show_sidebar: bool = False
    sidebar_position: Literal["left", "right"] = Field(default="left")
    sidebar_width: str = Field(default="300px")
    sidebar_collapsible: bool = False
    sidebar_sections: List[ADLLayoutSection] = Field(default_factory=list)

    # Footer
    show_footer: bool = False
    footer_content: Optional[str] = None

    # Actions bar (bottom buttons)
    show_actions: bool = True
    actions: List[ADLUIComponent] = Field(default_factory=list)
    actions_position: Literal["left", "center", "right", "space-between"] = Field(default="right")

    # Theme
    theme: Literal["light", "dark", "auto"] = Field(default="auto")
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    custom_css: Optional[str] = None


# ============== SECTION 5: CONNECTORS ==============

class ADLConnectorConfig(BaseModel):
    """
    Configuration for an LLM connector.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: LLMProvider = Field(..., description="LLM provider")
    name: str = Field(..., description="Display name")
    description: Optional[str] = None

    # Connection settings
    endpoint_url: Optional[str] = Field(None, description="Custom endpoint URL")
    api_key_env: Optional[str] = Field(None, description="Environment variable for API key")

    # Model settings
    model: Optional[str] = Field(None, description="Specific model to use")
    fallback_model: Optional[str] = Field(None, description="Model to use if primary fails")

    # Default parameters
    default_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    default_max_tokens: int = Field(default=2048, ge=1)

    # Rate limiting
    requests_per_minute: Optional[int] = Field(None, ge=1)
    tokens_per_minute: Optional[int] = Field(None, ge=1)

    # Retry configuration
    retry_on_error: bool = True
    max_retries: int = Field(default=3, ge=0, le=10)
    retry_delay_ms: int = Field(default=1000, ge=0)

    # Timeout
    timeout_ms: int = Field(default=60000, ge=1000, le=300000)

    # Priority (for fallback ordering)
    priority: int = Field(default=0, description="Lower = higher priority")


class ADLConnectors(BaseModel):
    """
    Connectors section - LLM provider configurations.
    """
    default_connector: str = Field(..., description="ID of the default connector to use")
    connectors: List[ADLConnectorConfig] = Field(default_factory=list)

    # Fallback behavior
    enable_fallback: bool = Field(default=True, description="Enable automatic fallback to other connectors")
    fallback_order: List[str] = Field(default_factory=list, description="Connector IDs in fallback order")


# ============== SECTION 6: WORKFLOWS ==============

class WorkflowCondition(BaseModel):
    """Condition for workflow branching."""
    variable: str = Field(..., description="Variable to evaluate")
    operator: Literal["eq", "ne", "gt", "lt", "gte", "lte", "contains", "not_contains", "is_empty", "is_not_empty", "matches"] = Field(...)
    value: Any = Field(..., description="Value to compare against")
    and_conditions: List["WorkflowCondition"] = Field(default_factory=list)
    or_conditions: List["WorkflowCondition"] = Field(default_factory=list)


WorkflowCondition.model_rebuild()


class ADLWorkflowStep(BaseModel):
    """A step in the agent workflow."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Step name")
    type: WorkflowStepType = Field(..., description="Step type")
    description: Optional[str] = None

    # For LLM calls
    prompt_template: Optional[str] = None
    system_prompt_override: Optional[str] = None
    connector_id: Optional[str] = Field(None, description="Override default connector")
    temperature_override: Optional[float] = None
    max_tokens_override: Optional[int] = None

    # For tool calls
    tool_config_id: Optional[str] = Field(None, description="Reference to tool configuration")

    # For conditions
    condition: Optional[WorkflowCondition] = None
    on_true: Optional[str] = Field(None, description="Next step if true")
    on_false: Optional[str] = Field(None, description="Next step if false")

    # For loops
    loop_variable: Optional[str] = Field(None, description="Variable to iterate over")
    loop_item_name: Optional[str] = Field(default="item", description="Name for current item")
    loop_index_name: Optional[str] = Field(default="index", description="Name for current index")
    loop_body: List["ADLWorkflowStep"] = Field(default_factory=list)
    max_iterations: Optional[int] = Field(None, ge=1, le=1000)

    # For parallel execution
    parallel_steps: List["ADLWorkflowStep"] = Field(default_factory=list)
    wait_for_all: bool = Field(default=True, description="Wait for all parallel steps")

    # For user input
    input_components: List[str] = Field(default_factory=list, description="Component names to wait for")
    input_timeout_ms: Optional[int] = Field(None, description="Timeout for user input")

    # For data transform
    transform_expression: Optional[str] = Field(None, description="Transformation expression")

    # For set_variable
    variable_name: Optional[str] = None
    variable_value: Optional[Any] = None

    # For HTTP request
    http_url: Optional[str] = None
    http_method: Optional[Literal["GET", "POST", "PUT", "DELETE", "PATCH"]] = None
    http_headers: Dict[str, str] = Field(default_factory=dict)
    http_body: Optional[Any] = None

    # Flow control
    next_step: Optional[str] = Field(None, description="ID of next step")

    # Output
    output_variable: Optional[str] = None

    # Error handling
    on_error: ErrorHandling = Field(default=ErrorHandling.STOP)
    error_handler_step: Optional[str] = None


ADLWorkflowStep.model_rebuild()


class ADLWorkflow(BaseModel):
    """Complete workflow definition."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., description="Workflow name")
    description: Optional[str] = None
    enabled: bool = True

    # Trigger
    trigger: TriggerType = Field(..., description="What triggers this workflow")
    trigger_config: Dict[str, Any] = Field(default_factory=dict, description="Trigger-specific configuration")

    # Steps
    steps: List[ADLWorkflowStep] = Field(default_factory=list)
    entry_step: Optional[str] = Field(None, description="First step ID")

    # Variables
    initial_variables: Dict[str, Any] = Field(default_factory=dict)

    # Error handling
    global_error_handler: Optional[str] = Field(None, description="Step ID for errors")

    # Timeout
    timeout_ms: Optional[int] = Field(None, description="Total workflow timeout")


class ADLWorkflows(BaseModel):
    """Workflows section."""
    workflows: List[ADLWorkflow] = Field(default_factory=list)
    default_workflow: Optional[str] = Field(None, description="Default workflow ID")


# ============== SECTION 7: SECURITY & ACCESS ==============

class ADLSecurity(BaseModel):
    """Security and access control configuration."""
    requires_auth: bool = Field(default=False, description="Require authentication")
    allowed_roles: List[str] = Field(default_factory=list, description="Roles that can access")
    allowed_permissions: List[str] = Field(default_factory=list, description="Required permissions")

    # Rate limiting
    rate_limit_enabled: bool = False
    requests_per_minute: int = Field(default=60, ge=1)
    requests_per_hour: int = Field(default=1000, ge=1)

    # Input sanitization
    sanitize_inputs: bool = True
    max_input_length: int = Field(default=10000, ge=100)

    # Audit
    audit_logging: bool = True
    log_inputs: bool = False
    log_outputs: bool = False


# ============== SECTION 8: DEPLOYMENT ==============

class ADLDeployment(BaseModel):
    """Deployment configuration."""
    route: Optional[str] = Field(None, description="URL route for the agent")
    auto_route: bool = Field(default=True, description="Auto-generate route from name")

    # Environment
    environment: Literal["development", "staging", "production"] = Field(default="development")

    # Scaling
    min_instances: int = Field(default=1, ge=0)
    max_instances: int = Field(default=10, ge=1)

    # Feature flags
    feature_flags: Dict[str, bool] = Field(default_factory=dict)

    # Health check
    health_check_enabled: bool = True
    health_check_interval_ms: int = Field(default=30000, ge=1000)


# ============== MAIN DSL SCHEMA ==============

class AgentDSL(BaseModel):
    """
    Complete Agent Descriptor Language (ADL) Schema.

    This is the master definition that all agents must follow.
    It can be exported to YAML or JSON for:
    - Version control
    - Import/Export between systems
    - Declarative agent creation
    - API-based agent management

    Structure:
    1. metadata - DSL version and authorship
    2. identity - Agent identification
    3. business_logic - What the agent does (AI behavior)
    4. tools - Tools from the library
    5. ui - Graphical components (bricks)
    6. connectors - LLM providers
    7. workflows - Execution logic
    8. security - Access control
    9. deployment - Runtime configuration
    """
    # Section 1: Metadata
    metadata: ADLMetadata = Field(default_factory=ADLMetadata)

    # Section 2: Identity
    identity: ADLIdentity = Field(...)

    # Section 3: Business Logic
    business_logic: ADLBusinessLogic = Field(...)

    # Section 4: Tools
    tools: ADLTools = Field(default_factory=ADLTools)

    # Section 5: UI Layout
    ui: ADLUILayout = Field(default_factory=ADLUILayout)

    # Section 6: Connectors
    connectors: Optional[ADLConnectors] = Field(None, description="Custom connector config (uses defaults if not specified)")

    # Section 7: Workflows
    workflows: ADLWorkflows = Field(default_factory=ADLWorkflows)

    # Section 8: Security
    security: ADLSecurity = Field(default_factory=ADLSecurity)

    # Section 9: Deployment
    deployment: ADLDeployment = Field(default_factory=ADLDeployment)

    @model_validator(mode='after')
    def validate_references(self):
        """Validate internal references between sections."""
        # Validate workflow tool references
        tool_ids = {t.id for t in self.tools.tools}
        for workflow in self.workflows.workflows:
            for step in workflow.steps:
                if step.tool_config_id and step.tool_config_id not in tool_ids:
                    raise ValueError(f"Workflow step '{step.name}' references unknown tool config: {step.tool_config_id}")

        # Validate connector references if connectors defined
        if self.connectors:
            connector_ids = {c.id for c in self.connectors.connectors}
            if self.connectors.default_connector not in connector_ids:
                raise ValueError(f"Default connector '{self.connectors.default_connector}' not found in connectors list")

        return self

    def generate_route(self) -> str:
        """Generate URL route from identity."""
        slug = self.identity.slug or self.identity.name.lower().replace(' ', '-')
        return f"/agent/{slug}-{self.identity.id[:8]}"

    def to_yaml(self) -> str:
        """Export to YAML format."""
        import yaml
        return yaml.dump(self.model_dump(mode='json'), default_flow_style=False, allow_unicode=True, sort_keys=False)

    def to_json(self, indent: int = 2) -> str:
        """Export to JSON format."""
        return self.model_dump_json(indent=indent)

    @classmethod
    def from_yaml(cls, yaml_str: str) -> "AgentDSL":
        """Import from YAML format."""
        import yaml
        data = yaml.safe_load(yaml_str)
        return cls.model_validate(data)

    @classmethod
    def from_json(cls, json_str: str) -> "AgentDSL":
        """Import from JSON format."""
        import json
        data = json.loads(json_str)
        return cls.model_validate(data)


# ============== HELPER SCHEMAS FOR PARTIAL UPDATES ==============

class PartialBusinessLogicUpdate(BaseModel):
    """Partial update for business logic section."""
    system_prompt: Optional[str] = None
    user_prompt_template: Optional[str] = None
    personality_traits: Optional[List[PersonalityTrait]] = None
    tone: Optional[str] = None
    llm_provider: Optional[LLMProvider] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class PartialUIUpdate(BaseModel):
    """Partial update for UI section."""
    sections: Optional[List[ADLLayoutSection]] = None
    show_header: Optional[bool] = None
    header_title: Optional[str] = None
    header_subtitle: Optional[str] = None
    primary_color: Optional[str] = None


class PartialToolsUpdate(BaseModel):
    """Partial update for tools section."""
    tools: Optional[List[ADLToolConfig]] = None
    default_error_handling: Optional[ErrorHandling] = None


class PartialAgentUpdate(BaseModel):
    """Partial agent update - for API updates."""
    identity: Optional[ADLIdentity] = None
    business_logic: Optional[PartialBusinessLogicUpdate] = None
    tools: Optional[PartialToolsUpdate] = None
    ui: Optional[PartialUIUpdate] = None
    security: Optional[ADLSecurity] = None
    deployment: Optional[ADLDeployment] = None
