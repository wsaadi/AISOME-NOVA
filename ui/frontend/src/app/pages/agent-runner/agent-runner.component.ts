import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, timeout, Subscription } from 'rxjs';

import { AgentBuilderService } from '../agent-builder/services/agent-builder.service';
import { AgentDefinition, UIComponent, LayoutSection, ComponentType } from '../agent-builder/models/agent.models';
import { AgentRuntimeService, AgentDefinition as RuntimeAgentDefinition } from '../../core/services/agent-runtime.service';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { LineChartComponent } from '../../shared/components/charts/line-chart/line-chart.component';
import { BarChartComponent } from '../../shared/components/charts/bar-chart/bar-chart.component';
import { PieChartComponent } from '../../shared/components/charts/pie-chart/pie-chart.component';
import { DonutChartComponent } from '../../shared/components/charts/donut-chart/donut-chart.component';
import { ChartData } from '../../shared/services/chart.service';
import { TokenConsumptionService } from '../../core/services/token-consumption.service';
import { QuotaService } from '../../core/services/quota.service';
import { RoleService } from '../../core/services/role.service';
import { AIProvider } from '../../core/models/token-consumption.model';
import { GlobalSettingsService } from '../../core/services/global-settings.service';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isError?: boolean;
}

interface ChatResponse {
  success: boolean;
  message?: {
    role: string;
    content: string;
  };
  error?: string;
  blocked_reason?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Component({
  selector: 'app-agent-runner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSliderModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    TranslateModule,
    MarkdownViewerComponent,
    LineChartComponent,
    BarChartComponent,
    PieChartComponent,
    DonutChartComponent,
  ],
  templateUrl: './agent-runner.component.html',
  styleUrls: ['./agent-runner.component.scss'],
})
export class AgentRunnerComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  agent: AgentDefinition | null = null;
  loading = true;
  error: string | null = null;

  // Form data for all input components
  formData: Record<string, any> = {};

  // Chat state
  chatMessages: ChatMessage[] = [];
  chatInput = '';
  isSending = false;

  // File uploads
  uploadedFiles: Map<string, File[]> = new Map();

  // Execution state
  isExecuting = false;
  executionProgress = 0;
  executionResult: any = null;
  executionResultJson: Record<string, any> | null = null;
  progressLabel = '';

  // Collapsible sections state
  collapsedSections: Record<string, boolean> = {};

  // LLM Configuration (from agent or overridden by user)
  llmConfig: AgentConfig | null = null;

  // Runtime mode flag
  useRuntime = false;
  runtimeSessionId: string | null = null;

  private shouldScrollToBottom = false;
  private subscription?: Subscription;
  private requestStartTime: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private agentBuilderService: AgentBuilderService,
    private agentRuntimeService: AgentRuntimeService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private tokenConsumptionService: TokenConsumptionService,
    private quotaService: QuotaService,
    private roleService: RoleService,
    private globalSettingsService: GlobalSettingsService
  ) {}

  ngOnInit(): void {
    // Check if we should use the runtime service
    this.useRuntime = this.route.snapshot.data['useRuntime'] === true;

    if (this.useRuntime) {
      // Runtime mode: load agent by slug
      const slug = this.route.snapshot.paramMap.get('slug');
      if (slug) {
        this.loadRuntimeAgent(slug);
      } else {
        this.error = 'Agent slug not provided';
        this.loading = false;
      }
    } else {
      // Builder mode: load agent by ID
      const agentId = this.route.snapshot.paramMap.get('id');
      if (agentId) {
        this.loadAgent(agentId);
      } else {
        this.error = 'Agent ID not provided';
        this.loading = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  /**
   * Load agent from the Runtime service (YAML-based agents)
   */
  loadRuntimeAgent(slug: string): void {
    this.loading = true;
    this.error = null;

    this.subscription = this.agentRuntimeService.getAgentBySlug(slug).subscribe({
      next: (runtimeAgent) => {
        // Convert runtime agent to local format
        this.agent = this.convertRuntimeAgentToLocal(runtimeAgent);
        this.loading = false;
        this.initializeFormData();
        this.initializeCollapsedSections();
        this.loadLLMConfig();
        this.initializeChat();
      },
      error: (err) => {
        console.error('Failed to load runtime agent:', err);
        this.error = 'Failed to load agent. The runtime service may not be available.';
        this.loading = false;
      }
    });
  }

  /**
   * Convert a RuntimeAgentDefinition to the local AgentDefinition format
   * Handles both flat structure and nested ADL YAML structure (identity.*, ui.*, etc.)
   */
  private convertRuntimeAgentToLocal(runtime: RuntimeAgentDefinition): AgentDefinition {
    // Handle nested ADL YAML structure - identity fields are under 'identity' key
    const identity = (runtime as any).identity || runtime;
    const ui = runtime.ui || (runtime as any).ui;
    const metadata = (runtime as any).metadata || {};
    const tools = runtime.tools || (runtime as any).tools;

    return {
      id: identity.id || runtime.id,
      name: identity.name || runtime.name,
      description: identity.description || runtime.description,
      icon: identity.icon || runtime.icon,
      category: identity.category || runtime.category,
      status: (identity.status || runtime.status || 'active') as 'active' | 'inactive' | 'draft',
      metadata: {
        version: metadata.version || runtime.version || '1.0.0',
        tags: metadata.tags || runtime.tags || [],
        created_at: metadata.created_at || new Date().toISOString(),
        updated_at: metadata.updated_at || new Date().toISOString()
      },
      tools: tools?.tools?.map((t: any) => ({
        id: t.tool_id,
        tool_id: t.tool_id,
        tool_name: t.name,
        enabled: t.enabled,
        parameters: [],
        on_error: 'continue' as const
      })) || [],
      workflows: [],
      ui_layout: {
        show_header: ui?.show_header ?? true,
        header_title: ui?.header_title,
        header_subtitle: ui?.header_subtitle,
        header_icon: ui?.header_icon,
        sections: (ui?.sections || []).map((section: any, idx: number) => ({
          id: `section-${idx}-${section.name}`,
          name: section.name,
          title: section.title,
          layout_type: section.layout_type as 'column' | 'row' | 'grid',
          gap: section.gap,
          grid_columns: section.grid_columns,
          visible_when: section.visible_when,
          collapsible: section.collapsible,
          collapsed_default: section.collapsed_default,
          components: (section.components || []).map((comp: any, compIdx: number) => ({
            id: `comp-${idx}-${compIdx}-${comp.name}`,
            type: comp.type as ComponentType,
            name: comp.name,
            label: comp.label,
            placeholder: comp.placeholder,
            help_text: comp.help_text,
            default_value: comp.default_value,
            required: comp.required,
            options: comp.options,
            accept: comp.accept,
            multiple: comp.multiple,
            max_size_mb: comp.max_size_mb,
            visible_when: comp.visible_when,
            style: comp.style,
            auto_bind_output: (comp as any)['auto_bind_output'],
            data_source: (comp as any)['data_source'],
            button_action: (comp as any)['button_action'],
            button_variant: (comp as any)['button_variant'],
            is_trigger_button: (comp as any)['is_trigger_button']
          } as UIComponent))
        })),
        show_sidebar: ui?.show_sidebar,
        sidebar_sections: ui?.sidebar_sections?.map((section: any, idx: number) => ({
          id: `sidebar-${idx}-${section.name}`,
          name: section.name,
          title: section.title,
          layout_type: section.layout_type as 'column' | 'row' | 'grid',
          gap: section.gap,
          components: (section.components || []).map((comp: any, compIdx: number) => ({
            id: `sidebar-comp-${idx}-${compIdx}-${comp.name}`,
            type: comp.type as ComponentType,
            name: comp.name,
            label: comp.label
          } as UIComponent))
        })),
        show_footer: ui?.show_footer,
        show_actions: ui?.show_actions,
        actions: (ui?.actions || []).map((action: any, idx: number) => ({
          id: `action-${idx}-${action.name}`,
          type: action.type as ComponentType,
          name: action.name,
          label: action.label,
          button_action: action.button_action,
          button_variant: action.button_variant,
          is_trigger_button: action.is_trigger_button,
          visible_when: action.visible_when
        } as UIComponent)),
        actions_position: ui?.actions_position as 'left' | 'center' | 'right',
        theme: ui?.theme as 'light' | 'dark' | 'auto',
        primary_color: ui?.primary_color
      },
      ai_behavior: {
        system_prompt: (runtime as any).business_logic?.system_prompt || '',
        user_prompt: (runtime as any).business_logic?.user_prompt_template,
        default_provider: (runtime as any).business_logic?.llm_provider || 'mistral',
        default_model: (runtime as any).business_logic?.llm_model,
        temperature: (runtime as any).business_logic?.temperature ?? 0.7,
        max_tokens: (runtime as any).business_logic?.max_tokens ?? 4096,
        streaming_enabled: (runtime as any).business_logic?.streaming_enabled ?? true
      }
    } as AgentDefinition;
  }

  loadAgent(agentId: string): void {
    this.loading = true;
    this.error = null;

    this.subscription = this.agentBuilderService.getAgent(agentId).subscribe({
      next: (agent) => {
        this.agent = agent;
        this.loading = false;
        this.initializeFormData();
        this.initializeCollapsedSections();
        this.loadLLMConfig();
        this.initializeChat();
      },
      error: (err) => {
        console.error('Failed to load agent:', err);
        this.error = 'Failed to load agent. It may not exist or there was a connection error.';
        this.loading = false;
      }
    });
  }

  initializeFormData(): void {
    if (!this.agent) return;

    // Initialize form data with default values from components
    for (const section of this.agent.ui_layout.sections) {
      for (const component of section.components) {
        if (component.default_value !== undefined) {
          this.formData[component.name] = component.default_value;
        }
      }
    }
  }

  initializeCollapsedSections(): void {
    if (!this.agent) return;
    for (const section of this.agent.ui_layout.sections) {
      if (section.collapsible) {
        this.collapsedSections[section.name] = section.collapsed_default ?? false;
      }
    }
  }

  toggleSectionCollapse(sectionName: string): void {
    this.collapsedSections[sectionName] = !this.collapsedSections[sectionName];
  }

  loadLLMConfig(): void {
    if (!this.agent || !this.agent.ai_behavior) return;

    // Get global LLM settings (includes API keys configured at platform level)
    const globalLLMSettings = this.globalSettingsService.getLLMSettings();

    // Start with agent's AI behavior configuration as the base
    const behavior = this.agent.ai_behavior;
    const defaultConfig: AgentConfig = {
      provider: behavior.default_provider || globalLLMSettings.defaultProvider || 'mistral',
      // Use global API keys as defaults
      mistralApiKey: globalLLMSettings.apiKeys?.mistral || '',
      mistralModel: behavior.default_provider === 'mistral' ? (behavior.default_model || globalLLMSettings.defaultModels?.mistral || 'mistral-small-latest') : (globalLLMSettings.defaultModels?.mistral || 'mistral-small-latest'),
      openaiApiKey: globalLLMSettings.apiKeys?.openai || '',
      openaiModel: behavior.default_provider === 'openai' ? (behavior.default_model || globalLLMSettings.defaultModels?.openai || 'gpt-4o') : (globalLLMSettings.defaultModels?.openai || 'gpt-4o'),
      anthropicApiKey: globalLLMSettings.apiKeys?.anthropic || '',
      anthropicModel: behavior.default_provider === 'anthropic' ? (behavior.default_model || globalLLMSettings.defaultModels?.anthropic || 'claude-3-5-sonnet-20241022') : (globalLLMSettings.defaultModels?.anthropic || 'claude-3-5-sonnet-20241022'),
      geminiApiKey: globalLLMSettings.apiKeys?.gemini || '',
      geminiModel: behavior.default_provider === 'gemini' ? (behavior.default_model || globalLLMSettings.defaultModels?.gemini || 'gemini-2.0-flash-exp') : (globalLLMSettings.defaultModels?.gemini || 'gemini-2.0-flash-exp'),
      perplexityApiKey: globalLLMSettings.apiKeys?.perplexity || '',
      perplexityModel: behavior.default_provider === 'perplexity' ? (behavior.default_model || globalLLMSettings.defaultModels?.perplexity || 'sonar') : (globalLLMSettings.defaultModels?.perplexity || 'sonar'),
      nvidiaNimApiKey: globalLLMSettings.apiKeys?.['nvidia-nim'] || '',
      nvidiaNimModel: behavior.default_provider === 'nvidia-nim' ? (behavior.default_model || globalLLMSettings.defaultModels?.['nvidia-nim'] || 'meta/llama-3.1-8b-instruct') : (globalLLMSettings.defaultModels?.['nvidia-nim'] || 'meta/llama-3.1-8b-instruct'),
      temperature: behavior.temperature || globalLLMSettings.defaults?.temperature || 0.7,
      maxTokens: behavior.max_tokens || globalLLMSettings.defaults?.maxTokens || 4096
    };

    // Try to load user-overridden config from localStorage (for API keys mainly)
    const storageKey = `${this.agent.id}-config`;
    const savedConfig = localStorage.getItem(storageKey);

    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        // Merge saved config with default config, prioritizing saved API keys but keeping default provider/model if not changed
        // User's saved API keys override global keys, but global keys are used if user hasn't configured them
        this.llmConfig = {
          ...defaultConfig,
          ...parsedConfig,
          // Ensure we use agent's default provider and model if user hasn't explicitly changed them
          provider: parsedConfig.provider || defaultConfig.provider,
          // For API keys: use saved if present, otherwise fallback to global
          mistralApiKey: parsedConfig.mistralApiKey || defaultConfig.mistralApiKey,
          openaiApiKey: parsedConfig.openaiApiKey || defaultConfig.openaiApiKey,
          anthropicApiKey: parsedConfig.anthropicApiKey || defaultConfig.anthropicApiKey,
          geminiApiKey: parsedConfig.geminiApiKey || defaultConfig.geminiApiKey,
          perplexityApiKey: parsedConfig.perplexityApiKey || defaultConfig.perplexityApiKey,
          nvidiaNimApiKey: parsedConfig.nvidiaNimApiKey || defaultConfig.nvidiaNimApiKey,
          // For models: use saved if present, otherwise fallback to default
          mistralModel: parsedConfig.mistralModel || defaultConfig.mistralModel,
          openaiModel: parsedConfig.openaiModel || defaultConfig.openaiModel,
          anthropicModel: parsedConfig.anthropicModel || defaultConfig.anthropicModel,
          geminiModel: parsedConfig.geminiModel || defaultConfig.geminiModel,
          perplexityModel: parsedConfig.perplexityModel || defaultConfig.perplexityModel,
          nvidiaNimModel: parsedConfig.nvidiaNimModel || defaultConfig.nvidiaNimModel,
          temperature: parsedConfig.temperature !== undefined ? parsedConfig.temperature : defaultConfig.temperature,
          maxTokens: parsedConfig.maxTokens !== undefined ? parsedConfig.maxTokens : defaultConfig.maxTokens
        };
      } catch (e) {
        console.error('Error parsing saved config:', e);
        this.llmConfig = defaultConfig;
      }
    } else {
      // No saved config, use default from agent behavior with global API keys
      this.llmConfig = defaultConfig;
    }
  }

  initializeChat(): void {
    if (!this.agent) return;

    // Add proactive welcome message that invites user to provide content
    const welcomeContent = `Bonjour ! Je suis **${this.agent.name}**.

${this.agent.description}

📝 **Pour commencer**, vous pouvez :
- M'envoyer un **texte** à analyser
- Joindre une **image** ou un **document** (cliquez sur 📎)

📎 **Joignez vos fichiers** puis tapez **go** (ou votre question) pour lancer l'analyse.

Je suis prêt à vous aider !`;

    this.chatMessages = [{
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date()
    }];
  }

  openConfigDialog(): void {
    if (!this.agent || !this.llmConfig) return;

    const dialogRef = this.dialog.open(AgentConfigDialogComponent, {
      width: '600px',
      data: {
        config: { ...this.llmConfig },
        agentId: this.agent.id,
        agentName: this.agent.name
      }
    });

    dialogRef.afterClosed().subscribe((result: AgentConfig) => {
      if (result) {
        this.llmConfig = result;
        this.snackBar.open('Configuration saved', 'OK', { duration: 2000 });
      }
    });
  }

  // ============== UI Component Helpers ==============

  isInputComponent(type: ComponentType): boolean {
    const inputTypes: ComponentType[] = [
      'text_input', 'textarea', 'number_input', 'email_input', 'password_input',
      'date_picker', 'time_picker', 'datetime_picker', 'select', 'multi_select',
      'checkbox', 'radio_group', 'slider', 'toggle',
    ];
    return inputTypes.includes(type);
  }

  isFileComponent(type: ComponentType): boolean {
    const fileTypes: ComponentType[] = ['file_upload', 'image_upload', 'document_upload', 'document_repository'];
    return fileTypes.includes(type);
  }

  isDisplayComponent(type: ComponentType): boolean {
    const displayTypes: ComponentType[] = ['text_display', 'markdown_viewer', 'pdf_viewer', 'image_viewer', 'code_viewer'];
    return displayTypes.includes(type);
  }

  isChartComponent(type: ComponentType): boolean {
    const chartTypes: ComponentType[] = ['bar_chart', 'line_chart', 'pie_chart', 'donut_chart'];
    return chartTypes.includes(type);
  }

  isInteractiveComponent(type: ComponentType): boolean {
    const interactiveTypes: ComponentType[] = ['chat_interface', 'button', 'button_group', 'progress_bar', 'data_table', 'list', 'tree_view'];
    return interactiveTypes.includes(type);
  }

  getInputType(type: ComponentType): string {
    const typeMap: Record<string, string> = {
      text_input: 'text',
      number_input: 'number',
      email_input: 'email',
      password_input: 'password',
      date_picker: 'date',
      time_picker: 'time',
      datetime_picker: 'datetime-local',
    };
    return typeMap[type] || 'text';
  }

  getSectionStyle(section: LayoutSection): Record<string, string> {
    const style: Record<string, string> = {};

    if (section.layout_type === 'grid') {
      style['display'] = 'grid';
      style['grid-template-columns'] = `repeat(${section.grid_columns || 2}, 1fr)`;
    } else if (section.layout_type === 'row') {
      style['display'] = 'flex';
      style['flex-direction'] = 'row';
      style['flex-wrap'] = 'wrap';
    } else {
      style['display'] = 'flex';
      style['flex-direction'] = 'column';
    }

    style['gap'] = section.gap || '16px';

    return style;
  }

  // ============== File Handling ==============

  onFileSelect(event: any, componentName: string): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray: File[] = [];
    for (let i = 0; i < files.length; i++) {
      fileArray.push(files[i]);
    }

    this.uploadedFiles.set(componentName, fileArray);
    event.target.value = '';
  }

  getUploadedFileNames(componentName: string): string[] {
    const files = this.uploadedFiles.get(componentName);
    return files ? files.map(f => f.name) : [];
  }

  removeFile(componentName: string, index: number): void {
    const files = this.uploadedFiles.get(componentName);
    if (files) {
      files.splice(index, 1);
      if (files.length === 0) {
        this.uploadedFiles.delete(componentName);
      }
    }
  }

  // ============== Button Actions ==============

  isExportWordAction(component: UIComponent): boolean {
    return (component.button_action as string) === 'export_word';
  }

  onButtonClick(component: UIComponent): void {
    console.log('🔘 Button clicked:', component.label, 'action:', component.button_action, 'is_trigger:', component.is_trigger_button);
    if (component.button_action === 'trigger_agent' || component.is_trigger_button) {
      console.log('▶️ Executing agent...');
      this.executeAgent();
    } else if (component.button_action === 'submit_form') {
      this.submitForm();
    } else if (component.button_action === 'reset_form') {
      this.resetForm();
    } else if ((component.button_action as string) === 'export_word') {
      console.log('📄 Exporting to Word...');
      this.exportToWord();
    } else if (component.button_action === 'download') {
      console.log('📥 Downloading results...');
      this.downloadResultsAsZip();
    }
  }

  submitForm(): void {
    // Validate required fields
    if (this.agent) {
      for (const section of this.agent.ui_layout.sections) {
        for (const component of section.components) {
          if (component.required && !this.formData[component.name]) {
            this.snackBar.open(`Field "${component.label || component.name}" is required`, 'OK', { duration: 3000 });
            return;
          }
        }
      }
    }

    // Execute the agent with form data
    this.executeAgent();
  }

  resetForm(): void {
    this.formData = {};
    this.uploadedFiles.clear();
    this.executionResult = null;
    this.executionResultJson = null;
    this.initializeFormData();
  }

  // ============== Agent Execution ==============

  private getProviderConfig(): { provider: string; apiKey: string; model: string } | null {
    if (!this.llmConfig) return null;

    const provider = this.llmConfig.provider;
    let apiKey = '';
    let model = '';

    switch (provider) {
      case 'mistral':
        apiKey = this.llmConfig.mistralApiKey;
        model = this.llmConfig.mistralModel;
        break;
      case 'openai':
        apiKey = this.llmConfig.openaiApiKey;
        model = this.llmConfig.openaiModel;
        break;
      case 'anthropic':
        apiKey = this.llmConfig.anthropicApiKey;
        model = this.llmConfig.anthropicModel;
        break;
      case 'gemini':
        apiKey = this.llmConfig.geminiApiKey;
        model = this.llmConfig.geminiModel;
        break;
      case 'perplexity':
        apiKey = this.llmConfig.perplexityApiKey;
        model = this.llmConfig.perplexityModel;
        break;
      case 'nvidia-nim':
        apiKey = this.llmConfig.nvidiaNimApiKey;
        model = this.llmConfig.nvidiaNimModel;
        break;
    }

    return { provider, apiKey, model };
  }

  private hasUploadedFiles(): boolean {
    return this.uploadedFiles.size > 0 &&
           Array.from(this.uploadedFiles.values()).some(files => files.length > 0);
  }

  private getAllUploadedFiles(): File[] {
    const allFiles: File[] = [];
    for (const files of this.uploadedFiles.values()) {
      allFiles.push(...files);
    }
    return allFiles;
  }

  async executeAgent(): Promise<void> {
    // Debug logging for all early exit conditions
    if (!this.agent) {
      console.warn('⚠️ executeAgent aborted: agent not loaded');
      return;
    }
    if (!this.llmConfig) {
      console.warn('⚠️ executeAgent aborted: llmConfig not set');
      return;
    }
    if (this.isExecuting) {
      console.warn('⚠️ executeAgent aborted: already executing');
      return;
    }

    const config = this.getProviderConfig();
    if (!config) {
      console.warn('⚠️ executeAgent aborted: getProviderConfig returned null');
      return;
    }

    const { provider, apiKey, model } = config;

    if (!apiKey) {
      console.warn(`⚠️ executeAgent aborted: no API key for ${provider}`);
      this.snackBar.open(`Please configure your ${provider} API key in settings`, 'Configure', { duration: 5000 })
        .onAction().subscribe(() => this.openConfigDialog());
      return;
    }

    console.log('🚀 Starting agent execution with:', { provider, model, hasFiles: this.hasUploadedFiles() });
    this.isExecuting = true;
    this.executionProgress = 0;
    this.progressLabel = '';
    this.executionResultJson = null;
    this.executionResult = null;
    this.requestStartTime = Date.now();

    // Detect if this is a tender/iterative agent
    const agentId = this.agent.id?.toLowerCase() || '';
    const isTenderAgent = agentId.includes('tender') || agentId.includes('appel') || agentId.includes('offre');

    if (isTenderAgent && this.hasUploadedFiles()) {
      await this.executeAgentIterative(provider, model, apiKey);
    } else {
      await this.executeAgentSingle(provider, model, apiKey);
    }
  }

  /**
   * Standard single-request execution
   */
  private async executeAgentSingle(provider: string, model: string, apiKey: string): Promise<void> {
    try {
      const systemPrompt = this.enrichSystemPrompt(this.agent!.ai_behavior?.system_prompt || '');
      const userPrompt = this.buildUserPrompt();

      this.chatMessages.push({ role: 'user', content: userPrompt, timestamp: new Date() });
      this.shouldScrollToBottom = true;
      this.executionProgress = 30;

      let response: ChatResponse;
      if (this.hasUploadedFiles()) {
        response = await this.executeWithFiles(systemPrompt, userPrompt, provider, model, apiKey);
      } else {
        response = await this.executeWithoutFiles(systemPrompt, provider, model, apiKey);
      }

      this.executionProgress = 100;

      if (response.success && response.message) {
        this.chatMessages.push({ role: 'assistant', content: response.message.content, timestamp: new Date() });
        this.executionResult = response.message.content;
        this.executionResultJson = this.extractJsonFromContent(response.message.content);
        const durationMs = Date.now() - this.requestStartTime;
        this.recordTokenConsumption(userPrompt, response.message.content, provider, model, response.usage, durationMs);
        this.cdr.detectChanges();
      } else {
        const errorMsg = response.blocked_reason || response.error || 'Unknown error';
        this.chatMessages.push({ role: 'assistant', content: errorMsg, timestamp: new Date(), isError: true });
      }
      this.shouldScrollToBottom = true;
    } catch (error: any) {
      console.error('Agent execution failed:', error);
      const errorMessage = error.error?.detail || error.message || 'Execution failed';
      this.chatMessages.push({ role: 'assistant', content: `Error: ${errorMessage}`, timestamp: new Date(), isError: true });
      this.shouldScrollToBottom = true;
    } finally {
      this.isExecuting = false;
      this.progressLabel = '';
    }
  }

  /**
   * Iterative chapter-by-chapter execution for tender/large document agents.
   * Generates the document in multiple smaller requests to avoid timeouts.
   */
  private async executeAgentIterative(provider: string, model: string, apiKey: string): Promise<void> {
    const chapters = [
      {
        label: 'Présentation de la société & Compréhension du besoin',
        prompt: `Tu es un expert en réponse aux appels d'offres IT (hardware, software, cloud, cybersécurité, IA, data, IoT, DevOps, FinOps, datacenter).

En te basant sur le contexte de la conversation précédente (documents d'appel d'offres analysés), rédige les chapitres suivants du mémoire technique de façon TRÈS DÉTAILLÉE et PROFESSIONNELLE :

# MÉMOIRE TECHNIQUE

## 1. PRÉSENTATION DE LA SOCIÉTÉ
- Historique, chiffres clés, implantations
- Certifications (ISO 27001, ISO 9001, ITIL, etc.)
- Politique RSE et développement durable
- Références clients majeures avec descriptions détaillées
- Moyens humains par pôle d'expertise
- Moyens techniques et infrastructures

## 2. COMPRÉHENSION DU BESOIN
- Analyse approfondie du contexte client
- Enjeux stratégiques et opérationnels identifiés
- Objectifs du marché
- Périmètre détaillé
- Contraintes et points d'attention

${this.formData['company_name'] ? 'Société répondante : ' + this.formData['company_name'] : ''}

Rédige au minimum 3 pages par chapitre. Utilise des tableaux markdown. Ton professionnel et institutionnel.`
      },
      {
        label: 'Solution technique proposée',
        prompt: `Continue le mémoire technique. En te basant sur les documents d'appel d'offres analysés précédemment, rédige :

## 3. SOLUTION TECHNIQUE PROPOSÉE

### 3.1 Architecture globale
(Composants, flux, intégrations, schéma d'architecture textuel)

### 3.2 Description détaillée par composante
(Pour CHAQUE exigence du cahier des charges : solution proposée, spécifications techniques, dimensionnement)

### 3.3 Infrastructure et environnements
(Production, pré-production, développement, PRA/PCA)

### 3.4 Sécurité
(Mesures de sécurité, conformité RGPD, chiffrement, IAM, SOC, audit)

### 3.5 Performances et scalabilité
(Objectifs, tests de charge, capacity planning, monitoring)

Inclus un TABLEAU DE CONFORMITÉ TECHNIQUE :
| Exigence CCTP | Notre réponse | Conformité | Commentaire |

Sois très précis et technique. Minimum 4 pages.`
      },
      {
        label: 'Organisation, méthodologie & SLA',
        prompt: `Continue le mémoire technique. Rédige :

## 4. ORGANISATION ET GOUVERNANCE
- Équipe projet dédiée (noms de rôle, profils, expérience)
- Matrice RACI détaillée
- Comitologie (COPIL, COTECH, fréquence, participants)
- Reporting et KPIs de pilotage

## 5. MÉTHODOLOGIE DE MISE EN ŒUVRE
- Phases détaillées du projet
- Planning avec jalons clés
- Livrables par phase
- Critères d'acceptation
- Gestion des risques (matrice probabilité/impact)
- Plan de conduite du changement

## 6. ENGAGEMENTS DE SERVICE (SLA)

| Indicateur | Définition | Cible | Mesure | Pénalité |
|------------|-----------|-------|--------|----------|
(Remplis avec des valeurs réalistes)

- GTI/GTR par niveau de criticité
- Procédures d'escalade détaillées
- Astreintes et support N1/N2/N3
- Plan de réversibilité

Utilise des tableaux pour la matrice RACI et les SLA. Minimum 4 pages.`
      },
      {
        label: 'Valeur ajoutée & Annexes',
        prompt: `Finalise le mémoire technique. Rédige les derniers chapitres :

## 7. VALEUR AJOUTÉE ET DIFFÉRENCIATEURS
- Innovations proposées (IA, automatisation, etc.)
- Optimisations techniques et financières
- Retours d'expérience sur projets similaires
- Engagements RSE et développement durable
- Accompagnement au changement et transfert de compétences
- Quick wins identifiés

## 8. ANNEXES

### 8.1 Fiches de références détaillées
(3-5 références avec : client, contexte, périmètre, effectifs, durée, résultats mesurables)

### 8.2 CV des intervenants clés
(Chef de projet, Architecte technique, Experts - format synthétique avec certifications)

### 8.3 Certifications et agréments
(Tableau des certifications éditeurs, ISO, qualifications)

### 8.4 Glossaire et acronymes

## CONCLUSION
(Synthèse des points forts de notre proposition, engagement fort du management)

Termine de façon professionnelle et engageante. Minimum 3 pages.`
      }
    ];

    const allFiles = this.getAllUploadedFiles();
    // Total steps = file extractions + chapter generations
    const totalSteps = allFiles.length + chapters.length;
    let currentStep = 0;

    let fullContent = '';
    let extractionParts: string[] = [];

    try {
      // ── Phase 1: Extract each file individually ──
      // Sending files one by one avoids exceeding token limits per request
      const extractionPrompt = `Tu es un expert en analyse de documents d'appels d'offres IT.
Analyse en détail le document fourni et extrais de façon structurée :
- Objet, périmètre, contexte
- Exigences techniques et fonctionnelles détaillées
- Critères de notation et pondération
- Lots, tranches, options
- Délais, jalons, planning
- Pénalités, SLA, GTI/GTR
- Contraintes spécifiques, normes, certifications requises
- Tout tableau, matrice ou grille importante

Sois exhaustif et structuré. Utilise des titres et des listes. Conserve tous les détails importants.`;

      for (let f = 0; f < allFiles.length; f++) {
        currentStep++;
        const file = allFiles[f];
        this.progressLabel = `Étape ${currentStep}/${totalSteps} — Analyse de "${file.name}"`;
        this.executionProgress = Math.round((currentStep / totalSteps) * 100);
        this.executionResult = `⏳ *Analyse des documents en cours (${f + 1}/${allFiles.length})...*`;
        this.cdr.detectChanges();

        console.log(`📄 Extracting file ${f + 1}/${allFiles.length}: ${file.name}`);

        const response = await this.executeWithSingleFile(
          file,
          extractionPrompt,
          `Analyse ce document en détail : ${file.name}`,
          provider, model, apiKey
        );

        if (response.success && response.message) {
          extractionParts.push(`### Document : ${file.name}\n\n${response.message.content}`);
          console.log(`✅ File ${file.name} extracted (${response.message.content.length} chars)`);
        } else {
          const errorMsg = response.error || 'Erreur d\'extraction';
          console.error(`❌ File ${file.name} failed:`, errorMsg);
          extractionParts.push(`### Document : ${file.name}\n\n> ⚠️ Erreur: ${errorMsg}`);
        }
      }

      const fullExtraction = extractionParts.join('\n\n---\n\n');
      console.log(`📋 Full extraction: ${fullExtraction.length} chars from ${allFiles.length} files`);

      // ── Phase 2: Generate chapters using the extracted context ──
      this.executionResult = '⏳ *Analyse terminée. Rédaction du mémoire technique en cours...*\n\n---\n\n';
      this.cdr.detectChanges();

      for (let i = 0; i < chapters.length; i++) {
        currentStep++;
        const chapter = chapters[i];

        this.progressLabel = `Étape ${currentStep}/${totalSteps} — ${chapter.label}`;
        this.executionProgress = Math.round((currentStep / totalSteps) * 100);
        this.cdr.detectChanges();

        console.log(`📝 Generating chapter ${i + 1}/${chapters.length}: ${chapter.label}`);

        const contextPrompt = `Voici l'analyse détaillée des documents d'appel d'offres :\n\n${fullExtraction}\n\n---\n\nMaintenant, rédige le chapitre suivant du mémoire technique :\n\n${chapter.prompt}`;

        const response = await this.executeChapterDirect(
          'Tu es un expert en rédaction de mémoires techniques pour appels d\'offres IT. Rédige de façon TRÈS DÉTAILLÉE et PROFESSIONNELLE.',
          contextPrompt,
          provider, model, apiKey
        );

        if (response.success && response.message) {
          fullContent += (fullContent ? '\n\n' : '') + response.message.content;
          this.executionResult = fullContent;
          this.cdr.detectChanges();
          console.log(`✅ Chapter "${chapter.label}" done (${response.message.content.length} chars)`);
        } else {
          const errorMsg = response.error || 'Erreur de génération';
          console.error(`❌ Chapter "${chapter.label}" failed:`, errorMsg);
          fullContent += `\n\n> ⚠️ Erreur lors de la génération de "${chapter.label}": ${errorMsg}\n\n`;
          this.executionResult = fullContent;
          this.cdr.detectChanges();
        }
      }

      // Final
      this.executionProgress = 100;
      this.progressLabel = 'Génération terminée ✓';
      this.executionResult = fullContent;

      this.chatMessages.push({
        role: 'assistant',
        content: fullContent,
        timestamp: new Date()
      });

      this.cdr.detectChanges();
      this.snackBar.open('Mémoire technique généré avec succès', 'OK', { duration: 5000 });

    } catch (error: any) {
      console.error('Iterative execution failed:', error);
      const errorMessage = error.error?.detail || error.message || 'Execution failed';
      this.chatMessages.push({
        role: 'assistant',
        content: `Erreur: ${errorMessage}`,
        timestamp: new Date(),
        isError: true
      });
      this.progressLabel = 'Erreur de génération';
    } finally {
      this.isExecuting = false;
      this.shouldScrollToBottom = true;
    }
  }

  /**
   * Send a single file for extraction — no conversation history, one file at a time.
   */
  private async executeWithSingleFile(
    file: File,
    systemPrompt: string,
    userPrompt: string,
    provider: string,
    model: string,
    apiKey: string
  ): Promise<ChatResponse> {
    const formData = new FormData();
    const fullMessage = `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${userPrompt}`;

    const temperature = this.llmConfig!.temperature;
    const maxTokens = this.llmConfig!.maxTokens;

    formData.append('message', fullMessage);
    formData.append('provider', provider);
    formData.append('model', model);
    formData.append('temperature', temperature.toString());
    formData.append('max_tokens', maxTokens.toString());
    formData.append('strict_moderation', 'false');
    formData.append(`${provider.replace('-', '_')}_api_key`, apiKey);
    formData.append('files', file, file.name);

    return await firstValueFrom(
      this.http.post<ChatResponse>('/api/v1/chat/completions/multipart', formData).pipe(
        timeout(600000)
      )
    );
  }

  /**
   * Send a single system+user message pair — no conversation history.
   * Keeps token count minimal for providers with low TPM limits (e.g. OpenAI 30K).
   */
  private async executeChapterDirect(
    systemPrompt: string,
    userPrompt: string,
    provider: string,
    model: string,
    apiKey: string
  ): Promise<ChatResponse> {
    const temperature = this.llmConfig!.temperature;
    const maxTokens = this.llmConfig!.maxTokens;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const requestBody = {
      messages,
      provider,
      model,
      temperature,
      max_tokens: maxTokens,
      [`${provider.replace('-', '_')}_api_key`]: apiKey
    };

    return await firstValueFrom(
      this.http.post<ChatResponse>('/api/v1/chat/completions', requestBody).pipe(
        timeout(300000)
      )
    );
  }

  private async executeWithoutFiles(
    systemPrompt: string,
    provider: string,
    model: string,
    apiKey: string,
    overrideUserPrompt?: string
  ): Promise<ChatResponse> {
    // Validate temperature and max_tokens to match backend constraints
    const temperature = this.llmConfig!.temperature;
    const maxTokens = this.llmConfig!.maxTokens;

    if (temperature < 0.0 || temperature > 2.0) {
      throw new Error(`Temperature must be between 0.0 and 2.0 (current: ${temperature})`);
    }
    if (maxTokens < 1 || maxTokens > 32000) {
      throw new Error(`Max tokens must be between 1 and 32000 (current: ${maxTokens})`);
    }

    // Build messages - if overrideUserPrompt is provided, add it as a new user message
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.chatMessages.map(m => ({ role: m.role, content: m.content }))
    ];

    if (overrideUserPrompt) {
      messages.push({ role: 'user', content: overrideUserPrompt });
    }

    const requestBody = {
      messages,
      provider: provider,
      model: model,
      temperature,
      max_tokens: maxTokens,
      [`${provider.replace('-', '_')}_api_key`]: apiKey
    };

    return await firstValueFrom(
      this.http.post<ChatResponse>('/api/v1/chat/completions', requestBody).pipe(
        timeout(300000) // 5 minutes per chapter
      )
    );
  }

  private async executeWithFiles(
    systemPrompt: string,
    userPrompt: string,
    provider: string,
    model: string,
    apiKey: string
  ): Promise<ChatResponse> {
    const formData = new FormData();

    // Build the message with system prompt context
    // For image/document analysis, allow empty user prompt if files are provided
    let fullMessage = systemPrompt
      ? `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${userPrompt}`
      : userPrompt;

    // If message is empty but we have files, add a default analysis prompt
    if (!fullMessage.trim() && this.hasUploadedFiles()) {
      fullMessage = 'Analyze the provided file(s).';
    }

    // Validate temperature and max_tokens to match backend constraints
    const temperature = this.llmConfig!.temperature;
    const maxTokens = this.llmConfig!.maxTokens;

    if (temperature < 0.0 || temperature > 2.0) {
      throw new Error(`Temperature must be between 0.0 and 2.0 (current: ${temperature})`);
    }
    if (maxTokens < 1 || maxTokens > 32000) {
      throw new Error(`Max tokens must be between 1 and 32000 (current: ${maxTokens})`);
    }

    // Debug logging
    console.log('📤 Preparing multipart request:', {
      messageLength: fullMessage.length,
      provider,
      model,
      temperature,
      maxTokens,
      filesCount: this.getAllUploadedFiles().length,
      historyLength: this.chatMessages.length - 1
    });

    formData.append('message', fullMessage);
    formData.append('provider', provider);
    formData.append('model', model);
    formData.append('temperature', temperature.toString());
    formData.append('max_tokens', maxTokens.toString());
    formData.append('strict_moderation', 'false');
    formData.append(`${provider.replace('-', '_')}_api_key`, apiKey);

    // Add conversation history (excluding the last user message we just added)
    const historyMessages = this.chatMessages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }));
    if (historyMessages.length > 0) {
      formData.append('conversation_history', JSON.stringify(historyMessages));
    }

    // Add all uploaded files
    const files = this.getAllUploadedFiles();
    console.log('📎 Adding files to request:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    for (const file of files) {
      formData.append('files', file, file.name);
    }

    try {
      console.log('🌐 Sending HTTP POST to /api/v1/chat/completions/multipart...');
      const startTime = Date.now();

      const response = await firstValueFrom(
        this.http.post<ChatResponse>('/api/v1/chat/completions/multipart', formData).pipe(
          timeout(600000) // 10 minutes timeout for large document processing
        )
      );

      console.log(`✅ HTTP response received in ${(Date.now() - startTime) / 1000}s:`, response);
      return response;
    } catch (error: any) {
      console.error('❌ Multipart request failed:', error);

      // Extract detailed error message from backend
      if (error.status === 400 && error.error) {
        const detail = error.error.detail;
        if (Array.isArray(detail)) {
          // Pydantic validation errors
          const validationErrors = detail.map((err: any) =>
            `${err.loc?.join('.') || 'unknown'}: ${err.msg}`
          ).join(', ');
          throw new Error(`Validation failed: ${validationErrors}`);
        } else if (typeof detail === 'string') {
          throw new Error(`Bad request: ${detail}`);
        }
      }
      throw error;
    }
  }

  // ============== DASHBOARD GRID METHODS ==============

  getDashboardGridStyle(): Record<string, string> {
    const config = this.agent?.ui_layout?.dashboard_config || {
      columns: 12,
      rowHeight: 80,
      gap: 12
    };
    return {
      'display': 'grid',
      'grid-template-columns': `repeat(${config.columns}, 1fr)`,
      'grid-auto-rows': `${config.rowHeight}px`,
      'gap': `${config.gap}px`,
      'padding': '16px'
    };
  }

  getWidgetGridStyle(widget: UIComponent): Record<string, string> {
    const pos = (widget as any).gridPosition || { x: 0, y: 0, w: 4, h: 2 };
    return {
      'grid-column': `${pos.x + 1} / span ${pos.w}`,
      'grid-row': `${pos.y + 1} / span ${pos.h}`,
      'min-height': '0'
    };
  }

  /**
   * Enriches the system prompt with auto-generated output formatting instructions
   * for components with auto_bind_output enabled.
   */
  private enrichSystemPrompt(basePrompt: string): string {
    if (!this.agent?.ui_layout) {
      return basePrompt;
    }

    // Find all components with auto_bind_output enabled
    // Check both widgets (dashboard mode) and sections (classic mode)
    const autoBindComponents: UIComponent[] = [];

    // Check widgets (dashboard mode)
    if (this.agent.ui_layout.widgets) {
      for (const widget of this.agent.ui_layout.widgets) {
        if (widget.auto_bind_output && this.isChartComponent(widget.type)) {
          autoBindComponents.push(widget);
        }
      }
    }

    // Check sections (classic mode)
    if (this.agent.ui_layout.sections) {
      for (const section of this.agent.ui_layout.sections) {
        for (const component of section.components) {
          if (component.auto_bind_output && this.isChartComponent(component.type)) {
            autoBindComponents.push(component);
          }
        }
      }
    }

    if (autoBindComponents.length === 0) {
      return basePrompt;
    }

    // Build the output format instructions
    const formatInstructions: string[] = [
      '\n\n## OUTPUT FORMAT INSTRUCTIONS',
      'IMPORTANT: You must format your response as JSON with the following structure:',
      '```json',
      '{'
    ];

    autoBindComponents.forEach((component, index) => {
      const componentName = component.name || component.label || `chart_${index + 1}`;
      const chartType = this.getChartTypeName(component.type);

      formatInstructions.push(`  "${componentName}": {`);
      formatInstructions.push(`    "labels": ["Label 1", "Label 2", "Label 3"],`);
      formatInstructions.push(`    "datasets": [`);
      formatInstructions.push(`      {`);
      formatInstructions.push(`        "label": "Dataset Name",`);
      formatInstructions.push(`        "data": [value1, value2, value3]`);
      formatInstructions.push(`      }`);
      formatInstructions.push(`    ]`);
      formatInstructions.push(`  }${index < autoBindComponents.length - 1 ? ',' : ''}`);
    });

    formatInstructions.push('}');
    formatInstructions.push('```');
    formatInstructions.push('\nYou can add explanatory text before or after the JSON, but the JSON structure is REQUIRED.');

    if (autoBindComponents.length === 1) {
      formatInstructions.push(`\nThis data will be automatically displayed as a ${this.getChartTypeName(autoBindComponents[0].type)}.`);
    } else {
      formatInstructions.push(`\nThis data will be automatically displayed as charts.`);
    }

    return basePrompt + formatInstructions.join('\n');
  }

  /**
   * Get a human-readable chart type name
   */
  private getChartTypeName(type: ComponentType): string {
    const typeMap: Record<string, string> = {
      'line_chart': 'line chart',
      'bar_chart': 'bar chart',
      'pie_chart': 'pie chart',
      'donut_chart': 'donut chart'
    };
    return typeMap[type] || 'chart';
  }

  buildUserPrompt(): string {
    // If agent has a configured user_prompt, use it as the base
    const configuredUserPrompt = this.agent?.ai_behavior?.user_prompt;

    if (configuredUserPrompt && configuredUserPrompt.trim()) {
      // Use the configured user prompt as the main instruction
      const parts: string[] = [configuredUserPrompt];

      // Add form data as context if any
      const formDataParts: string[] = [];
      for (const [key, value] of Object.entries(this.formData)) {
        if (value !== undefined && value !== null && value !== '') {
          formDataParts.push(`${key}: ${value}`);
        }
      }

      if (formDataParts.length > 0) {
        parts.push('\n[Données du formulaire]');
        parts.push(formDataParts.join('\n'));
      }

      // Add info about uploaded files
      if (this.hasUploadedFiles()) {
        const fileNames: string[] = [];
        for (const [componentName, files] of this.uploadedFiles.entries()) {
          fileNames.push(...files.map(f => f.name));
        }
        parts.push(`\n[Documents fournis]\n${fileNames.join(', ')}`);
      }

      return parts.join('\n');
    } else {
      // Fallback: build prompt from form data (legacy behavior)
      const parts: string[] = [];

      for (const [key, value] of Object.entries(this.formData)) {
        if (value !== undefined && value !== null && value !== '') {
          parts.push(`${key}: ${value}`);
        }
      }

      // Add info about uploaded files with clear instructions
      if (this.hasUploadedFiles()) {
        const fileNames: string[] = [];
        for (const [componentName, files] of this.uploadedFiles.entries()) {
          fileNames.push(...files.map(f => f.name));
        }
        parts.push(`\nDocuments fournis: ${fileNames.join(', ')}`);
        parts.push('Veuillez analyser le(s) document(s) joint(s) et répondre à ma demande.');
      }

      return parts.length > 0 ? parts.join('\n') : 'Please help me with this task.';
    }
  }

  // ============== Chart Data Helpers ==============

  getChartData(component: UIComponent): ChartData | null {
    if (!this.executionResultJson) {
      return null;
    }

    let resolved: any;

    // Check for output_key first (structured output routing - highest priority)
    const outputKey = (component as any).output_key;
    if (outputKey) {
      const keyValue = this.executionResultJson[outputKey];
      if (keyValue !== undefined) {
        // If it's already chart data, return it
        if (this.isChartData(keyValue)) {
          return keyValue;
        }
        // If it's a string, try to parse it as JSON
        if (typeof keyValue === 'string') {
          const parsed = this.tryParseJson(keyValue);
          if (parsed && this.isChartData(parsed)) {
            return parsed;
          }
        }
      }
      // output_key specified but no valid chart data found - return null
      return null;
    }

    // If auto_bind_output is enabled, try to find data by component name first
    if (component.auto_bind_output) {
      const componentName = component.name || component.label;
      if (componentName) {
        resolved = this.executionResultJson[componentName];

        // If found, use it; otherwise try to auto-detect from the root object
        if (resolved && this.isChartData(resolved)) {
          return resolved;
        }
      }

      // Fallback: if there's only one top-level property that contains chart data, use it
      const keys = Object.keys(this.executionResultJson);
      if (keys.length === 1 && this.isChartData(this.executionResultJson[keys[0]])) {
        return this.executionResultJson[keys[0]];
      }

      // Another fallback: check if the root object itself is chart data
      if (this.isChartData(this.executionResultJson)) {
        return this.executionResultJson;
      }

      // If nothing found, return null (will show placeholder)
      return null;
    }

    // Manual mode: use data_source path
    const source = component.data_source?.trim();
    resolved = source
      ? this.resolveDataPath(this.executionResultJson, source)
      : this.executionResultJson;

    if (typeof resolved === 'string') {
      const parsed = this.tryParseJson(resolved);
      if (parsed) {
        return this.isChartData(parsed) ? parsed : null;
      }
    }

    return this.isChartData(resolved) ? resolved : null;
  }

  private isChartData(data: any): data is ChartData {
    return !!data && Array.isArray(data.labels) && Array.isArray(data.datasets);
  }

  private extractJsonFromContent(content: any): Record<string, any> | null {
    if (!content) return null;

    if (typeof content !== 'string') {
      return typeof content === 'object' ? content : null;
    }

    const trimmed = content.trim();
    if (!trimmed) return null;

    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch?.[1]) {
      const parsed = this.tryParseJson(codeBlockMatch[1].trim());
      if (parsed) {
        return parsed;
      }
    }

    const directParsed = this.tryParseJson(trimmed);
    if (directParsed) {
      return directParsed;
    }

    const jsonSlice = this.extractJsonSubstring(trimmed);
    if (jsonSlice) {
      return this.tryParseJson(jsonSlice);
    }

    return null;
  }

  private tryParseJson(value: string): Record<string, any> | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private extractJsonSubstring(value: string): string | null {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return value.slice(start, end + 1);
    }

    const arrayStart = value.indexOf('[');
    const arrayEnd = value.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      return value.slice(arrayStart, arrayEnd + 1);
    }

    return null;
  }

  private resolveDataPath(source: any, path: string): any {
    if (!source || !path) return null;

    const parts = path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .map((part) => part.trim())
      .filter(Boolean);

    return parts.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), source);
  }

  // ============== Component Output Routing ==============

  /**
   * Gets the output content for a specific component.
   * If the component has an output_key, extracts that key from the JSON response.
   * Otherwise, returns the full execution result.
   */
  getComponentOutput(component: UIComponent): string | null {
    if (!this.executionResult) {
      return null;
    }

    // Check if component has an output_key for structured output routing
    const outputKey = (component as any).output_key;
    if (outputKey && this.executionResultJson) {
      // Extract the specific key from JSON
      const keyValue = this.executionResultJson[outputKey];
      if (keyValue !== undefined) {
        // If the value is a string (markdown content), return it directly
        if (typeof keyValue === 'string') {
          return keyValue;
        }
        // If it's an array of objects, convert to markdown table
        if (Array.isArray(keyValue) && keyValue.length > 0 && typeof keyValue[0] === 'object') {
          return this.arrayToMarkdownTable(keyValue);
        }
        // If it's an array of primitives, convert to bullet list
        if (Array.isArray(keyValue)) {
          return keyValue.map(item => `- ${item}`).join('\n');
        }
        // If it's an object, try to format it nicely as markdown
        if (typeof keyValue === 'object' && keyValue !== null) {
          return this.objectToMarkdown(keyValue);
        }
        // Primitive values - convert to string
        return String(keyValue);
      }
      // Key not found in JSON - return null to show placeholder
      return null;
    }

    // No output_key - return the full execution result
    return this.executionResult;
  }

  /**
   * Converts an array of objects to a markdown table
   */
  private arrayToMarkdownTable(data: any[]): string {
    if (!data || data.length === 0) return '';

    // Get all unique keys from all objects
    const keys = [...new Set(data.flatMap(item => Object.keys(item)))];
    if (keys.length === 0) return '';

    // Create header row
    const header = `| ${keys.join(' | ')} |`;
    const separator = `| ${keys.map(() => '---').join(' | ')} |`;

    // Create data rows
    const rows = data.map(item => {
      const values = keys.map(key => {
        const value = item[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
      return `| ${values.join(' | ')} |`;
    });

    return [header, separator, ...rows].join('\n');
  }

  /**
   * Converts an object to a formatted markdown representation
   */
  private objectToMarkdown(obj: any): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      if (Array.isArray(value)) {
        lines.push(`**${formattedKey}:**`);
        if (value.length > 0 && typeof value[0] === 'object') {
          lines.push(this.arrayToMarkdownTable(value));
        } else {
          value.forEach(item => lines.push(`- ${item}`));
        }
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`**${formattedKey}:** ${JSON.stringify(value)}`);
      } else {
        lines.push(`**${formattedKey}:** ${value}`);
      }
    }
    return lines.join('\n\n');
  }

  // ============== Chat Interface ==============

  async sendChatMessage(): Promise<void> {
    const hasFiles = this.hasUploadedFiles();
    const hasText = this.chatInput.trim().length > 0;

    // Allow sending if there's text OR files (or both)
    if ((!hasText && !hasFiles) || !this.agent || !this.llmConfig || this.isSending) return;

    const config = this.getProviderConfig();
    if (!config) return;

    const { provider, apiKey, model } = config;

    if (!apiKey) {
      this.snackBar.open(`Please configure your ${provider} API key`, 'Configure', { duration: 5000 })
        .onAction().subscribe(() => this.openConfigDialog());
      return;
    }

    this.isSending = true;
    // If user types "go" or similar short commands with files, expand to analysis request
    let userMessage = this.chatInput.trim();
    if (hasFiles && (!userMessage || userMessage.toLowerCase() === 'go' || userMessage.toLowerCase() === 'ok' || userMessage.toLowerCase() === 'analyse')) {
      const fileNames = this.getAllUploadedFiles().map(f => f.name).join(', ');
      userMessage = userMessage || 'Analyse les documents joints';
    }
    this.chatInput = '';
    const chatStartTime = Date.now();

    // Add user message (show what the user typed, or indicate files are being sent)
    const displayMessage = hasText ? userMessage : `📎 Envoi de ${this.getAllUploadedFiles().length} fichier(s) pour analyse...`;
    this.chatMessages.push({
      role: 'user',
      content: displayMessage,
      timestamp: new Date()
    });
    this.shouldScrollToBottom = true;

    try {
      const systemPrompt = this.agent.ai_behavior?.system_prompt || '';
      let response: ChatResponse;

      // Use multipart endpoint if there are uploaded files (allows referencing them in chat)
      if (hasFiles) {
        response = await this.executeWithFiles(systemPrompt, userMessage || 'Analyse les documents fournis.', provider, model, apiKey);
        // Clear uploaded files after sending
        this.uploadedFiles.clear();
      } else {
        response = await this.executeWithoutFiles(systemPrompt, provider, model, apiKey);
      }

      if (response.success && response.message) {
        this.chatMessages.push({
          role: 'assistant',
          content: response.message.content,
          timestamp: new Date()
        });

        // Enregistrer la consommation de tokens
        const durationMs = Date.now() - chatStartTime;
        this.recordTokenConsumption(
          userMessage,
          response.message.content,
          provider,
          model,
          response.usage,
          durationMs
        );
      } else {
        const errorMsg = response.blocked_reason || response.error || 'Unknown error';
        this.chatMessages.push({
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
          isError: true
        });
      }

      this.shouldScrollToBottom = true;

    } catch (error: any) {
      console.error('Chat error:', error);
      this.chatMessages.push({
        role: 'assistant',
        content: `Error: ${error.error?.detail || error.message || 'Failed to send message'}`,
        timestamp: new Date(),
        isError: true
      });
      this.shouldScrollToBottom = true;
    } finally {
      this.isSending = false;
    }
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
  }

  // ============== Navigation ==============

  goBack(): void {
    this.router.navigate(['/agents-catalog']);
  }

  editAgent(): void {
    if (this.agent) {
      this.router.navigate(['/edit-agent', this.agent.id]);
    }
  }

  // ============== Export ==============

  /**
   * Get the last assistant message content for export
   */
  getLastAssistantMessage(): string | null {
    for (let i = this.chatMessages.length - 1; i >= 0; i--) {
      if (this.chatMessages[i].role === 'assistant' && !this.chatMessages[i].isError) {
        return this.chatMessages[i].content;
      }
    }
    return null;
  }

  /**
   * Check if export is available (has assistant response)
   */
  canExport(): boolean {
    return this.getLastAssistantMessage() !== null;
  }

  /**
   * Export the last assistant response to Word
   */
  async exportToWord(): Promise<void> {
    const content = this.getLastAssistantMessage();
    if (!content) {
      this.snackBar.open('Aucun contenu à exporter', 'OK', { duration: 3000 });
      return;
    }

    try {
      // Get values from form inputs if available
      const documentTitle = this.formData['document_title'] || this.agent?.name || 'Document';
      const companyName = this.formData['company_name'] || null;
      const subtitle = this.formData['subtitle'] || null;

      // Check if this is a tender-response agent or similar that needs professional format
      const agentId = this.agent?.id?.toLowerCase() || '';
      const agentRoute = this.agent?.route?.toLowerCase() || '';
      const isProfessionalAgent = agentId.includes('tender') ||
                                   agentId.includes('response') ||
                                   agentId.includes('proposal') ||
                                   agentRoute.includes('tender') ||
                                   agentRoute.includes('response') ||
                                   agentRoute.includes('proposal') ||
                                   this.formData['company_name'];

      let response: Blob;

      if (isProfessionalAgent) {
        // Use professional export endpoint
        response = await firstValueFrom(
          this.http.post('/api/v1/chat/export/professional', {
            content,
            title: documentTitle,
            company_name: companyName,
            subtitle: subtitle,
            include_cover_page: true,
            include_toc: true,
            include_header: true,
            include_footer: true,
            include_page_numbers: true,
            primary_color: '#1E40AF',
            footer_text: 'Document confidentiel'
          }, {
            responseType: 'blob'
          })
        ) as Blob;
      } else {
        // Use simple export endpoint
        response = await firstValueFrom(
          this.http.post('/api/v1/chat/export', {
            content,
            title: documentTitle,
            format: 'word'
          }, {
            responseType: 'blob'
          })
        ) as Blob;
      }

      // Create download link
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentTitle.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50) || 'document'}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.snackBar.open('Document exporté avec succès', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Export error:', error);
      this.snackBar.open('Erreur lors de l\'export', 'OK', { duration: 3000 });
    }
  }

  /**
   * Download execution results as a ZIP file containing CSV and JSON
   */
  async downloadResultsAsZip(): Promise<void> {
    if (!this.executionResult) {
      this.snackBar.open('Aucun résultat à télécharger', 'OK', { duration: 3000 });
      return;
    }

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Try to extract structured JSON data
      const jsonData = this.executionResultJson || this.extractJsonFromContent(this.executionResult);
      const rows = jsonData?.['data'] || (Array.isArray(jsonData) ? jsonData : null);

      // Add JSON file
      const jsonContent = jsonData ? JSON.stringify(jsonData, null, 2) : this.executionResult;
      zip.file('extraction.json', jsonContent);

      // Add CSV file if we have tabular data
      if (rows && Array.isArray(rows) && rows.length > 0) {
        const keys = Object.keys(rows[0]);
        const csvLines = [keys.join(';')];
        for (const row of rows) {
          csvLines.push(keys.map(k => {
            const val = String(row[k] ?? '').replace(/"/g, '""');
            return `"${val}"`;
          }).join(';'));
        }
        zip.file('extraction.csv', '\uFEFF' + csvLines.join('\n')); // BOM for Excel
      } else {
        // Fallback: raw text as CSV
        zip.file('extraction.txt', this.executionResult);
      }

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `extraction_${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);

      this.snackBar.open('ZIP téléchargé avec succès', 'OK', { duration: 3000 });
    } catch (error) {
      console.error('Download error:', error);
      this.snackBar.open('Erreur lors du téléchargement', 'OK', { duration: 3000 });
    }
  }

  /**
   * Enregistre la consommation de tokens pour cette interaction
   */
  private async recordTokenConsumption(
    promptContent: string,
    responseContent: string,
    provider: string,
    model: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    durationMs: number = 0
  ): Promise<void> {
    try {
      // Obtenir les infos utilisateur
      const profile = await this.roleService.getUserProfile();
      const userId = profile?.id || 'anonymous';
      const username = profile?.username || profile?.email || 'Utilisateur';

      // Utiliser les tokens réels si fournis, sinon estimer
      const promptTokens = usage?.prompt_tokens || Math.ceil(promptContent.length / 4);
      const completionTokens = usage?.completion_tokens || Math.ceil(responseContent.length / 4);

      // Enregistrer la consommation
      this.tokenConsumptionService.recordConsumption({
        userId,
        username,
        agentId: this.agent?.id || 'unknown',
        agentName: this.agent?.name || 'Agent inconnu',
        provider: provider as AIProvider,
        model,
        promptTokens,
        completionTokens,
        durationMs
      });

      console.log('📊 Token consumption recorded:', {
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        fromApi: !!usage
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la consommation:', error);
    }
  }
}
