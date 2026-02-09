/**
 * Agent Builder Models - TypeScript interfaces for the Agent Builder.
 */

// ============== ENUMS ==============

export type AgentStatus = 'draft' | 'active' | 'beta' | 'disabled' | 'archived';

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

export type ToolCategory =
  | 'document_processing'
  | 'content_generation'
  | 'data_extraction'
  | 'search'
  | 'communication'
  | 'governance'
  | 'analytics'
  | 'integration';

export type LLMProvider = 'mistral' | 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'nvidia-nim';

export type WorkflowStepType =
  | 'llm_call'
  | 'tool_call'
  | 'condition'
  | 'loop'
  | 'parallel'
  | 'user_input'
  | 'data_transform'
  | 'validation';

export type TriggerType =
  | 'user_message'
  | 'form_submit'
  | 'file_upload'
  | 'button_click'
  | 'schedule'
  | 'webhook';

// ============== UI COMPONENT INTERFACES ==============

export interface ValidationRule {
  type: string;
  value?: any;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

export interface ComponentStyle {
  width?: string;
  height?: string;
  margin?: string;
  padding?: string;
  background_color?: string;
  text_color?: string;
  border_radius?: string;
  custom_css?: string;
}

// ============== GRID POSITION FOR DASHBOARD LAYOUT ==============

export interface GridPosition {
  x: number;      // Colonne de départ (0-11 pour une grille de 12 colonnes)
  y: number;      // Ligne de départ
  w: number;      // Largeur en colonnes (1-12)
  h: number;      // Hauteur en lignes
  minW?: number;  // Largeur minimum
  minH?: number;  // Hauteur minimum
  maxW?: number;  // Largeur maximum
  maxH?: number;  // Hauteur maximum
}

export type ButtonActionType =
  | 'trigger_agent'      // Déclenche l'exécution de l'agent
  | 'submit_form'        // Soumet le formulaire
  | 'reset_form'         // Réinitialise le formulaire
  | 'navigate'           // Navigation vers une autre page
  | 'download'           // Téléchargement de fichier
  | 'custom';            // Action personnalisée

export interface UIComponent {
  id: string;
  type: ComponentType;
  name: string;
  label?: string;
  placeholder?: string;
  help_text?: string;
  default_value?: any;
  required?: boolean;
  validation_rules?: ValidationRule[];
  options?: SelectOption[];
  accept?: string;
  max_size_mb?: number;
  multiple?: boolean;
  grid_column?: string;
  grid_row?: string;
  order?: number;
  style?: ComponentStyle;
  visible_when?: Record<string, any>;
  children?: UIComponent[];
  data_source?: string;
  auto_bind_output?: boolean; // Si true, lie automatiquement la sortie de l'agent à ce composant
  output_key?: string; // Clé à extraire d'une sortie JSON structurée (ex: 'swot', 'synthesis')
  on_change_action?: string;
  // Propriétés spécifiques aux boutons
  button_action?: ButtonActionType;
  button_variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  is_trigger_button?: boolean; // Indique si ce bouton déclenche l'agent
  // Position sur la grille (mode dashboard)
  gridPosition?: GridPosition;
  // Configuration spécifique aux charts
  chart_config?: {
    chart_type?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
    title?: string;
    show_legend?: boolean;
    legend_position?: 'top' | 'bottom' | 'left' | 'right';
    colors?: string[];
    animate?: boolean;
  };
}

// ============== TOOL INTERFACES ==============

export interface ToolParameter {
  name: string;
  source: 'input' | 'constant' | 'variable' | 'previous_output';
  value?: any;
  input_component?: string;
  transform?: string;
}

export interface ToolConfiguration {
  id: string;
  tool_id: string;
  tool_name: string;
  enabled: boolean;
  parameters: ToolParameter[];
  output_variable?: string;
  output_transform?: string;
  on_error: 'stop' | 'continue' | 'retry';
  retry_count?: number;
  fallback_value?: any;
}

export interface AvailableTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  endpoint: string;
  port: number;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  supports_streaming?: boolean;
  supports_batch?: boolean;
  requires_file_input?: boolean;
  produces_file_output?: boolean;
  required_api_keys?: string[];
}

// ============== WORKFLOW INTERFACES ==============

export interface WorkflowCondition {
  variable: string;
  operator: string;
  value: any;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  description?: string;
  prompt_template?: string;
  system_prompt?: string;
  llm_provider?: LLMProvider;
  temperature?: number;
  max_tokens?: number;
  tool_config_id?: string;
  condition?: WorkflowCondition;
  on_true?: string;
  on_false?: string;
  loop_variable?: string;
  loop_collection?: string;
  loop_body?: WorkflowStep[];
  parallel_steps?: WorkflowStep[];
  input_components?: string[];
  next_step?: string;
  output_variable?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerType;
  trigger_config?: Record<string, any>;
  steps: WorkflowStep[];
  entry_step?: string;
  variables?: Record<string, any>;
  global_error_handler?: string;
}

