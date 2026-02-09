"""
Agent DSL Service - Core service for Agent Descriptor Language operations.

This service handles:
- Parsing and validation of ADL definitions
- Conversion between ADL and internal AgentDefinition format
- Import/Export operations (YAML, JSON)
- DSL schema management
- Agent template generation
"""

from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime
import uuid
import yaml
import json
import re
from pathlib import Path

from ..models.agent_dsl import (
    ADL_VERSION,
    AgentDSL,
    ADLMetadata,
    ADLIdentity,
    ADLBusinessLogic,
    ADLTools,
    ADLToolConfig,
    ToolParameterMapping,
    ADLUILayout,
    ADLLayoutSection,
    ADLUIComponent,
    ADLConnectors,
    ADLConnectorConfig,
    ADLWorkflows,
    ADLWorkflow,
    ADLWorkflowStep,
    ADLSecurity,
    ADLDeployment,
    AgentCategory,
    AgentStatus,
    LLMProvider,
    ComponentType,
    TriggerType,
    WorkflowStepType,
    ErrorHandling,
    PersonalityTrait,
    ResponseFormat,
    ModerationConfig,
    ClassificationConfig,
    ValidationRule,
    SelectOption,
    ComponentStyle,
    ConditionalVisibility,
    WorkflowCondition,
    PartialAgentUpdate,
)

from ..models import (
    AgentDefinition as LegacyAgentDefinition,
    AgentStatus as LegacyAgentStatus,
    ToolConfiguration as LegacyToolConfiguration,
    ToolParameter as LegacyToolParameter,
    UILayout as LegacyUILayout,
    LayoutSection as LegacyLayoutSection,
    UIComponent as LegacyUIComponent,
    AIBehavior as LegacyAIBehavior,
    Workflow as LegacyWorkflow,
    WorkflowStep as LegacyWorkflowStep,
    ComponentType as LegacyComponentType,
    LLMProvider as LegacyLLMProvider,
    TriggerType as LegacyTriggerType,
    WorkflowStepType as LegacyWorkflowStepType,
    PersonalityTrait as LegacyPersonalityTrait,
    ValidationRule as LegacyValidationRule,
    SelectOption as LegacySelectOption,
    ComponentStyle as LegacyComponentStyle,
    WorkflowCondition as LegacyWorkflowCondition,
    DashboardConfig as LegacyDashboardConfig,
    GridPosition as LegacyGridPosition,
    ChartConfig as LegacyChartConfig,
)


class ValidationError:
    """Represents a validation error."""
    def __init__(self, path: str, message: str, severity: str = "error"):
        self.path = path
        self.message = message
        self.severity = severity  # "error" or "warning"

    def to_dict(self) -> Dict[str, str]:
        return {
            "path": self.path,
            "message": self.message,
            "severity": self.severity
        }


class ValidationResult:
    """Result of DSL validation."""
    def __init__(self):
        self.errors: List[ValidationError] = []
        self.warnings: List[ValidationError] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, path: str, message: str):
        self.errors.append(ValidationError(path, message, "error"))

    def add_warning(self, path: str, message: str):
        self.warnings.append(ValidationError(path, message, "warning"))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.is_valid,
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings]
        }


