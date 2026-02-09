/**
 * Agent Descriptor Language (ADL) TypeScript Models
 *
 * These interfaces mirror the Python ADL schema for frontend use.
 * They enable:
 * - Type-safe agent definition manipulation
 * - YAML/JSON import/export
 * - Validation and form binding
 */

// ============== VERSION ==============

export const ADL_VERSION = '1.0.0';
export const ADL_SCHEMA_URL = 'https://agent-pf.io/schemas/adl/v1';

// ============== ENUMS ==============

export type AgentCategory =
  | 'custom'
  | 'document_analysis'
  | 'data_processing'
  | 'conversation'
  | 'automation'
  | 'monitoring'
  | 'integration'
  | 'analytics';

export type AgentStatus = 'draft' | 'active' | 'beta' | 'disabled' | 'archived';

export type LLMProvider = 'mistral' | 'openai' | 'anthropic' | 'gemini' | 'perplexity';

export type ToolCategory =
  | 'document_processing'
  | 'content_generation'
  | 'data_extraction'
  | 'search'
  | 'communication'
  | 'governance'
  | 'analytics'
  | 'integration';

export type ComponentType =
  // Input Components
  | 'text_input'
  | 'textarea'
  | 'number_input'
  | 'email_input'
  | 'password_input'
  | 'date_picker'
  | 'time_picker'
  | 'datetime_picker'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'radio_group'
  | 'slider'
  | 'toggle'
  // File Components
  | 'file_upload'
  | 'image_upload'
  | 'document_upload'
  | 'document_repository'
  // Display Components
  | 'text_display'
  | 'markdown_viewer'
  | 'pdf_viewer'
  | 'image_viewer'
  | 'code_viewer'
  // Chart Components
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'donut_chart'
  // Interactive Components
  | 'chat_interface'
  | 'button'
  | 'button_group'
  | 'progress_bar'
  // Layout Components
  | 'card'
  | 'tabs'
  | 'accordion'
  | 'divider'
  | 'spacer'
  | 'grid'
  // Data Components
  | 'data_table'
  | 'list'
  | 'tree_view';

export type TriggerType =
  | 'user_message'
  | 'form_submit'
  | 'file_upload'
  | 'button_click'
  | 'schedule'
  | 'webhook'
  | 'on_load';

export type WorkflowStepType =
  | 'llm_call'
  | 'tool_call'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'user_input'
  | 'data_transform'
  | 'validation'
  | 'set_variable'
  | 'http_request';

export type ErrorHandling = 'stop' | 'continue' | 'retry' | 'fallback';

export type ButtonAction = 'trigger_agent' | 'submit_form' | 'reset_form' | 'navigate' | 'custom';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'link';

// ============== SECTION 1: METADATA ==============

export interface ADLMetadata {
  adl_version: string;
  schema_url?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  version: string;
  tags: string[];
  changelog?: string[];
}

// ============== SECTION 2: IDENTITY ==============

export interface ADLIdentity {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  long_description?: string;
  icon: string;
  category: AgentCategory;
  status: AgentStatus;
}

// ============== SECTION 3: BUSINESS LOGIC ==============

export interface PersonalityTrait {
  name: string;
  intensity: number;
}

export interface ResponseFormat {
  type: 'text' | 'json' | 'markdown' | 'structured';
  json_schema?: Record<string, any>;
  example?: string;
}

export interface ModerationConfig {
  enabled: boolean;
  provider?: string;
  block_on_fail?: boolean;
  risk_threshold?: 'low' | 'medium' | 'high';
}

export interface ClassificationConfig {
  enabled: boolean;
  provider?: string;
  allowed_domains?: string[];
  min_professional_score?: number;
}

export interface ADLBusinessLogic {
  // Core prompts
  system_prompt: string;
  user_prompt_template?: string;

  // Personality
  personality_traits?: PersonalityTrait[];
  tone?: string;
  language?: string;

  // LLM Configuration
  llm_provider: LLMProvider;
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;

  // Context management
  context_window_messages?: number;
  include_system_context?: boolean;

  // Response configuration
  response_format?: ResponseFormat;
  include_sources?: boolean;
  include_confidence?: boolean;
  streaming_enabled?: boolean;

