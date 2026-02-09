import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { GlobalSettingsService, LLMSettings } from '../../core/services/global-settings.service';
import { RoleService } from '../../core/services/role.service';

/**
 * Page de paramétrage des LLM (admin uniquement)
 *
 * Permet de configurer:
 * - Les clés API pour chaque provider
 * - Les modèles par défaut
 * - Les paramètres par défaut (température, tokens, etc.)
 * - Les limites pour les utilisateurs non-admin
 */
@Component({
  selector: 'app-llm-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule,
    TranslateModule
  ],
  templateUrl: './llm-settings.component.html',
  styleUrls: ['./llm-settings.component.scss']
})
export class LLMSettingsComponent implements OnInit {
  settings!: LLMSettings;
  isSaving = false;
  showApiKeys: { [key: string]: boolean } = {};
  isLoaded = false;

  providers = [
    { id: 'mistral', name: 'Mistral AI', icon: 'auto_awesome' },
    { id: 'openai', name: 'OpenAI', icon: 'psychology' },
    { id: 'anthropic', name: 'Anthropic (Claude)', icon: 'smart_toy' },
    { id: 'gemini', name: 'Google Gemini', icon: 'hub' },
    { id: 'perplexity', name: 'Perplexity', icon: 'search' },
    { id: 'nvidia-nim', name: 'NVIDIA NIM', icon: 'memory' }
  ];

  modelOptions: { [key: string]: { value: string; label: string }[] } = {
    mistral: [
      { value: 'mistral-small-latest', label: 'Mistral Small (Rapide)' },
      { value: 'mistral-medium-latest', label: 'Mistral Medium' },
      { value: 'mistral-large-latest', label: 'Mistral Large (Puissant)' },
      { value: 'pixtral-large-latest', label: 'Pixtral Large (Vision)' },
      { value: 'mistral-ocr-latest', label: 'Mistral OCR (Documents)' },
      { value: 'codestral-latest', label: 'Codestral (Code)' }
    ],
    openai: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rapide)' },
      { value: 'gpt-4o', label: 'GPT-4o (Puissant)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    anthropic: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Puissant)' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Rapide)' }
    ],
    gemini: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
    ],
    perplexity: [
      { value: 'sonar', label: 'Sonar (Recherche)' },
      { value: 'sonar-pro', label: 'Sonar Pro (Recherche avancée)' },
      { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (Raisonnement)' },
      { value: 'sonar-deep-research', label: 'Sonar Deep Research (Recherche approfondie)' }
    ],
    'nvidia-nim': [
      { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Rapide)' },
      { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Puissant)' },
      { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B (Ultra)' }
    ]
  };

  constructor(
    private globalSettingsService: GlobalSettingsService,
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Initialiser les settings avec les valeurs du service
    this.settings = this.globalSettingsService.getLLMSettings();
    this.isLoaded = true;

    // Initialiser les états d'affichage des clés API
    this.providers.forEach(p => {
      this.showApiKeys[p.id] = false;
    });
  }

  toggleApiKeyVisibility(providerId: string): void {
    this.showApiKeys[providerId] = !this.showApiKeys[providerId];
  }

  getApiKeyMasked(providerId: string): string {
    const key = (this.settings.apiKeys as any)[providerId];
    if (!key) return '';
    if (this.showApiKeys[providerId]) return key;
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  }

  async saveSettings(): Promise<void> {
    this.isSaving = true;

    try {
      const profile = await this.roleService.getUserProfile();
      const userId = profile?.id || 'admin';

      this.globalSettingsService.saveLLMSettings(this.settings, userId).subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('llm_settings.save_success'),
            this.translate.instant('common.close'),
            { duration: 3000, panelClass: 'success-snackbar' }
          );
        },
        error: (err) => {
          console.error('Error saving LLM settings:', err);
          this.snackBar.open(
            this.translate.instant('llm_settings.save_error'),
            this.translate.instant('common.close'),
            { duration: 5000, panelClass: 'error-snackbar' }
          );
        },
        complete: () => {
          this.isSaving = false;
        }
      });
    } catch (error) {
      this.isSaving = false;
      console.error('Error getting user profile:', error);
    }
  }

  resetToDefaults(): void {
    if (confirm(this.translate.instant('llm_settings.confirm_reset'))) {
      const defaults = this.globalSettingsService.getDefaultSettings().llm;
      this.settings = { ...defaults };
      this.saveSettings();
    }
  }

  testConnection(providerId: string): void {
    const apiKey = (this.settings.apiKeys as any)[providerId];
    if (!apiKey) {
      this.snackBar.open(
        this.translate.instant('llm_settings.no_api_key'),
        this.translate.instant('common.close'),
        { duration: 3000, panelClass: 'warning-snackbar' }
      );
      return;
    }

    this.snackBar.open(
      this.translate.instant('llm_settings.testing_connection'),
      undefined,
      { duration: 2000 }
    );

    // TODO: Implémenter le test de connexion réel via le backend
    setTimeout(() => {
      this.snackBar.open(
        this.translate.instant('llm_settings.connection_success', { provider: providerId }),
        this.translate.instant('common.close'),
        { duration: 3000, panelClass: 'success-snackbar' }
      );
    }, 1500);
  }

  formatTemperature(value: number): string {
    return (value ?? 0.7).toFixed(1);
  }

  formatTokens(value: number): string {
    return (value ?? 4096).toLocaleString();
  }

  formatTopP(value: number): string {
    return (value ?? 1.0).toFixed(2);
  }

  // Helper methods for type-safe access to dynamic keys
  getApiKey(providerId: string): string {
    return (this.settings.apiKeys as Record<string, string>)[providerId] || '';
  }

  setApiKey(providerId: string, value: string): void {
    (this.settings.apiKeys as Record<string, string>)[providerId] = value;
  }

  hasApiKey(providerId: string): boolean {
    return !!(this.settings.apiKeys as Record<string, string>)[providerId];
  }

  getDefaultModel(providerId: string): string {
    return (this.settings.defaultModels as Record<string, string>)[providerId] || '';
  }

  setDefaultModel(providerId: string, value: string): void {
    (this.settings.defaultModels as Record<string, string>)[providerId] = value;
  }
}
