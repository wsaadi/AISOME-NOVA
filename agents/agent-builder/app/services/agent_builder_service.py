"""
Agent Builder Service - Core business logic for agent creation and management.

This service handles:
- Agent CRUD operations
- Validation of agent definitions
- Tool registry management
- Agent execution/testing
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid
import httpx

from ..models import (
    AgentDefinition,
    AgentStatus,
    CreateAgentRequest,
    UpdateAgentRequest,
    ToolConfiguration,
    UILayout,
    AIBehavior,
    Workflow,
    AvailableTool,
    ToolCategory,
    LayoutSection,
    UIComponent,
    ComponentType,
)
from ..storage import get_storage


class AgentBuilderService:
    """Service for building and managing custom agents."""

    # Registry of available tools in the platform
    AVAILABLE_TOOLS: List[AvailableTool] = [
        # Document Processing Tools
        AvailableTool(
            id="word-crud",
            name="Word Document Tool",
            description="Create, read, update, and delete Microsoft Word documents",
            category=ToolCategory.DOCUMENT_PROCESSING,
            icon="fa fa-file-word",
            endpoint="/api/v1/word",
            port=8001,
            input_schema={
                "type": "object",
                "properties": {
                    "action": {"type": "string", "enum": ["create", "read", "update", "delete"]},
                    "content": {"type": "string"},
                    "file_id": {"type": "string"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "file_id": {"type": "string"},
                    "content": {"type": "string"}
                }
            },
            produces_file_output=True
        ),
        AvailableTool(
            id="pdf-crud",
            name="PDF Document Tool",
            description="Create and manipulate PDF documents",
            category=ToolCategory.DOCUMENT_PROCESSING,
            icon="fa fa-file-pdf",
            endpoint="/api/v1/pdf",
            port=8003,
            input_schema={
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "content": {"type": "string"},
                    "file_id": {"type": "string"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "file_id": {"type": "string"}
                }
            },
            produces_file_output=True
        ),
        AvailableTool(
            id="excel-crud",
            name="Excel Spreadsheet Tool",
            description="Create and manipulate Excel spreadsheets",
            category=ToolCategory.DOCUMENT_PROCESSING,
            icon="fa fa-file-excel",
            endpoint="/api/v1/excel",
            port=8004,
            input_schema={
                "type": "object",
                "properties": {
                    "action": {"type": "string"},
                    "data": {"type": "array"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "success": {"type": "boolean"},
                    "file_id": {"type": "string"}
                }
            },
            produces_file_output=True
        ),
        AvailableTool(
            id="pptx-crud",
            name="PowerPoint Tool",
            description="Create and manipulate PowerPoint presentations",
            category=ToolCategory.DOCUMENT_PROCESSING,
            icon="fa fa-file-powerpoint",
            endpoint="/api/v1/pptx",
            port=8011,
            produces_file_output=True
        ),
        AvailableTool(
            id="document-extractor",
            name="Document Extractor",
            description="Extract text and data from various document formats",
            category=ToolCategory.DATA_EXTRACTION,
            icon="fa fa-file-import",
            endpoint="/api/v1/extract",
            port=8008,
            requires_file_input=True,
            input_schema={
                "type": "object",
                "properties": {
                    "file": {"type": "string", "format": "binary"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "metadata": {"type": "object"}
                }
            }
        ),

        # Search Tools
        AvailableTool(
            id="web-search",
            name="Web Search",
            description="Search the web for information",
            category=ToolCategory.SEARCH,
            icon="fa fa-search",
            endpoint="/api/v1/search",
            port=8002,
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "num_results": {"type": "integer", "default": 10}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "results": {"type": "array"}
                }
            }
        ),

        # File Tools
        AvailableTool(
            id="file-upload",
            name="File Upload",
            description="Upload and store files",
            category=ToolCategory.DOCUMENT_PROCESSING,
            icon="fa fa-upload",
            endpoint="/api/v1/upload",
            port=8007,
            requires_file_input=True
        ),

        # Image Analysis Tools
        AvailableTool(
            id="image-analysis",
            name="Image Analysis",
            description="Analyze images using AI vision capabilities to extract information, describe content, and detect objects",
            category=ToolCategory.DATA_EXTRACTION,
            icon="fa fa-image",
            endpoint="/api/v1/analyze",
            port=8021,
            requires_file_input=True,
            input_schema={
                "type": "object",
                "properties": {
                    "image": {"type": "string", "format": "binary", "description": "Image file to analyze"},
                    "prompt": {"type": "string", "description": "Optional prompt to guide the analysis"},
                    "analysis_type": {"type": "string", "enum": ["describe", "extract_text", "detect_objects", "custom"], "default": "describe"}
                },
                "required": ["image"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "description": {"type": "string", "description": "AI-generated description of the image"},
                    "extracted_text": {"type": "string", "description": "Text extracted from the image (OCR)"},
                    "detected_objects": {"type": "array", "items": {"type": "string"}, "description": "List of detected objects"},
                    "confidence": {"type": "number", "description": "Confidence score of the analysis"},
                    "metadata": {"type": "object", "description": "Image metadata (dimensions, format, etc.)"}
                }
            }
        ),

        # Governance Tools
        AvailableTool(
            id="prompt-moderation",
            name="Content Moderation",
            description="Moderate and filter content for safety",
            category=ToolCategory.GOVERNANCE,
            icon="fa fa-shield-alt",
            endpoint="/api/v1/moderate",
            port=8013,
            input_schema={
                "type": "object",
                "properties": {
                    "content": {"type": "string"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "approved": {"type": "boolean"},
                    "risk_level": {"type": "string"},
                    "flags": {"type": "array"}
                }
            }
        ),
        AvailableTool(
            id="content-classification",
            name="Content Classification",
            description="Classify content by type and domain",
            category=ToolCategory.GOVERNANCE,
            icon="fa fa-tags",
            endpoint="/api/v1/classify",
            port=8014,
            input_schema={
                "type": "object",
                "properties": {
                    "content": {"type": "string"}
                }
            },
            output_schema={
                "type": "object",
                "properties": {
                    "request_type": {"type": "string"},
                    "business_domain": {"type": "string"},
                    "professional_score": {"type": "number"}
                }
            }
        ),

        # Email Tools
        AvailableTool(
            id="eml-parser",
            name="Email Parser",
            description="Parse and extract data from email files",
            category=ToolCategory.DATA_EXTRACTION,
            icon="fa fa-envelope",
            endpoint="/api/v1/parse-email",
            port=8020,
            requires_file_input=True
        ),

        # Analytics Tools
        AvailableTool(
            id="dolibarr-connector",
            name="Dolibarr Connector",
            description="Connect to Dolibarr ERP for business data",
            category=ToolCategory.INTEGRATION,
            icon="fa fa-database",
            endpoint="/api/v1/dolibarr",
            port=8015,
            required_api_keys=["dolibarr_api_key"]
        ),
    ]

    # Default UI templates
    UI_TEMPLATES = {
        "chat": {
            "name": "Chat Interface",
            "description": "A conversational chat interface",
            "sections": [
                {
                    "name": "chat_section",
                    "layout_type": "column",
                    "components": [
                        {
                            "type": ComponentType.CHAT_INTERFACE,
                            "name": "main_chat",
                            "label": "Chat"
                        }
                    ]
                }
            ]
        },
        "form_analysis": {
            "name": "Form + Analysis",
            "description": "Upload form with analysis results",
            "sections": [
                {
                    "name": "input_section",
                    "title": "Input",
                    "layout_type": "column",
                    "components": [
                        {
                            "type": ComponentType.FILE_UPLOAD,
                            "name": "file_input",
                            "label": "Upload Document"
                        },
                        {
                            "type": ComponentType.TEXTAREA,
                            "name": "instructions",
                            "label": "Additional Instructions"
                        }
                    ]
                },
                {
                    "name": "output_section",
                    "title": "Results",
                    "layout_type": "column",
                    "components": [
                        {
                            "type": ComponentType.MARKDOWN_VIEWER,
                            "name": "analysis_result",
                            "label": "Analysis"
                        }
                    ]
                }
            ]
        },
        "dashboard": {
            "name": "Dashboard",
            "description": "Data visualization dashboard",
            "sections": [
                {
                    "name": "filters_section",
                    "layout_type": "row",
                    "components": [
                        {
                            "type": ComponentType.DATE_PICKER,
                            "name": "start_date",
                            "label": "Start Date"
                        },
                        {
                            "type": ComponentType.DATE_PICKER,
                            "name": "end_date",
                            "label": "End Date"
                        },
                        {
                            "type": ComponentType.SELECT,
                            "name": "category_filter",
                            "label": "Category"
                        }
                    ]
                },
                {
                    "name": "charts_section",
                    "layout_type": "grid",
                    "grid_columns": 2,
                    "components": [
                        {
                            "type": ComponentType.BAR_CHART,
                            "name": "bar_chart"
                        },
                        {
                            "type": ComponentType.PIE_CHART,
                            "name": "pie_chart"
                        },
                        {
                            "type": ComponentType.LINE_CHART,
                            "name": "line_chart",
                            "grid_column": "1 / 3"
                        }
                    ]
                }
            ]
        },
        "blank": {
            "name": "Blank Canvas",
            "description": "Start from scratch",
            "sections": []
        }
    }

    # AI personality presets
    PERSONALITY_PRESETS = {
        "professional": {
            "system_prompt": "You are a professional business assistant. Provide clear, concise, and actionable responses. Maintain a formal but friendly tone.",
            "tone": "professional",
            "traits": [
                {"trait": "professional", "intensity": 1.5},
                {"trait": "concise", "intensity": 1.2}
            ]
        },
        "friendly": {
            "system_prompt": "You are a friendly and helpful assistant. Be warm, approachable, and encouraging while still being informative.",
            "tone": "friendly",
            "traits": [
                {"trait": "friendly", "intensity": 1.5},
                {"trait": "encouraging", "intensity": 1.2}
            ]
        },
        "technical": {
            "system_prompt": "You are a technical expert assistant. Provide detailed, accurate technical information. Use appropriate technical terminology.",
            "tone": "technical",
            "traits": [
                {"trait": "technical", "intensity": 1.5},
                {"trait": "precise", "intensity": 1.3}
            ]
        },
        "creative": {
            "system_prompt": "You are a creative assistant. Think outside the box, offer innovative ideas, and help brainstorm solutions.",
            "tone": "creative",
            "traits": [
                {"trait": "creative", "intensity": 1.5},
                {"trait": "innovative", "intensity": 1.2}
            ]
        }
    }

    def __init__(self):
        self.storage = get_storage()

    async def create_agent(self, request: CreateAgentRequest) -> AgentDefinition:
        """Create a new agent with default configuration."""
        agent = AgentDefinition(
            id=str(uuid.uuid4()),
            name=request.name,
            description=request.description,
            category=request.category or "custom",
            icon=request.icon or "fa fa-robot",
            status=AgentStatus.DRAFT,
            ai_behavior=AIBehavior(
                system_prompt=f"You are {request.name}. {request.description}"
            ),
            ui_layout=UILayout(
                header_title=request.name,
                header_subtitle=request.description,
                sections=[]
            )
        )

        return await self.storage.save(agent)

    async def get_agent(self, agent_id: str) -> Optional[AgentDefinition]:
        """Get an agent by ID."""
        return await self.storage.get(agent_id)

    async def update_agent(
        self,
        agent_id: str,
        request: UpdateAgentRequest
    ) -> Optional[AgentDefinition]:
        """Update an existing agent."""
        agent = await self.storage.get(agent_id)
        if not agent:
            return None

        # Update fields
        update_data = request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(agent, field, value)

        return await self.storage.save(agent)

    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent."""
        return await self.storage.delete(agent_id)

    async def list_agents(
        self,
        category: Optional[str] = None,
        status: Optional[AgentStatus] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[AgentDefinition], int]:
        """List agents with optional filtering."""
        return await self.storage.list(
            category=category,
            status=status,
            search=search,
            page=page,
            page_size=page_size
        )

    async def duplicate_agent(
        self,
        agent_id: str,
        new_name: str
    ) -> Optional[AgentDefinition]:
        """Duplicate an existing agent."""
        return await self.storage.duplicate(agent_id, new_name)

    def get_available_tools(
        self,
        category: Optional[ToolCategory] = None
    ) -> List[AvailableTool]:
        """Get list of available tools."""
        if category:
            return [t for t in self.AVAILABLE_TOOLS if t.category == category]
        return self.AVAILABLE_TOOLS

    def get_tool_by_id(self, tool_id: str) -> Optional[AvailableTool]:
        """Get a specific tool by ID."""
        for tool in self.AVAILABLE_TOOLS:
            if tool.id == tool_id:
                return tool
        return None

    def get_ui_templates(self) -> Dict[str, Any]:
        """Get available UI templates."""
        return self.UI_TEMPLATES

    def get_personality_presets(self) -> Dict[str, Any]:
        """Get available personality presets."""
        return self.PERSONALITY_PRESETS

    async def validate_agent(self, agent: AgentDefinition) -> Dict[str, Any]:
        """
        Validate an agent definition.

        Returns validation result with errors and warnings.
        """
        errors = []
        warnings = []

        # Validate basic info
        if not agent.name:
            errors.append({"field": "name", "message": "Agent name is required"})

        if not agent.description:
            errors.append({"field": "description", "message": "Description is required"})

        # Validate AI behavior
        if not agent.ai_behavior.system_prompt:
            warnings.append({
                "field": "ai_behavior.system_prompt",
                "message": "No system prompt defined"
            })

        # Validate tools
        for tool_config in agent.tools:
            tool = self.get_tool_by_id(tool_config.tool_id)
            if not tool:
                errors.append({
                    "field": f"tools.{tool_config.id}",
                    "message": f"Tool '{tool_config.tool_id}' not found"
                })

        # Validate UI layout
        if not agent.ui_layout.sections:
            warnings.append({
                "field": "ui_layout.sections",
                "message": "No UI sections defined"
            })

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    async def activate_agent(self, agent_id: str) -> Optional[AgentDefinition]:
        """Activate an agent for use."""
        agent = await self.storage.get(agent_id)
        if not agent:
            return None

        # Validate before activation
        validation = await self.validate_agent(agent)
        if not validation["valid"]:
            raise ValueError(f"Agent validation failed: {validation['errors']}")

        agent.status = AgentStatus.ACTIVE
        return await self.storage.save(agent)

    async def deactivate_agent(self, agent_id: str) -> Optional[AgentDefinition]:
        """Deactivate an agent."""
        agent = await self.storage.get(agent_id)
        if not agent:
            return None

        agent.status = AgentStatus.DISABLED
        return await self.storage.save(agent)

    async def export_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Export an agent definition as JSON."""
        agent = await self.storage.get(agent_id)
        if not agent:
            return None

        return agent.model_dump()

    async def import_agent(self, data: Dict[str, Any]) -> AgentDefinition:
        """Import an agent from JSON."""
        # Generate new ID to avoid conflicts
        data["id"] = str(uuid.uuid4())
        data["status"] = AgentStatus.DRAFT.value
        data["route"] = None

        # Reset metadata
        if "metadata" in data:
            data["metadata"]["created_at"] = datetime.utcnow().isoformat()
            data["metadata"]["updated_at"] = datetime.utcnow().isoformat()

        agent = AgentDefinition.model_validate(data)
        return await self.storage.save(agent)

    def get_component_types(self) -> List[Dict[str, Any]]:
        """Get all available UI component types with metadata."""
        components = []
        for comp_type in ComponentType:
            category = self._get_component_category(comp_type)
            components.append({
                "type": comp_type.value,
                "name": comp_type.value.replace("_", " ").title(),
                "category": category,
                "icon": self._get_component_icon(comp_type),
                "description": self._get_component_description(comp_type)
            })
        return components

    def _get_component_category(self, comp_type: ComponentType) -> str:
        """Get the category for a component type."""
        input_types = {
            ComponentType.TEXT_INPUT, ComponentType.TEXTAREA,
            ComponentType.NUMBER_INPUT, ComponentType.EMAIL_INPUT,
            ComponentType.PASSWORD_INPUT, ComponentType.DATE_PICKER,
            ComponentType.TIME_PICKER, ComponentType.DATETIME_PICKER,
            ComponentType.SELECT, ComponentType.MULTI_SELECT,
            ComponentType.CHECKBOX, ComponentType.RADIO_GROUP,
            ComponentType.SLIDER, ComponentType.TOGGLE
        }
        file_types = {
            ComponentType.FILE_UPLOAD, ComponentType.IMAGE_UPLOAD,
            ComponentType.DOCUMENT_UPLOAD, ComponentType.DOCUMENT_REPOSITORY
        }
        display_types = {
            ComponentType.TEXT_DISPLAY, ComponentType.MARKDOWN_VIEWER,
            ComponentType.PDF_VIEWER, ComponentType.IMAGE_VIEWER,
            ComponentType.CODE_VIEWER
        }
        chart_types = {
            ComponentType.BAR_CHART, ComponentType.LINE_CHART,
            ComponentType.PIE_CHART, ComponentType.DONUT_CHART
        }
        layout_types = {
            ComponentType.CARD, ComponentType.TABS,
            ComponentType.ACCORDION, ComponentType.DIVIDER,
            ComponentType.SPACER, ComponentType.GRID
        }

        if comp_type in input_types:
            return "input"
        elif comp_type in file_types:
            return "file"
        elif comp_type in display_types:
            return "display"
        elif comp_type in chart_types:
            return "chart"
        elif comp_type in layout_types:
            return "layout"
        else:
            return "interactive"

    def _get_component_icon(self, comp_type: ComponentType) -> str:
        """Get the icon for a component type."""
        icons = {
            ComponentType.TEXT_INPUT: "fa fa-font",
            ComponentType.TEXTAREA: "fa fa-align-left",
            ComponentType.NUMBER_INPUT: "fa fa-hashtag",
            ComponentType.EMAIL_INPUT: "fa fa-envelope",
            ComponentType.PASSWORD_INPUT: "fa fa-key",
            ComponentType.DATE_PICKER: "fa fa-calendar",
            ComponentType.TIME_PICKER: "fa fa-clock",
            ComponentType.SELECT: "fa fa-list",
            ComponentType.CHECKBOX: "fa fa-check-square",
            ComponentType.RADIO_GROUP: "fa fa-dot-circle",
            ComponentType.SLIDER: "fa fa-sliders-h",
            ComponentType.TOGGLE: "fa fa-toggle-on",
            ComponentType.FILE_UPLOAD: "fa fa-upload",
            ComponentType.IMAGE_UPLOAD: "fa fa-image",
            ComponentType.DOCUMENT_UPLOAD: "fa fa-file-upload",
            ComponentType.DOCUMENT_REPOSITORY: "fa fa-folder-open",
            ComponentType.TEXT_DISPLAY: "fa fa-text-width",
            ComponentType.MARKDOWN_VIEWER: "fa fa-markdown",
            ComponentType.PDF_VIEWER: "fa fa-file-pdf",
            ComponentType.IMAGE_VIEWER: "fa fa-image",
            ComponentType.CODE_VIEWER: "fa fa-code",
            ComponentType.BAR_CHART: "fa fa-chart-bar",
            ComponentType.LINE_CHART: "fa fa-chart-line",
            ComponentType.PIE_CHART: "fa fa-chart-pie",
            ComponentType.DONUT_CHART: "fa fa-circle-notch",
            ComponentType.CHAT_INTERFACE: "fa fa-comments",
            ComponentType.BUTTON: "fa fa-square",
            ComponentType.BUTTON_GROUP: "fa fa-th-large",
            ComponentType.PROGRESS_BAR: "fa fa-tasks",
            ComponentType.CARD: "fa fa-square",
            ComponentType.TABS: "fa fa-folder",
            ComponentType.ACCORDION: "fa fa-bars",
            ComponentType.DIVIDER: "fa fa-minus",
            ComponentType.SPACER: "fa fa-arrows-alt-v",
            ComponentType.GRID: "fa fa-th",
            ComponentType.DATA_TABLE: "fa fa-table",
            ComponentType.LIST: "fa fa-list-ul",
            ComponentType.TREE_VIEW: "fa fa-sitemap",
        }
        return icons.get(comp_type, "fa fa-puzzle-piece")

    def _get_component_description(self, comp_type: ComponentType) -> str:
        """Get the description for a component type."""
        descriptions = {
            ComponentType.TEXT_INPUT: "Single line text input field",
            ComponentType.TEXTAREA: "Multi-line text input area",
            ComponentType.NUMBER_INPUT: "Numeric input field",
            ComponentType.EMAIL_INPUT: "Email address input with validation",
            ComponentType.PASSWORD_INPUT: "Secure password input field",
            ComponentType.DATE_PICKER: "Date selection calendar",
            ComponentType.TIME_PICKER: "Time selection input",
            ComponentType.SELECT: "Dropdown selection list",
            ComponentType.MULTI_SELECT: "Multiple selection dropdown",
            ComponentType.CHECKBOX: "Boolean checkbox",
            ComponentType.RADIO_GROUP: "Single choice radio buttons",
            ComponentType.SLIDER: "Range slider input",
            ComponentType.TOGGLE: "On/off toggle switch",
            ComponentType.FILE_UPLOAD: "File upload with drag and drop",
            ComponentType.IMAGE_UPLOAD: "Image upload with preview",
            ComponentType.DOCUMENT_UPLOAD: "Document upload (PDF, Word, etc.)",
            ComponentType.DOCUMENT_REPOSITORY: "Repository for PDF, Word, Excel, PowerPoint, PNG, JPG files",
            ComponentType.TEXT_DISPLAY: "Display static or dynamic text",
            ComponentType.MARKDOWN_VIEWER: "Render markdown content",
            ComponentType.PDF_VIEWER: "Display PDF documents",
            ComponentType.IMAGE_VIEWER: "Display images",
            ComponentType.CODE_VIEWER: "Display code with syntax highlighting",
            ComponentType.BAR_CHART: "Bar chart visualization",
            ComponentType.LINE_CHART: "Line chart for trends",
            ComponentType.PIE_CHART: "Pie chart for proportions",
            ComponentType.DONUT_CHART: "Donut chart with center content",
            ComponentType.CHAT_INTERFACE: "Interactive chat interface",
            ComponentType.BUTTON: "Clickable action button",
            ComponentType.BUTTON_GROUP: "Group of related buttons",
            ComponentType.PROGRESS_BAR: "Progress indicator",
            ComponentType.CARD: "Container card with header",
            ComponentType.TABS: "Tabbed content container",
            ComponentType.ACCORDION: "Expandable content sections",
            ComponentType.DIVIDER: "Visual separator line",
            ComponentType.SPACER: "Empty space for layout",
            ComponentType.GRID: "Grid layout container",
            ComponentType.DATA_TABLE: "Data table with sorting/filtering",
            ComponentType.LIST: "Simple list display",
            ComponentType.TREE_VIEW: "Hierarchical tree view",
        }
        return descriptions.get(comp_type, "UI component")


# Singleton service instance
_service: Optional[AgentBuilderService] = None


def get_agent_builder_service() -> AgentBuilderService:
    """Get the agent builder service singleton."""
    global _service
    if _service is None:
        _service = AgentBuilderService()
    return _service