  // Governance
  moderation?: ModerationConfig;
  classification?: ClassificationConfig;

  // Task-specific prompts
  task_prompts?: Record<string, string>;

  // Instructions and constraints
  instructions?: string[];
  constraints?: string[];
}

// ============== SECTION 4: TOOLS ==============

export interface ToolParameterMapping {
  name: string;
  source: 'input' | 'constant' | 'variable' | 'previous_output' | 'context';
  value?: any;
  input_component?: string;
  transform?: string;
  required?: boolean;
}

export interface ADLToolConfig {
  id?: string;
  tool_id: string;
  name: string;
  enabled: boolean;
  description?: string;
  parameters?: ToolParameterMapping[];
  output_variable?: string;
  output_transform?: string;
  on_error?: ErrorHandling;
  retry_count?: number;
  retry_delay_ms?: number;
  fallback_value?: any;
  timeout_ms?: number;
  async_execution?: boolean;
}

export interface ADLTools {
  tools: ADLToolConfig[];
  default_error_handling?: ErrorHandling;
  parallel_execution?: boolean;
  max_parallel_tools?: number;
}

// ============== SECTION 5: UI COMPONENTS ==============

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'custom';
  value?: any;
  message: string;
  custom_validator?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
  description?: string;
}

export interface ComponentStyle {
  width?: string;
  height?: string;
  min_width?: string;
  max_width?: string;
  min_height?: string;
  margin?: string;
  padding?: string;
  background_color?: string;
  text_color?: string;
  border?: string;
  border_radius?: string;
  box_shadow?: string;
  custom_css?: string;
  css_classes?: string[];
}

export interface ConditionalVisibility {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'is_empty'
    | 'is_not_empty';
  value?: any;
}

export interface ADLUIComponent {
  id?: string;
  type: ComponentType;
  name: string;
  label?: string;
  placeholder?: string;
  help_text?: string;
  default_value?: any;

  // Validation
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  validation_rules?: ValidationRule[];

  // Options
  options?: SelectOption[];
  options_source?: string;

  // File upload
  accept?: string;
  max_size_mb?: number;
  multiple?: boolean;

  // Layout
  grid_column?: string;
  grid_row?: string;
  order?: number;
  flex?: string;

  // Styling
  style?: ComponentStyle;

  // Visibility
  visible_when?: ConditionalVisibility;
  hidden?: boolean;

  // Nested
  children?: ADLUIComponent[];

  // Data binding
  data_source?: string;
  auto_bind_output?: boolean;
  on_change_action?: string;

  // Button-specific
  button_action?: ButtonAction;
  button_variant?: ButtonVariant;
  is_trigger_button?: boolean;
  navigate_to?: string;
  custom_action?: string;

  // Chart-specific
  chart_config?: Record<string, any>;
}

export interface ADLLayoutSection {
  id?: string;
  name: string;
  title?: string;
  description?: string;
  icon?: string;

  // Layout
  layout_type: 'column' | 'row' | 'grid';
  grid_columns?: number;
  gap?: string;
  align_items?: 'start' | 'center' | 'end' | 'stretch';
  justify_content?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';

  // Components
  components: ADLUIComponent[];

  // Visibility
  visible_when?: ConditionalVisibility;
  collapsible?: boolean;
  collapsed_by_default?: boolean;

  // Styling
  style?: ComponentStyle;
}

export interface ADLUILayout {
  // Header
  show_header?: boolean;
  header_title?: string;
  header_subtitle?: string;
  header_icon?: string;
  header_actions?: ADLUIComponent[];

  // Main content
  sections: ADLLayoutSection[];

  // Sidebar
  show_sidebar?: boolean;
  sidebar_position?: 'left' | 'right';
  sidebar_width?: string;
  sidebar_collapsible?: boolean;
  sidebar_sections?: ADLLayoutSection[];

  // Footer
  show_footer?: boolean;
  footer_content?: string;

  // Actions
  show_actions?: boolean;
  actions?: ADLUIComponent[];
  actions_position?: 'left' | 'center' | 'right' | 'space-between';

  // Theme
  theme?: 'light' | 'dark' | 'auto';
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_css?: string;
}

// ============== SECTION 6: CONNECTORS ==============

