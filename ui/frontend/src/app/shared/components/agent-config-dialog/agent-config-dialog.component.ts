import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { CustomButtonComponent } from '../custom-button/custom-button.component';
import { RoleService } from '../../../core/services/role.service';
import { GlobalSettingsService, LLMSettings } from '../../../core/services/global-settings.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface AgentConfig {
  provider: string;
  mistralApiKey: string;
  mistralModel: string;
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  geminiApiKey: string;
  geminiModel: string;
  perplexityApiKey: string;
  perplexityModel: string;
  nvidiaNimApiKey: string;
  nvidiaNimModel: string;
  temperature: number;
  maxTokens: number;
}

export interface AgentConfigDialogData {
  config: AgentConfig;
  agentId: string;
  agentName: string;
}

/**
 * Dialog de configuration d'un agent
 *
 * Pour les administrateurs:
 * - Accès complet à tous les paramètres
 * - Peut modifier le provider, le modèle, les clés API
 *
 * Pour les utilisateurs:
 * - Utilise les clés API et provider configurés par l'admin (via GlobalSettingsService)
 * - Peut uniquement ajuster température et tokens (dans les limites définies)
 * - Les champs provider et clés API sont masqués/désactivés
 */
@Component({
  selector: 'app-agent-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatTooltipModule,
    MatIconModule,
    CustomButtonComponent,
    TranslateModule
  ],
  templateUrl: './agent-config-dialog.component.html',
  styleUrls: ['./agent-config-dialog.component.scss']
})
export class AgentConfigDialogComponent implements OnInit {
  config: AgentConfig;
  agentId: string;
  agentName: string;

  // Permissions
  isAdmin = false;
  globalSettings: LLMSettings;

  // Limites pour les utilisateurs
  maxTemperature = 2.0;
  maxTokensLimit = 32000;
  allowProviderChange = false;
  allowModelChange = false;

  mistralModels = [
    { value: 'mistral-small-latest', label: 'Mistral Small (Recommandé)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large (Vision)' },
    { value: 'mistral-ocr-latest', label: 'Mistral OCR (Documents)' }
  ];

  openaiModels = [
    { value: 'gpt-4o', label: 'GPT-4o (Recommandé)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ];

  anthropicModels = [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Recommandé)' }
  ];

  geminiModels = [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Recommandé)' }
  ];

  perplexityModels = [
    { value: 'sonar', label: 'Sonar (Recherche)' },
    { value: 'sonar-pro', label: 'Sonar Pro (Recherche avancée)' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (Raisonnement)' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research (Recherche approfondie)' }
  ];

