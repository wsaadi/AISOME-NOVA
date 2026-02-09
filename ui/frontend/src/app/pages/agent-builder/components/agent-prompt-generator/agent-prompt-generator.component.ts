import { Component, OnInit, OnDestroy, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import {
  AgentGeneratorService,
  GenerationResponse,
  GenerationExample,
  MissingComponent,
  PlatformCapabilities,
} from '../../services/agent-generator.service';

export interface AgentPromptGeneratorDialogData {
  existingYaml?: string;
  mode?: 'generate' | 'refine';
}

export interface AgentPromptGeneratorDialogResult {
  action: 'create' | 'edit' | 'cancel';
  yaml?: string;
  agentId?: string;
  agentName?: string;
}

@Component({
  selector: 'app-agent-prompt-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  templateUrl: './agent-prompt-generator.component.html',
  styleUrls: ['./agent-prompt-generator.component.scss'],
})
export class AgentPromptGeneratorComponent implements OnInit, OnDestroy {
  promptForm: FormGroup;
  refineForm: FormGroup;

  isGenerating = false;
  generatedYaml: string | null = null;
  lastResult: GenerationResponse | null = null;

  examples: GenerationExample[] = [];
  capabilities: PlatformCapabilities | null = null;

  selectedTabIndex = 0;
  showYamlEditor = false;

  providers = [
    { value: 'mistral', label: 'Mistral AI' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'perplexity', label: 'Perplexity' },
    { value: 'nvidia-nim', label: 'NVIDIA NIM' },
  ];

  models: Record<string, { value: string; label: string }[]> = {
    mistral: [
      { value: 'mistral-large-latest', label: 'Mistral Large (Recommandé)' },
      { value: 'mistral-small-latest', label: 'Mistral Small' },
    ],
    openai: [
      { value: 'gpt-4o', label: 'GPT-4o (Recommandé)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ],
    anthropic: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommandé)' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    ],
    gemini: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Recommandé)' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    perplexity: [
      { value: 'sonar-pro', label: 'Sonar Pro (Recommandé)' },
      { value: 'sonar', label: 'Sonar' },
      { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
      { value: 'sonar-deep-research', label: 'Sonar Deep Research' },
    ],
    'nvidia-nim': [
      { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Recommandé)' },
      { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
      { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' },
    ],
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private generatorService: AgentGeneratorService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    @Optional() public dialogRef: MatDialogRef<AgentPromptGeneratorComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: AgentPromptGeneratorDialogData
  ) {
    this.promptForm = this.fb.group({
      prompt: ['', [Validators.required, Validators.minLength(20)]],
      provider: ['mistral'],
      model: ['mistral-large-latest'],
    });

    this.refineForm = this.fb.group({
      refinementPrompt: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit(): void {
    // Load examples and capabilities
    this.loadExamples();
    this.loadCapabilities();

    // Subscribe to generation state
    this.generatorService.generating$.pipe(takeUntil(this.destroy$)).subscribe((generating) => {
      this.isGenerating = generating;
    });

    this.generatorService.generatedYaml$.pipe(takeUntil(this.destroy$)).subscribe((yaml) => {
      this.generatedYaml = yaml;
    });

    this.generatorService.lastResult$.pipe(takeUntil(this.destroy$)).subscribe((result) => {
      this.lastResult = result;
    });

    // If we have existing YAML (refine mode), set it
    if (this.data?.existingYaml) {
      this.generatorService.setGeneratedYaml(this.data.existingYaml);
      this.selectedTabIndex = 1; // Go to result tab
    }

    // Handle provider change
    this.promptForm.get('provider')?.valueChanges.subscribe((provider) => {
      const models = this.models[provider];
      if (models && models.length > 0) {
        this.promptForm.patchValue({ model: models[0].value });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============== DATA LOADING ==============

  loadExamples(): void {
    this.generatorService.getExamples().subscribe({
      next: (examples) => {
        this.examples = examples;
      },
      error: (error) => {
        console.error('Failed to load examples:', error);
      },
    });
  }

  loadCapabilities(): void {
    this.generatorService.getCapabilities().subscribe({
      next: (capabilities) => {
        this.capabilities = capabilities;
      },
      error: (error) => {
        console.error('Failed to load capabilities:', error);
      },
    });
  }

  // ============== GENERATION ==============

  generateAgent(): void {
    if (this.promptForm.invalid) return;

    const { prompt, provider, model } = this.promptForm.value;

    this.generatorService.generateAgent({ prompt, provider, model }).subscribe({
      next: (response) => {
        if (response.success) {
          this.selectedTabIndex = 1; // Switch to result tab
          this.showSuccess(response.message);
        } else {
          this.showError(response.message);
        }
      },
      error: (error) => {
        console.error('Generation failed:', error);
        this.showError('agent_builder.generator.errors.generation_failed');
      },
    });
  }

  refineAgent(): void {
    if (this.refineForm.invalid || !this.generatedYaml) return;

    const { refinementPrompt } = this.refineForm.value;

    this.generatorService
      .refineAgent({
        current_yaml: this.generatedYaml,
        refinement_prompt: refinementPrompt,
        provider: this.promptForm.value.provider,
        model: this.promptForm.value.model,
      })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess(response.message);
            this.refineForm.reset();
          } else {
            this.showError(response.message);
          }
        },
        error: (error) => {
          console.error('Refinement failed:', error);
          this.showError('agent_builder.generator.errors.refinement_failed');
        },
      });
  }

  // ============== EXAMPLE SELECTION ==============

  useExample(example: GenerationExample): void {
    this.promptForm.patchValue({ prompt: example.prompt });
    this.selectedTabIndex = 0; // Go to prompt tab
  }

  // ============== YAML EDITING ==============

  toggleYamlEditor(): void {
    this.showYamlEditor = !this.showYamlEditor;
  }

  onYamlChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.generatorService.setGeneratedYaml(textarea.value);
  }

  // ============== ACTIONS ==============

  createAgent(): void {
    if (!this.generatedYaml) return;

    this.generatorService.createAgentFromYaml(this.generatedYaml).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccess(response.message);
          this.closeDialog({
            action: 'create',
            yaml: this.generatedYaml!,
            agentId: response.agent_id,
            agentName: response.agent_name,
          });
        } else {
          this.showError('agent_builder.generator.errors.create_failed');
        }
      },
      error: (error) => {
        console.error('Create failed:', error);
        this.showError('agent_builder.generator.errors.create_failed');
      },
    });
  }

  editInBuilder(): void {
    if (!this.generatedYaml) return;

    this.closeDialog({
      action: 'edit',
      yaml: this.generatedYaml,
    });
  }

  cancel(): void {
    this.closeDialog({ action: 'cancel' });
  }

  private closeDialog(result: AgentPromptGeneratorDialogResult): void {
    if (this.dialogRef) {
      this.dialogRef.close(result);
    }
  }

  // ============== HELPERS ==============

  get availableModels(): { value: string; label: string }[] {
    const provider = this.promptForm.get('provider')?.value || 'mistral';
    return this.models[provider] || [];
  }

  get hasMissingComponents(): boolean {
    return !!(this.lastResult?.missing_components && this.lastResult.missing_components.length > 0);
  }

  get hasWarnings(): boolean {
    return !!(this.lastResult?.warnings && this.lastResult.warnings.length > 0);
  }

  get hasErrors(): boolean {
    return !!(this.lastResult?.errors && this.lastResult.errors.length > 0);
  }

  getMissingComponentIcon(type: string): string {
    switch (type) {
      case 'tool':
        return 'build';
      case 'connector':
        return 'cable';
      case 'ui_component':
        return 'widgets';
      default:
        return 'help';
    }
  }

  getMissingComponentTypeLabel(type: string): string {
    switch (type) {
      case 'tool':
        return 'Outil';
      case 'connector':
        return 'Connecteur';
      case 'ui_component':
        return 'Composant UI';
      default:
        return type;
    }
  }

  // ============== NOTIFICATIONS ==============

  private showSuccess(message: string): void {
    const translated = message.includes('.') ? this.translate.instant(message) : message;
    this.snackBar.open(translated, this.translate.instant('common.close'), {
      duration: 3000,
      panelClass: 'success-snackbar',
    });
  }

  private showError(message: string): void {
    const translated = message.includes('.') ? this.translate.instant(message) : message;
    this.snackBar.open(translated, this.translate.instant('common.close'), {
      duration: 5000,
      panelClass: 'error-snackbar',
    });
  }
}