export interface ADLConnectorConfig {
  id?: string;
  provider: LLMProvider;
  name: string;
  description?: string;
  endpoint_url?: string;
  api_key_env?: string;
  model?: string;
  fallback_model?: string;
  default_temperature?: number;
  default_max_tokens?: number;
  requests_per_minute?: number;
  tokens_per_minute?: number;
  retry_on_error?: boolean;
  max_retries?: number;
  retry_delay_ms?: number;
  timeout_ms?: number;
  priority?: number;
}

export interface ADLConnectors {
  default_connector: string;
  connectors: ADLConnectorConfig[];
  enable_fallback?: boolean;
  fallback_order?: string[];
}

// ============== SECTION 7: WORKFLOWS ==============

export interface WorkflowCondition {
  variable: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'lt'
    | 'gte'
    | 'lte'
    | 'contains'
    | 'not_contains'
    | 'is_empty'
    | 'is_not_empty'
    | 'matches';
  value: any;
  and_conditions?: WorkflowCondition[];
  or_conditions?: WorkflowCondition[];
}

export interface ADLWorkflowStep {
  id?: string;
  name: string;
  type: WorkflowStepType;
  description?: string;

  // LLM calls
  prompt_template?: string;
  system_prompt_override?: string;
  connector_id?: string;
  temperature_override?: number;
  max_tokens_override?: number;

  // Tool calls
  tool_config_id?: string;

  // Conditions
  condition?: WorkflowCondition;
  on_true?: string;
  on_false?: string;

  // Loops
  loop_variable?: string;
  loop_item_name?: string;
  loop_index_name?: string;
  loop_body?: ADLWorkflowStep[];
  max_iterations?: number;

  // Parallel
  parallel_steps?: ADLWorkflowStep[];
  wait_for_all?: boolean;

  // User input
  input_components?: string[];
  input_timeout_ms?: number;

  // Data transform
  transform_expression?: string;

  // Set variable
  variable_name?: string;
  variable_value?: any;

  // HTTP request
  http_url?: string;
  http_method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  http_headers?: Record<string, string>;
  http_body?: any;

  // Flow control
  next_step?: string;
  output_variable?: string;

  // Error handling
  on_error?: ErrorHandling;
  error_handler_step?: string;
}

export interface ADLWorkflow {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  trigger: TriggerType;
  trigger_config?: Record<string, any>;
  steps: ADLWorkflowStep[];
  entry_step?: string;
  initial_variables?: Record<string, any>;
  global_error_handler?: string;
  timeout_ms?: number;
}

export interface ADLWorkflows {
  workflows: ADLWorkflow[];
  default_workflow?: string;
}

// ============== SECTION 8: SECURITY ==============

export interface ADLSecurity {
  requires_auth?: boolean;
  allowed_roles?: string[];
  allowed_permissions?: string[];
  rate_limit_enabled?: boolean;
  requests_per_minute?: number;
  requests_per_hour?: number;
  sanitize_inputs?: boolean;
  max_input_length?: number;
  audit_logging?: boolean;
  log_inputs?: boolean;
  log_outputs?: boolean;
}

// ============== SECTION 9: DEPLOYMENT ==============

export interface ADLDeployment {
  route?: string;
  auto_route?: boolean;
  environment?: 'development' | 'staging' | 'production';
  min_instances?: number;
  max_instances?: number;
  feature_flags?: Record<string, boolean>;
  health_check_enabled?: boolean;
  health_check_interval_ms?: number;
}

// ============== MAIN DSL SCHEMA ==============

/**
 * Complete Agent Descriptor Language (ADL) Schema
 *
 * This is the master interface for agent definitions.
 * All agents must conform to this structure.
 */
export interface AgentDSL {
  metadata: ADLMetadata;
  identity: ADLIdentity;
  business_logic: ADLBusinessLogic;
  tools: ADLTools;
  ui: ADLUILayout;
  connectors?: ADLConnectors;
  workflows: ADLWorkflows;
  security: ADLSecurity;
  deployment: ADLDeployment;
}

// ============== PARTIAL UPDATE INTERFACES ==============