  nvidiaNimModels = [
    // Modeles de generation
    { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Rapide)' },
    { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Puissant)' },
    { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B (Ultra)' },
    { value: 'meta/llama-3.2-1b-instruct', label: 'Llama 3.2 1B (Leger)' },
    { value: 'meta/llama-3.2-3b-instruct', label: 'Llama 3.2 3B (Compact)' },
    { value: 'mistralai/mixtral-8x7b-instruct-v0.1', label: 'Mixtral 8x7B (MoE)' },
    { value: 'mistralai/mistral-7b-instruct-v0.3', label: 'Mistral 7B v0.3' },
    { value: 'google/gemma-2-27b-it', label: 'Gemma 2 27B' }
  ];

  constructor(
    public dialogRef: MatDialogRef<AgentConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AgentConfigDialogData,
    private roleService: RoleService,
    private globalSettingsService: GlobalSettingsService,
    private translate: TranslateService
  ) {
    this.config = { ...data.config };
    this.agentId = data.agentId;
    this.agentName = data.agentName;
    this.globalSettings = this.globalSettingsService.getLLMSettings();
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est admin (par rôle)
    this.isAdmin = this.roleService.hasRole('admin');

    // Charger les limites depuis les paramètres globaux
    this.loadGlobalLimits();

    // Si l'utilisateur n'est pas admin, appliquer les paramètres globaux
    if (!this.isAdmin) {
      this.applyGlobalSettings();
    }
  }

  private loadGlobalLimits(): void {
    const limits = this.globalSettings?.limits;
    if (limits) {
      this.maxTemperature = limits.maxTemperature ?? 2.0;
      this.maxTokensLimit = limits.maxTokensLimit ?? 32000;
      this.allowProviderChange = limits.allowProviderChange ?? false;
      this.allowModelChange = limits.allowModelChange ?? false;
    }
  }

  private applyGlobalSettings(): void {
    // Vérifier que globalSettings existe
    if (!this.globalSettings) {
      return;
    }

    // Appliquer le provider par défaut si l'utilisateur ne peut pas le changer
    if (!this.allowProviderChange && this.globalSettings.defaultProvider) {
      this.config.provider = this.globalSettings.defaultProvider;
    }

    // Appliquer les modèles par défaut si l'utilisateur ne peut pas les changer
    if (!this.allowModelChange && this.globalSettings.defaultModels) {
      this.config.mistralModel = this.globalSettings.defaultModels.mistral ?? this.config.mistralModel;
      this.config.openaiModel = this.globalSettings.defaultModels.openai ?? this.config.openaiModel;
      this.config.anthropicModel = this.globalSettings.defaultModels.anthropic ?? this.config.anthropicModel;
      this.config.geminiModel = this.globalSettings.defaultModels.gemini ?? this.config.geminiModel;
      this.config.perplexityModel = this.globalSettings.defaultModels.perplexity ?? this.config.perplexityModel;
      this.config.nvidiaNimModel = this.globalSettings.defaultModels['nvidia-nim'] ?? this.config.nvidiaNimModel;
    }

    // Utiliser les clés API globales (l'utilisateur ne peut pas les voir/modifier)
    // Les clés sont masquées côté UI mais seront utilisées par le backend
    this.config.mistralApiKey = '';
    this.config.openaiApiKey = '';
    this.config.anthropicApiKey = '';
    this.config.geminiApiKey = '';
    this.config.perplexityApiKey = '';
    this.config.nvidiaNimApiKey = '';

    // Appliquer les limites de température et tokens
    this.config.temperature = Math.min(this.config.temperature, this.maxTemperature);
    this.config.maxTokens = Math.min(this.config.maxTokens, this.maxTokensLimit);
  }

  canChangeProvider(): boolean {
    return this.isAdmin || this.allowProviderChange;
  }

  canChangeModel(): boolean {
    return this.isAdmin || this.allowModelChange;
  }

  canEditApiKeys(): boolean {
    return this.isAdmin;
  }

  getAvailableProviders(): { value: string; label: string }[] {
    const allProviders = [
      { value: 'mistral', label: 'Mistral AI' },
      { value: 'openai', label: 'OpenAI' },
      { value: 'anthropic', label: 'Anthropic (Claude)' },
      { value: 'gemini', label: 'Google Gemini' },
      { value: 'perplexity', label: 'Perplexity' },
      { value: 'nvidia-nim', label: 'NVIDIA NIM' }
    ];

    // Si l'utilisateur n'est pas admin, ne montrer que les providers avec une clé API configurée
    if (!this.isAdmin) {
      const availableProviders = this.globalSettingsService.getAvailableProviders();
      // S'assurer que availableProviders est bien un tableau
      if (Array.isArray(availableProviders) && availableProviders.length > 0) {
        return allProviders.filter(p => availableProviders.includes(p.value));
      }
      // Si aucun provider configuré, retourner tous les providers pour éviter une liste vide
      return allProviders;
    }

    return allProviders;
  }

  getProviderHint(): string {
    if (!this.isAdmin && !this.allowProviderChange) {
      return this.translate.instant('agent_config.provider_locked_hint');
    }
    return '';
  }

  getApiKeyHint(): string {
    if (!this.isAdmin) {
      return this.translate.instant('agent_config.api_key_global_hint');
    }
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // Appliquer les limites avant de sauvegarder
    if (!this.isAdmin) {
      this.config.temperature = Math.min(this.config.temperature, this.maxTemperature);
      this.config.maxTokens = Math.min(this.config.maxTokens, this.maxTokensLimit);
    }

    // Sauvegarder dans le localStorage avec une clé spécifique à l'agent
    const storageKey = `${this.agentId}-config`;
    localStorage.setItem(storageKey, JSON.stringify(this.config));

    // Aussi sauvegarder via le service pour la persistance centralisée
    this.globalSettingsService.saveAgentSettings(
      this.agentId,
      {
        llm: {
          defaultProvider: this.config.provider as any,
          defaults: {
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            topP: 1.0,
            frequencyPenalty: 0,
            presencePenalty: 0
          }
        } as any
      },
      this.isAdmin
    ).subscribe();

    this.dialogRef.close(this.config);
  }

  formatTemperature(value: number): string {
    return value.toFixed(1);
  }

  formatMaxTokens(value: number): string {
    return value.toString();
  }

  getTemperatureMax(): number {
    return this.isAdmin ? 2.0 : this.maxTemperature;
  }

  getMaxTokensMax(): number {
    return this.isAdmin ? 32000 : this.maxTokensLimit;
  }
}