// ============== AI BEHAVIOR INTERFACES ==============

export interface PersonalityTrait {
  trait: string;
  intensity: number;
}

export interface ResponseFormat {
  type: 'text' | 'json' | 'markdown' | 'structured';
  schema?: Record<string, any>;
  example?: string;
}

export interface AIBehavior {
  system_prompt: string;
  user_prompt?: string;  // Prompt utilisateur par défaut (optionnel)
  personality_traits?: PersonalityTrait[];
  tone?: string;
  default_provider: LLMProvider;
  default_model?: string;
  temperature: number;
  max_tokens: number;
  response_format?: ResponseFormat;
  include_sources?: boolean;
  include_confidence?: boolean;
  context_window?: number;
  include_system_context?: boolean;
  enable_moderation?: boolean;
  enable_classification?: boolean;
  content_filters?: string[];
  task_prompts?: Record<string, string>;
}

// ============== UI LAYOUT INTERFACES ==============

export interface LayoutSection {
  id: string;
  name: string;
  title?: string;
  description?: string;
  layout_type: 'column' | 'row' | 'grid';
  grid_columns?: number;
  gap?: string;
  components: UIComponent[];
  visible_when?: Record<string, any>;
  style?: ComponentStyle;
  collapsible?: boolean;
  collapsed_default?: boolean;
}

export type LayoutMode = 'sections' | 'dashboard';

export interface DashboardConfig {
  columns: number;         // Nombre de colonnes (défaut: 12)
  rowHeight: number;       // Hauteur d'une ligne en pixels (défaut: 60)
  gap: number;             // Espacement entre widgets en pixels (défaut: 16)
  compactType?: 'vertical' | 'horizontal' | 'none'; // Type de compactage automatique
}

export interface UILayout {
  // Mode de layout: 'sections' (classique) ou 'dashboard' (grille libre)
  layout_mode?: LayoutMode;
  // Configuration du mode dashboard
  dashboard_config?: DashboardConfig;
  // Widgets positionnés sur la grille (mode dashboard)
  widgets?: UIComponent[];
  show_header?: boolean;
  header_title?: string;
  header_subtitle?: string;
  header_icon?: string;
  sections: LayoutSection[];
  show_sidebar?: boolean;
  sidebar_sections?: LayoutSection[];
  sidebar_position?: 'left' | 'right';
  sidebar_width?: string;
  show_footer?: boolean;
  footer_content?: string;
  show_actions?: boolean;
  actions?: UIComponent[];
  primary_color?: string;
  secondary_color?: string;
  custom_css?: string;
}

// ============== MAIN AGENT INTERFACES ==============

export interface AgentMetadata {
  created_at: string;
  updated_at: string;
  created_by?: string;
  version: string;
  tags: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  icon: string;
  category: string;
  status: AgentStatus;
  metadata: AgentMetadata;
  tools: ToolConfiguration[];
  ui_layout: UILayout;
  ai_behavior: AIBehavior;
  workflows: Workflow[];
  route?: string;
  requires_auth?: boolean;
  allowed_roles?: string[];
}

// ============== API INTERFACES ==============

export interface CreateAgentRequest {
  name: string;
  description: string;
  category?: string;
  icon?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  long_description?: string;
  icon?: string;
  category?: string;
  status?: AgentStatus;
  tools?: ToolConfiguration[];
  ui_layout?: UILayout;
  ai_behavior?: AIBehavior;
  workflows?: Workflow[];
}

export interface AgentListResponse {
  agents: AgentDefinition[];
  total: number;
  page: number;
  page_size: number;
}

export interface AgentResponse {
  success: boolean;
  agent?: AgentDefinition;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

// ============== UI BUILDER HELPERS ==============

export interface ComponentTypeInfo {
  type: ComponentType;
  name: string;
  category: string;
  icon: string;
  description: string;
}

export interface UITemplate {
  name: string;
  description: string;
  sections: Partial<LayoutSection>[];
}

export interface PersonalityPreset {
  system_prompt: string;
  tone: string;
  traits: PersonalityTrait[];
}

export interface AgentCategory {
  id: string;
  name: string;
  icon: string;
}

// ============== DRAG & DROP ==============

export interface DragDropEvent {
  previousIndex: number;
  currentIndex: number;
  previousContainer: string;
  container: string;
  item: UIComponent | LayoutSection;
}