class AgentDSLService:
    """
    Service for Agent Descriptor Language operations.

    Provides:
    - DSL parsing and validation
    - Format conversion (YAML <-> JSON <-> Internal)
    - Legacy format migration
    - Template generation
    - Import/Export functionality
    """

    # Available tools in the platform (must match agent_builder_service)
    AVAILABLE_TOOL_IDS = [
        "word-crud", "pdf-crud", "excel-crud", "pptx-crud",
        "document-extractor", "web-search", "file-upload",
        "prompt-moderation", "content-classification",
        "eml-parser", "dolibarr-connector"
    ]

    # Default connector configurations
    DEFAULT_CONNECTORS = {
        "mistral": ADLConnectorConfig(
            id="mistral-default",
            provider=LLMProvider.MISTRAL,
            name="Mistral AI",
            description="Default Mistral connector",
            model="mistral-large-latest",
            default_temperature=0.7,
            default_max_tokens=2048
        ),
        "openai": ADLConnectorConfig(
            id="openai-default",
            provider=LLMProvider.OPENAI,
            name="OpenAI GPT",
            description="Default OpenAI connector",
            model="gpt-4",
            default_temperature=0.7,
            default_max_tokens=2048
        ),
        "anthropic": ADLConnectorConfig(
            id="anthropic-default",
            provider=LLMProvider.ANTHROPIC,
            name="Anthropic Claude",
            description="Default Anthropic connector",
            model="claude-3-5-sonnet-20241022",
            default_temperature=0.7,
            default_max_tokens=2048
        ),
        "gemini": ADLConnectorConfig(
            id="gemini-default",
            provider=LLMProvider.GEMINI,
            name="Google Gemini",
            description="Default Gemini connector",
            model="gemini-pro",
            default_temperature=0.7,
            default_max_tokens=2048
        ),
        "perplexity": ADLConnectorConfig(
            id="perplexity-default",
            provider=LLMProvider.PERPLEXITY,
            name="Perplexity AI",
            description="Default Perplexity connector",
            model="sonar-pro",
            default_temperature=0.7,
            default_max_tokens=2048
        )
    }

    def __init__(self):
        self.templates_dir = Path(__file__).parent.parent / "templates" / "agents"

    # ============== PARSING ==============

    def parse_yaml(self, yaml_content: str) -> Tuple[Optional[AgentDSL], ValidationResult]:
        """
        Parse YAML content into AgentDSL.

        Returns:
            Tuple of (AgentDSL or None, ValidationResult)
        """
        result = ValidationResult()

        try:
            data = yaml.safe_load(yaml_content)
            if not isinstance(data, dict):
                result.add_error("root", "YAML content must be an object")
                return None, result

            agent = AgentDSL.model_validate(data)
            # Run additional validation
            self._validate_agent_dsl(agent, result)
            return agent, result

        except yaml.YAMLError as e:
            result.add_error("yaml", f"Invalid YAML syntax: {str(e)}")
            return None, result
        except Exception as e:
            result.add_error("validation", f"Validation error: {str(e)}")
            return None, result

    def parse_json(self, json_content: str) -> Tuple[Optional[AgentDSL], ValidationResult]:
        """
        Parse JSON content into AgentDSL.

        Returns:
            Tuple of (AgentDSL or None, ValidationResult)
        """
        result = ValidationResult()

        try:
            data = json.loads(json_content)
            if not isinstance(data, dict):
                result.add_error("root", "JSON content must be an object")
                return None, result

            agent = AgentDSL.model_validate(data)
            self._validate_agent_dsl(agent, result)
            return agent, result

        except json.JSONDecodeError as e:
            result.add_error("json", f"Invalid JSON syntax: {str(e)}")
            return None, result
        except Exception as e:
            result.add_error("validation", f"Validation error: {str(e)}")
            return None, result

    def _validate_agent_dsl(self, agent: AgentDSL, result: ValidationResult):
        """Run additional validation on parsed AgentDSL."""

        # Validate tool references
        for tool in agent.tools.tools:
            if tool.tool_id not in self.AVAILABLE_TOOL_IDS:
                result.add_warning(
                    f"tools.tools[{tool.id}].tool_id",
                    f"Unknown tool ID: {tool.tool_id}"
                )

        # Validate UI component references in workflows
        component_names = set()
        for section in agent.ui.sections:
            for comp in section.components:
                component_names.add(comp.name)
                self._collect_component_names(comp, component_names)

        for workflow in agent.workflows.workflows:
            for step in workflow.steps:
                for comp_name in step.input_components:
                    if comp_name not in component_names:
                        result.add_warning(
                            f"workflows.workflows[{workflow.id}].steps[{step.id}].input_components",
                            f"Referenced component not found: {comp_name}"
                        )

        # Validate workflow step references
        for workflow in agent.workflows.workflows:
            step_ids = {s.id for s in workflow.steps}
            for step in workflow.steps:
                if step.next_step and step.next_step not in step_ids:
                    result.add_error(
                        f"workflows.workflows[{workflow.id}].steps[{step.id}].next_step",
                        f"Referenced step not found: {step.next_step}"
                    )
                if step.on_true and step.on_true not in step_ids:
                    result.add_error(
                        f"workflows.workflows[{workflow.id}].steps[{step.id}].on_true",
                        f"Referenced step not found: {step.on_true}"
                    )
                if step.on_false and step.on_false not in step_ids:
                    result.add_error(
                        f"workflows.workflows[{workflow.id}].steps[{step.id}].on_false",
                        f"Referenced step not found: {step.on_false}"
                    )

    def _collect_component_names(self, component: ADLUIComponent, names: set):
        """Recursively collect component names."""
        names.add(component.name)
        for child in component.children:
            self._collect_component_names(child, names)

    # ============== EXPORT ==============

    def export_to_yaml(self, agent: AgentDSL) -> str:
        """Export AgentDSL to YAML format."""
        return agent.to_yaml()

    def export_to_json(self, agent: AgentDSL, indent: int = 2) -> str:
        """Export AgentDSL to JSON format."""
        return agent.to_json(indent=indent)

    def export_to_file(self, agent: AgentDSL, file_path: str, format: str = "yaml"):
        """Export AgentDSL to a file."""
        content = self.export_to_yaml(agent) if format == "yaml" else self.export_to_json(agent)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

    # ============== CONVERSION: LEGACY <-> DSL ==============

    def from_legacy_definition(self, legacy: LegacyAgentDefinition) -> AgentDSL:
        """
        Convert legacy AgentDefinition to new AgentDSL format.

        This allows seamless migration of existing agents.
        """
        # Convert metadata
        metadata = ADLMetadata(
            adl_version=ADL_VERSION,
            created_at=legacy.metadata.created_at,
            updated_at=legacy.metadata.updated_at,
            created_by=legacy.metadata.created_by,
            version=legacy.metadata.version,
            tags=legacy.metadata.tags
        )

        # Convert identity
        identity = ADLIdentity(
            id=legacy.id,
            name=legacy.name,
            description=legacy.description,
            long_description=legacy.long_description,
            icon=legacy.icon,
            category=AgentCategory(legacy.category) if legacy.category in [c.value for c in AgentCategory] else AgentCategory.CUSTOM,
            status=AgentStatus(legacy.status.value)
        )

        # Convert business logic
        business_logic = ADLBusinessLogic(
            system_prompt=legacy.ai_behavior.system_prompt,
            user_prompt_template=legacy.ai_behavior.user_prompt,
            personality_traits=[
                PersonalityTrait(name=t.trait, intensity=t.intensity)
                for t in legacy.ai_behavior.personality_traits
            ],
            tone=legacy.ai_behavior.tone,
            llm_provider=LLMProvider(legacy.ai_behavior.default_provider.value),
            llm_model=legacy.ai_behavior.default_model,
            temperature=legacy.ai_behavior.temperature,
            max_tokens=legacy.ai_behavior.max_tokens,
            context_window_messages=legacy.ai_behavior.context_window,
            include_system_context=legacy.ai_behavior.include_system_context,
            response_format=ResponseFormat(
                type=legacy.ai_behavior.response_format.type,
                json_schema=legacy.ai_behavior.response_format.schema,
                example=legacy.ai_behavior.response_format.example
            ) if legacy.ai_behavior.response_format else None,
            include_sources=legacy.ai_behavior.include_sources,
            include_confidence=legacy.ai_behavior.include_confidence,
            moderation=ModerationConfig(enabled=legacy.ai_behavior.enable_moderation),
            classification=ClassificationConfig(enabled=legacy.ai_behavior.enable_classification),
            task_prompts=legacy.ai_behavior.task_prompts
        )

        # Convert tools
        tools = ADLTools(
            tools=[
                ADLToolConfig(
                    id=t.id,
                    tool_id=t.tool_id,
                    name=t.tool_name,
                    enabled=t.enabled,
                    parameters=[
                        ToolParameterMapping(
                            name=p.name,
                            source=p.source,
                            value=p.value,
                            input_component=p.input_component,
                            transform=p.transform
                        )
                        for p in t.parameters
                    ],
                    output_variable=t.output_variable,
                    output_transform=t.output_transform,
                    on_error=ErrorHandling(t.on_error),
                    retry_count=t.retry_count,
                    fallback_value=t.fallback_value
                )
                for t in legacy.tools
            ]
        )

        # Convert UI layout
        ui = ADLUILayout(
            show_header=legacy.ui_layout.show_header,
            header_title=legacy.ui_layout.header_title,
            header_subtitle=legacy.ui_layout.header_subtitle,
            header_icon=legacy.ui_layout.header_icon,
            sections=[
                self._convert_legacy_section(s) for s in legacy.ui_layout.sections
            ],
            show_sidebar=legacy.ui_layout.show_sidebar,
            sidebar_position=legacy.ui_layout.sidebar_position,
            sidebar_width=legacy.ui_layout.sidebar_width,
            sidebar_sections=[
                self._convert_legacy_section(s) for s in legacy.ui_layout.sidebar_sections
            ],
            show_footer=legacy.ui_layout.show_footer,
            footer_content=legacy.ui_layout.footer_content,
            show_actions=legacy.ui_layout.show_actions,
            actions=[
                self._convert_legacy_component(a) for a in legacy.ui_layout.actions
            ],
            primary_color=legacy.ui_layout.primary_color,
            secondary_color=legacy.ui_layout.secondary_color,
            custom_css=legacy.ui_layout.custom_css
        )

        # Convert workflows
        workflows = ADLWorkflows(
            workflows=[
                ADLWorkflow(
                    id=w.id,
                    name=w.name,
                    description=w.description,
                    trigger=TriggerType(w.trigger.value),
                    trigger_config=w.trigger_config,
                    steps=[self._convert_legacy_workflow_step(s) for s in w.steps],
                    entry_step=w.entry_step,
                    initial_variables=w.variables,
                    global_error_handler=w.global_error_handler
                )
                for w in legacy.workflows
            ]
        )

        # Security
        security = ADLSecurity(
            requires_auth=legacy.requires_auth,
            allowed_roles=legacy.allowed_roles
        )

        # Deployment
        deployment = ADLDeployment(
            route=legacy.route
        )

        return AgentDSL(
            metadata=metadata,
            identity=identity,
            business_logic=business_logic,
            tools=tools,
            ui=ui,
            workflows=workflows,
            security=security,
            deployment=deployment
        )

    def _convert_legacy_section(self, section: LegacyLayoutSection) -> ADLLayoutSection:
        """Convert legacy layout section to DSL format."""
        return ADLLayoutSection(
            id=section.id,
            name=section.name,
            title=section.title,
            description=section.description,
            layout_type=section.layout_type,
            grid_columns=section.grid_columns,
            gap=section.gap,
            components=[
                self._convert_legacy_component(c) for c in section.components
            ],
            visible_when=ConditionalVisibility(
                field=section.visible_when.get('field', ''),
                operator=section.visible_when.get('operator', 'equals'),
                value=section.visible_when.get('value')
            ) if section.visible_when else None,
            style=ComponentStyle(
                width=section.style.width,
                height=section.style.height,
                margin=section.style.margin,
                padding=section.style.padding,
                background_color=section.style.background_color,
                text_color=section.style.text_color,
                border_radius=section.style.border_radius,
                custom_css=section.style.custom_css
            )
        )

    def _convert_legacy_component(self, comp: LegacyUIComponent) -> ADLUIComponent:
        """Convert legacy UI component to DSL format."""
        return ADLUIComponent(
            id=comp.id,
            type=ComponentType(comp.type.value),
            name=comp.name,
            label=comp.label,
            placeholder=comp.placeholder,
            help_text=comp.help_text,
            default_value=comp.default_value,
            required=comp.required,
            validation_rules=[
                ValidationRule(
                    type=r.type,
                    value=r.value,
                    message=r.message
                )
                for r in comp.validation_rules
            ],
            options=[
                SelectOption(
                    value=o.value,
                    label=o.label,
                    disabled=o.disabled,
                    icon=o.icon
                )
                for o in comp.options
            ],
            accept=comp.accept,
            max_size_mb=comp.max_size_mb,
            multiple=comp.multiple,
            grid_column=comp.grid_column,
            grid_row=comp.grid_row,
            order=comp.order,
            style=ComponentStyle(
                width=comp.style.width,
                height=comp.style.height,
                margin=comp.style.margin,
                padding=comp.style.padding,
                background_color=comp.style.background_color,
                text_color=comp.style.text_color,
                border_radius=comp.style.border_radius,
                custom_css=comp.style.custom_css
            ),
            visible_when=ConditionalVisibility(
                field=comp.visible_when.get('field', ''),
                operator=comp.visible_when.get('operator', 'equals'),
                value=comp.visible_when.get('value')
            ) if comp.visible_when else None,
            children=[
                self._convert_legacy_component(c) for c in comp.children
            ],
            data_source=comp.data_source,
            auto_bind_output=comp.auto_bind_output or False,
            output_key=getattr(comp, 'output_key', None),
            on_change_action=comp.on_change_action,
            button_action=comp.button_action,
            button_variant=comp.button_variant,
            is_trigger_button=comp.is_trigger_button or False
        )

    def _convert_legacy_workflow_step(self, step: LegacyWorkflowStep) -> ADLWorkflowStep:
        """Convert legacy workflow step to DSL format."""
        return ADLWorkflowStep(
            id=step.id,
            name=step.name,
            type=WorkflowStepType(step.type.value),
            description=step.description,
            prompt_template=step.prompt_template,
            system_prompt_override=step.system_prompt,
            connector_id=None,
            temperature_override=step.temperature,
            max_tokens_override=step.max_tokens,
            tool_config_id=step.tool_config_id,
            condition=WorkflowCondition(
                variable=step.condition.variable,
                operator=step.condition.operator,
                value=step.condition.value
            ) if step.condition else None,
            on_true=step.on_true,
            on_false=step.on_false,
            loop_variable=step.loop_variable,
            loop_body=[
                self._convert_legacy_workflow_step(s) for s in step.loop_body
            ],
            parallel_steps=[
                self._convert_legacy_workflow_step(s) for s in step.parallel_steps
            ],
            input_components=step.input_components,
            next_step=step.next_step,
            output_variable=step.output_variable
        )

    def to_legacy_definition(self, dsl: AgentDSL) -> LegacyAgentDefinition:
        """
        Convert AgentDSL to legacy AgentDefinition format.

        This maintains compatibility with existing code.
        """
        from ..models import AgentMetadata as LegacyAgentMetadata

        return LegacyAgentDefinition(
            id=dsl.identity.id,
            name=dsl.identity.name,
            description=dsl.identity.description,
            long_description=dsl.identity.long_description,
            icon=dsl.identity.icon,
            category=dsl.identity.category.value,
            status=LegacyAgentStatus(dsl.identity.status.value),
            metadata=LegacyAgentMetadata(
                created_at=dsl.metadata.created_at,
                updated_at=dsl.metadata.updated_at,
                created_by=dsl.metadata.created_by,
                version=dsl.metadata.version,
                tags=dsl.metadata.tags
            ),
            tools=[
                LegacyToolConfiguration(
                    id=t.id,
                    tool_id=t.tool_id,
                    tool_name=t.name,
                    enabled=t.enabled,
                    parameters=[
                        LegacyToolParameter(
                            name=p.name,
                            source=p.source,
                            value=p.value,
                            input_component=p.input_component,
                            transform=p.transform
                        )
                        for p in t.parameters
                    ],
                    output_variable=t.output_variable,
                    output_transform=t.output_transform,
                    on_error=t.on_error.value,
                    retry_count=t.retry_count,
                    fallback_value=t.fallback_value
                )
                for t in dsl.tools.tools
            ],
            ui_layout=LegacyUILayout(
                layout_mode=dsl.ui.layout_mode,
                show_header=dsl.ui.show_header,
                header_title=dsl.ui.header_title,
                header_subtitle=dsl.ui.header_subtitle,
                header_icon=dsl.ui.header_icon,
                dashboard_config=LegacyDashboardConfig(
                    columns=dsl.ui.dashboard_config.columns,
                    rowHeight=dsl.ui.dashboard_config.rowHeight,
                    gap=dsl.ui.dashboard_config.gap
                ) if dsl.ui.dashboard_config else None,
                widgets=[
                    self._convert_dsl_component_to_legacy(w) for w in dsl.ui.widgets
                ],
                sections=[
                    self._convert_dsl_section_to_legacy(s) for s in dsl.ui.sections
                ],
                show_sidebar=dsl.ui.show_sidebar,
                sidebar_position=dsl.ui.sidebar_position,
                sidebar_width=dsl.ui.sidebar_width,
                sidebar_sections=[
                    self._convert_dsl_section_to_legacy(s) for s in dsl.ui.sidebar_sections
                ],
                show_footer=dsl.ui.show_footer,
                footer_content=dsl.ui.footer_content,
                show_actions=dsl.ui.show_actions,
                actions=[
                    self._convert_dsl_component_to_legacy(a) for a in dsl.ui.actions
                ],
                primary_color=dsl.ui.primary_color,
                secondary_color=dsl.ui.secondary_color,
                custom_css=dsl.ui.custom_css
            ),
            ai_behavior=LegacyAIBehavior(
                system_prompt=dsl.business_logic.system_prompt,
                user_prompt=dsl.business_logic.user_prompt_template,
                personality_traits=[
                    LegacyPersonalityTrait(trait=t.name, intensity=t.intensity)
                    for t in dsl.business_logic.personality_traits
                ],
                tone=dsl.business_logic.tone,
                default_provider=LegacyLLMProvider(dsl.business_logic.llm_provider.value),
                default_model=dsl.business_logic.llm_model,
                temperature=dsl.business_logic.temperature,
                max_tokens=dsl.business_logic.max_tokens,
                context_window=dsl.business_logic.context_window_messages,
                include_system_context=dsl.business_logic.include_system_context,
                include_sources=dsl.business_logic.include_sources,
                include_confidence=dsl.business_logic.include_confidence,
                enable_moderation=dsl.business_logic.moderation.enabled,
                enable_classification=dsl.business_logic.classification.enabled,
                task_prompts=dsl.business_logic.task_prompts
            ),
            workflows=[
                LegacyWorkflow(
                    id=w.id,
                    name=w.name,
                    description=w.description,
                    trigger=LegacyTriggerType(w.trigger.value),
                    trigger_config=w.trigger_config,
                    steps=[self._convert_dsl_step_to_legacy(s) for s in w.steps],
                    entry_step=w.entry_step,
                    variables=w.initial_variables,
                    global_error_handler=w.global_error_handler
                )
                for w in dsl.workflows.workflows
            ],
            route=dsl.deployment.route,
            requires_auth=dsl.security.requires_auth,
            allowed_roles=dsl.security.allowed_roles
        )

    def _convert_dsl_section_to_legacy(self, section: ADLLayoutSection) -> LegacyLayoutSection:
        """Convert DSL section to legacy format."""
        return LegacyLayoutSection(
            id=section.id,
            name=section.name,
            title=section.title,
            description=section.description,
            layout_type=section.layout_type,
            grid_columns=section.grid_columns,
            gap=section.gap,
            components=[
                self._convert_dsl_component_to_legacy(c) for c in section.components
            ],
            visible_when={
                'field': section.visible_when.field,
                'operator': section.visible_when.operator,
                'value': section.visible_when.value
            } if section.visible_when else None,
            style=LegacyComponentStyle(
                width=section.style.width,
                height=section.style.height,
                margin=section.style.margin,
                padding=section.style.padding,
                background_color=section.style.background_color,
                text_color=section.style.text_color,
                border_radius=section.style.border_radius,
                custom_css=section.style.custom_css
            )
        )

    def _convert_dsl_component_to_legacy(self, comp: ADLUIComponent) -> LegacyUIComponent:
        """Convert DSL component to legacy format."""
        return LegacyUIComponent(
            id=comp.id,
            type=LegacyComponentType(comp.type.value),
            name=comp.name,
            label=comp.label,
            placeholder=comp.placeholder,
            help_text=comp.help_text,
            default_value=comp.default_value,
            required=comp.required,
            validation_rules=[
                LegacyValidationRule(
                    type=r.type,
                    value=r.value,
                    message=r.message
                )
                for r in comp.validation_rules
            ],
            options=[
                LegacySelectOption(
                    value=o.value,
                    label=o.label,
                    disabled=o.disabled,
                    icon=o.icon
                )
                for o in comp.options
            ],
            accept=comp.accept,
            max_size_mb=comp.max_size_mb,
            multiple=comp.multiple,
            grid_column=comp.grid_column,
            grid_row=comp.grid_row,
            order=comp.order,
            style=LegacyComponentStyle(
                width=comp.style.width,
                height=comp.style.height,
                margin=comp.style.margin,
                padding=comp.style.padding,
                background_color=comp.style.background_color,
                text_color=comp.style.text_color,
                border_radius=comp.style.border_radius,
                custom_css=comp.style.custom_css
            ),
            visible_when={
                'field': comp.visible_when.field,
                'operator': comp.visible_when.operator,
                'value': comp.visible_when.value
            } if comp.visible_when else None,
            children=[
                self._convert_dsl_component_to_legacy(c) for c in comp.children
            ],
            data_source=comp.data_source,
            auto_bind_output=comp.auto_bind_output,
            output_key=comp.output_key,
            on_change_action=comp.on_change_action,
            button_action=comp.button_action,
            button_variant=comp.button_variant,
            is_trigger_button=comp.is_trigger_button,
            gridPosition=LegacyGridPosition(
                x=comp.gridPosition.x,
                y=comp.gridPosition.y,
                w=comp.gridPosition.w,
                h=comp.gridPosition.h
            ) if comp.gridPosition else None,
            chart_config=LegacyChartConfig(
                show_legend=comp.chart_config.get('show_legend', True) if comp.chart_config else True,
                animate=comp.chart_config.get('animate', True) if comp.chart_config else True,
                colors=comp.chart_config.get('colors', []) if comp.chart_config else []
            ) if comp.chart_config else None
        )

    def _convert_dsl_step_to_legacy(self, step: ADLWorkflowStep) -> LegacyWorkflowStep:
        """Convert DSL workflow step to legacy format."""
        return LegacyWorkflowStep(
            id=step.id,
            name=step.name,
            type=LegacyWorkflowStepType(step.type.value),
            description=step.description,
            prompt_template=step.prompt_template,
            system_prompt=step.system_prompt_override,
            temperature=step.temperature_override,
            max_tokens=step.max_tokens_override,
            tool_config_id=step.tool_config_id,
            condition=LegacyWorkflowCondition(
                variable=step.condition.variable,
                operator=step.condition.operator,
                value=step.condition.value
            ) if step.condition else None,
            on_true=step.on_true,
            on_false=step.on_false,
            loop_variable=step.loop_variable,
            loop_body=[
                self._convert_dsl_step_to_legacy(s) for s in step.loop_body
            ],
            parallel_steps=[
                self._convert_dsl_step_to_legacy(s) for s in step.parallel_steps
            ],
            input_components=step.input_components,
            next_step=step.next_step,
            output_variable=step.output_variable
        )

    # ============== TEMPLATES ==============

    def get_template(self, template_name: str) -> Optional[AgentDSL]:
        """Get a predefined agent template."""
        templates = {
            "chat": self._create_chat_template(),
            "document_analysis": self._create_document_analysis_template(),
            "form_processor": self._create_form_processor_template(),
            "dashboard": self._create_dashboard_template(),
            "blank": self._create_blank_template()
        }
        return templates.get(template_name)

    def list_templates(self) -> List[Dict[str, str]]:
        """List available agent templates."""
        return [
            {"id": "chat", "name": "Chat Interface", "description": "Conversational AI agent"},
            {"id": "document_analysis", "name": "Document Analysis", "description": "Analyze and process documents"},
            {"id": "form_processor", "name": "Form Processor", "description": "Process form submissions with AI"},
            {"id": "dashboard", "name": "Dashboard", "description": "Data visualization dashboard"},
            {"id": "blank", "name": "Blank Canvas", "description": "Start from scratch"}
        ]

    def _create_chat_template(self) -> AgentDSL:
        """Create chat interface template."""
        return AgentDSL(
            identity=ADLIdentity(
                name="Chat Agent",
                description="Conversational AI assistant"
            ),
            business_logic=ADLBusinessLogic(
                system_prompt="You are a helpful AI assistant. Provide clear, concise, and accurate responses.",
                tone="professional",
                streaming_enabled=True
            ),
            ui=ADLUILayout(
                header_title="AI Chat",
                sections=[
                    ADLLayoutSection(
                        name="chat_section",
                        layout_type="column",
                        components=[
                            ADLUIComponent(
                                type=ComponentType.CHAT_INTERFACE,
                                name="main_chat",
                                label="Chat",
                                auto_bind_output=True
                            )
                        ]
                    )
                ],
                show_actions=False
            ),
            workflows=ADLWorkflows(
                workflows=[
                    ADLWorkflow(
                        name="Main Chat Flow",
                        trigger=TriggerType.USER_MESSAGE,
                        steps=[
                            ADLWorkflowStep(
                                name="Process Message",
                                type=WorkflowStepType.LLM_CALL,
                                output_variable="response"
                            )
                        ]
                    )
                ]
            )
        )

    def _create_document_analysis_template(self) -> AgentDSL:
        """Create document analysis template."""
        return AgentDSL(
            identity=ADLIdentity(
                name="Document Analyzer",
                description="Analyze and extract insights from documents",
                category=AgentCategory.DOCUMENT_ANALYSIS
            ),
            business_logic=ADLBusinessLogic(
                system_prompt="""You are a document analysis expert. Analyze the provided document and extract key information.
Provide:
1. Summary of the document
2. Key points and findings
3. Important data or metrics
4. Recommendations or action items""",
                tone="professional"
            ),
            tools=ADLTools(
                tools=[
                    ADLToolConfig(
                        tool_id="document-extractor",
                        name="Document Extractor",
                        parameters=[
                            ToolParameterMapping(
                                name="file",
                                source="input",
                                input_component="document_input"
                            )
                        ],
                        output_variable="extracted_text"
                    )
                ]
            ),
            ui=ADLUILayout(
                header_title="Document Analysis",
                sections=[
                    ADLLayoutSection(
                        name="input_section",
                        title="Upload Document",
                        layout_type="column",
                        components=[
                            ADLUIComponent(
                                type=ComponentType.DOCUMENT_UPLOAD,
                                name="document_input",
                                label="Select Document",
                                accept=".pdf,.doc,.docx,.txt",
                                required=True
                            ),
                            ADLUIComponent(
                                type=ComponentType.TEXTAREA,
                                name="instructions",
                                label="Additional Instructions",
                                placeholder="Any specific aspects to focus on?"
                            )
                        ]
                    ),
                    ADLLayoutSection(
                        name="output_section",
                        title="Analysis Results",
                        layout_type="column",
                        components=[
                            ADLUIComponent(
                                type=ComponentType.MARKDOWN_VIEWER,
                                name="analysis_result",
                                label="Analysis",
                                auto_bind_output=True
                            )
                        ]
                    )
                ],
                actions=[
                    ADLUIComponent(
                        type=ComponentType.BUTTON,
                        name="analyze_button",
                        label="Analyze Document",
                        button_action="trigger_agent",
                        button_variant="primary",
                        is_trigger_button=True
                    )
                ]
            ),
            workflows=ADLWorkflows(
                workflows=[
                    ADLWorkflow(
                        name="Document Analysis Flow",
                        trigger=TriggerType.BUTTON_CLICK,
                        trigger_config={"button": "analyze_button"},
                        steps=[
                            ADLWorkflowStep(
                                name="Extract Document",
                                type=WorkflowStepType.TOOL_CALL,
                                tool_config_id="document-extractor",
                                output_variable="extracted_text",
                                next_step="analyze"
                            ),
                            ADLWorkflowStep(
                                id="analyze",
                                name="Analyze Content",
                                type=WorkflowStepType.LLM_CALL,
                                prompt_template="Analyze the following document:\n\n{{extracted_text}}\n\n{{instructions}}",
                                output_variable="analysis"
                            )
                        ],
                        entry_step="extract"
                    )
                ]
            )
        )

    def _create_form_processor_template(self) -> AgentDSL:
        """Create form processor template."""
        return AgentDSL(
            identity=ADLIdentity(
                name="Form Processor",
                description="Process and analyze form submissions"
            ),
            business_logic=ADLBusinessLogic(
                system_prompt="Process the form data and provide a structured response.",
                tone="professional"
            ),
            ui=ADLUILayout(
                header_title="Form",
                sections=[
                    ADLLayoutSection(
                        name="form_section",
                        title="Fill the Form",
                        layout_type="column",
                        components=[
                            ADLUIComponent(
                                type=ComponentType.TEXT_INPUT,
                                name="name",
                                label="Name",
                                required=True
                            ),
                            ADLUIComponent(
                                type=ComponentType.EMAIL_INPUT,
                                name="email",
                                label="Email",
                                required=True
                            ),
                            ADLUIComponent(
                                type=ComponentType.TEXTAREA,
                                name="message",
                                label="Message",
                                required=True
                            )
                        ]
                    ),
                    ADLLayoutSection(
                        name="result_section",
                        title="Response",
                        layout_type="column",
                        components=[
                            ADLUIComponent(
                                type=ComponentType.MARKDOWN_VIEWER,
                                name="response",
                                auto_bind_output=True
                            )
                        ]
                    )
                ],
                actions=[
                    ADLUIComponent(
                        type=ComponentType.BUTTON,
                        name="submit_button",
                        label="Submit",
                        button_action="trigger_agent",
                        button_variant="primary",
                        is_trigger_button=True
                    )
                ]
            ),
            workflows=ADLWorkflows(
                workflows=[
                    ADLWorkflow(
                        name="Form Processing",
                        trigger=TriggerType.FORM_SUBMIT,
                        steps=[
                            ADLWorkflowStep(
                                name="Process Form",
                                type=WorkflowStepType.LLM_CALL,
                                prompt_template="Process this form submission:\nName: {{name}}\nEmail: {{email}}\nMessage: {{message}}",
                                output_variable="response"
                            )
                        ]
                    )
                ]
            )
        )

    def _create_dashboard_template(self) -> AgentDSL:
        """Create dashboard template."""
        return AgentDSL(
            identity=ADLIdentity(
                name="Dashboard",
                description="Data visualization dashboard",
                category=AgentCategory.ANALYTICS
            ),
            business_logic=ADLBusinessLogic(
                system_prompt="Analyze the data and provide insights.",
                tone="professional"
            ),
            ui=ADLUILayout(
                header_title="Dashboard",
                sections=[
                    ADLLayoutSection(
                        name="filters_section",
                        layout_type="row",
                        components=[
                            ADLUIComponent(
                                type=ComponentType.DATE_PICKER,
                                name="start_date",
                                label="Start Date"
                            ),
                            ADLUIComponent(
                                type=ComponentType.DATE_PICKER,
                                name="end_date",
                                label="End Date"
                            ),
                            ADLUIComponent(
                                type=ComponentType.SELECT,
                                name="category",
                                label="Category",
                                options=[
                                    SelectOption(value="all", label="All"),
                                    SelectOption(value="sales", label="Sales"),
                                    SelectOption(value="marketing", label="Marketing")
                                ]
                            )
                        ]
                    ),
                    ADLLayoutSection(
                        name="charts_section",
                        layout_type="grid",
                        grid_columns=2,
                        components=[
                            ADLUIComponent(
                                type=ComponentType.BAR_CHART,
                                name="bar_chart",
                                label="Sales by Month"
                            ),
                            ADLUIComponent(
                                type=ComponentType.PIE_CHART,
                                name="pie_chart",
                                label="Distribution"
                            ),
                            ADLUIComponent(
                                type=ComponentType.LINE_CHART,
                                name="line_chart",
                                label="Trend",
                                grid_column="1 / 3"
                            )
                        ]
                    )
                ]
            )
        )

    def _create_blank_template(self) -> AgentDSL:
        """Create blank template."""
        return AgentDSL(
            identity=ADLIdentity(
                name="New Agent",
                description="A new custom agent"
            ),
            business_logic=ADLBusinessLogic(
                system_prompt="You are a helpful AI assistant."
            ),
            ui=ADLUILayout(
                header_title="New Agent",
                sections=[]
            )
        )

    # ============== SCHEMA EXPORT ==============

    def get_json_schema(self) -> Dict[str, Any]:
        """Get the JSON schema for AgentDSL."""
        return AgentDSL.model_json_schema()

    def get_schema_documentation(self) -> str:
        """Generate human-readable schema documentation."""
        schema = self.get_json_schema()

        doc = f"""# Agent Descriptor Language (ADL) v{ADL_VERSION}

## Overview
The Agent Descriptor Language (ADL) is a standardized schema for defining AI agents.
It provides a complete specification for:
- Agent identity and metadata
- Business logic and AI behavior
- Tools and integrations
- UI components (graphical bricks)
- LLM connectors
- Workflows and automation
- Security and access control
- Deployment configuration

## Schema Reference

"""
        # Add definitions
        if "$defs" in schema:
            doc += "### Type Definitions\n\n"
            for name, definition in schema["$defs"].items():
                doc += f"#### {name}\n"
                if "description" in definition:
                    doc += f"{definition['description']}\n\n"
                if "properties" in definition:
                    doc += "| Property | Type | Description |\n"
                    doc += "|----------|------|-------------|\n"
                    for prop, details in definition["properties"].items():
                        prop_type = details.get("type", details.get("$ref", "any"))
                        prop_desc = details.get("description", "")
                        doc += f"| {prop} | {prop_type} | {prop_desc} |\n"
                doc += "\n"

        return doc


# ============== SINGLETON ==============

_service: Optional[AgentDSLService] = None


def get_agent_dsl_service() -> AgentDSLService:
    """Get the agent DSL service singleton."""
    global _service
    if _service is None:
        _service = AgentDSLService()
    return _service