export interface PartialBusinessLogicUpdate {
  system_prompt?: string;
  user_prompt_template?: string;
  personality_traits?: PersonalityTrait[];
  tone?: string;
  llm_provider?: LLMProvider;
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface PartialUIUpdate {
  sections?: ADLLayoutSection[];
  show_header?: boolean;
  header_title?: string;
  header_subtitle?: string;
  primary_color?: string;
}

export interface PartialToolsUpdate {
  tools?: ADLToolConfig[];
  default_error_handling?: ErrorHandling;
}

export interface PartialAgentUpdate {
  identity?: Partial<ADLIdentity>;
  business_logic?: PartialBusinessLogicUpdate;
  tools?: PartialToolsUpdate;
  ui?: PartialUIUpdate;
  security?: Partial<ADLSecurity>;
  deployment?: Partial<ADLDeployment>;
}

// ============== VALIDATION ==============

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============== API INTERFACES ==============

export interface DSLParseRequest {
  content: string;
  format: 'yaml' | 'json';
}

export interface DSLParseResponse {
  success: boolean;
  agent: AgentDSL | null;
  validation: ValidationResult;
}

export interface DSLExportResponse {
  format: string;
  content: string;
  agent_id: string;
  agent_name: string;
}

export interface DSLTemplateInfo {
  id: string;
  name: string;
  description: string;
  category?: string;
  icon?: string;
}

export interface DSLSchemaResponse {
  version: string;
  schema_url: string;
  json_schema: Record<string, any>;
}

// ============== HELPER FUNCTIONS ==============

/**
 * Create a default empty AgentDSL
 */
export function createEmptyAgentDSL(): AgentDSL {
  return {
    metadata: {
      adl_version: ADL_VERSION,
      schema_url: ADL_SCHEMA_URL,
      version: '1.0.0',
      tags: [],
    },
    identity: {
      name: 'New Agent',
      description: 'A new custom agent',
      icon: 'fa fa-robot',
      category: 'custom',
      status: 'draft',
    },
    business_logic: {
      system_prompt: 'You are a helpful AI assistant.',
      llm_provider: 'mistral',
      temperature: 0.7,
      max_tokens: 2048,
    },
    tools: {
      tools: [],
    },
    ui: {
      show_header: true,
      sections: [],
      show_actions: true,
      actions: [],
    },
    workflows: {
      workflows: [],
    },
    security: {
      requires_auth: false,
      sanitize_inputs: true,
      audit_logging: true,
    },
    deployment: {
      auto_route: true,
      environment: 'development',
    },
  };
}

/**
 * Create a chat agent template
 */
export function createChatAgentTemplate(): AgentDSL {
  return {
    ...createEmptyAgentDSL(),
    identity: {
      name: 'Chat Agent',
      description: 'Conversational AI assistant',
      icon: 'fa fa-comments',
      category: 'conversation',
      status: 'draft',
    },
    ui: {
      show_header: true,
      header_title: 'AI Chat',
      sections: [
        {
          name: 'chat_section',
          layout_type: 'column',
          components: [
            {
              type: 'chat_interface',
              name: 'main_chat',
              label: 'Chat',
              auto_bind_output: true,
            },
          ],
        },
      ],
      show_actions: false,
    },
    workflows: {
      workflows: [
        {
          name: 'Main Chat Flow',
          trigger: 'user_message',
          steps: [
            {
              name: 'Process Message',
              type: 'llm_call',
              output_variable: 'response',
            },
          ],
        },
      ],
    },
  };
}

/**
 * Validate an AgentDSL structure (basic client-side validation)
 */
export function validateAgentDSL(agent: AgentDSL): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!agent.identity?.name) {
    errors.push({ path: 'identity.name', message: 'Agent name is required', severity: 'error' });
  }

  if (!agent.identity?.description) {
    errors.push({
      path: 'identity.description',
      message: 'Agent description is required',
      severity: 'error',
    });
  }

  if (!agent.business_logic?.system_prompt) {
    warnings.push({
      path: 'business_logic.system_prompt',
      message: 'No system prompt defined',
      severity: 'warning',
    });
  }

  // UI validation
  if (!agent.ui?.sections || agent.ui.sections.length === 0) {
    warnings.push({
      path: 'ui.sections',
      message: 'No UI sections defined',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
