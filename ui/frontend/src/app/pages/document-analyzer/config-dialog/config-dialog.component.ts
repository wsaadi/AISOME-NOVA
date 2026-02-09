import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

export interface AgentConfig {
  provider: 'mistral' | 'openai' | 'anthropic' | 'gemini' | 'perplexity';
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
  temperature: number;
  maxTokens: number;
}

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    CustomButtonComponent
  ],
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.scss']
})
export class ConfigDialogComponent implements OnInit {
  config: AgentConfig;

  providerOptions = [
    { label: 'Mistral AI', value: 'mistral' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'Anthropic (Claude)', value: 'anthropic' },
    { label: 'Google Gemini', value: 'gemini' },
    { label: 'Perplexity AI', value: 'perplexity' }
  ];

  mistralModelOptions = [
    { label: 'Mistral Small (Recommandé)', value: 'mistral-small-latest' },
    { label: 'Mistral Medium', value: 'mistral-medium-latest' },
    { label: 'Mistral Large', value: 'mistral-large-latest' },
    { label: 'Pixtral Large (Vision)', value: 'pixtral-large-latest' },
    { label: 'Mistral OCR (Documents)', value: 'mistral-ocr-latest' }
  ];

  openaiModelOptions = [
    { label: 'GPT-4o (Recommandé)', value: 'gpt-4o' },
    { label: 'GPT-4o mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' }
  ];

  anthropicModelOptions = [
    { label: 'Claude 3.5 Sonnet (Recommandé)', value: 'claude-3-5-sonnet-20241022' }
  ];

  geminiModelOptions = [
    { label: 'Gemini 2.0 Flash (Recommandé)', value: 'gemini-2.0-flash-exp' }
  ];

  perplexityModelOptions = [
    { label: 'Sonar (Recherche)', value: 'sonar' },
    { label: 'Sonar Pro (Recherche avancée)', value: 'sonar-pro' },
    { label: 'Sonar Reasoning Pro (Raisonnement)', value: 'sonar-reasoning-pro' },
    { label: 'Sonar Deep Research (Recherche approfondie)', value: 'sonar-deep-research' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AgentConfig
  ) {
    this.config = { ...data };
  }

  ngOnInit(): void {
    // Charger la configuration sauvegardée si disponible
    const savedConfig = localStorage.getItem('agent-config');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      this.config = { ...this.config, ...parsed };
    }
    // Initialiser le provider par défaut si non défini
    if (!this.config.provider) {
      this.config.provider = 'mistral';
    }
  }

  onProviderChange(): void {
    // Ajuster les valeurs par défaut selon le provider
    if (this.config.provider === 'openai') {
      if (!this.config.openaiModel) {
        this.config.openaiModel = 'gpt-4o';
      }
    } else if (this.config.provider === 'mistral') {
      if (!this.config.mistralModel) {
        this.config.mistralModel = 'mistral-small-latest';
      }
    } else if (this.config.provider === 'anthropic') {
      if (!this.config.anthropicModel) {
        this.config.anthropicModel = 'claude-3-5-sonnet-20241022';
      }
    } else if (this.config.provider === 'gemini') {
      if (!this.config.geminiModel) {
        this.config.geminiModel = 'gemini-2.0-flash-exp';
      }
    } else if (this.config.provider === 'perplexity') {
      if (!this.config.perplexityModel) {
        this.config.perplexityModel = 'sonar';
      }
    }
    this.onModelChange();
  }

  onModelChange(): void {
    if (this.config.provider === 'mistral') {
      // Ajuster les max_tokens en fonction du modèle Mistral sélectionné
      if (this.config.mistralModel === 'mistral-large-latest') {
        // Pour Mistral Large, utiliser une limite plus élevée (minimum 16384)
        if (this.config.maxTokens < 16384) {
          this.config.maxTokens = 16384;
        }
      } else if (this.config.mistralModel === 'mistral-medium-latest') {
        // Pour Mistral Medium
        if (this.config.maxTokens > 8192) {
          this.config.maxTokens = 8192;
        }
        if (this.config.maxTokens < 4096) {
          this.config.maxTokens = 4096;
        }
      } else {
        // Pour Mistral Small
        if (this.config.maxTokens > 8192) {
          this.config.maxTokens = 4096;
        }
        if (this.config.maxTokens < 2048) {
          this.config.maxTokens = 2048;
        }
      }
    } else if (this.config.provider === 'openai') {
      // Ajuster les max_tokens en fonction du modèle OpenAI sélectionné
      if (this.config.openaiModel === 'gpt-4o' || this.config.openaiModel === 'gpt-4-turbo') {
        // GPT-4 models supportent jusqu'à 128k tokens
        if (this.config.maxTokens < 4096) {
          this.config.maxTokens = 4096;
        }
      } else if (this.config.openaiModel === 'gpt-4o-mini') {
        // GPT-4o mini supporte jusqu'à 16k tokens
        if (this.config.maxTokens > 16384) {
          this.config.maxTokens = 16384;
        }
        if (this.config.maxTokens < 4096) {
          this.config.maxTokens = 4096;
        }
      } else {
        // GPT-3.5 Turbo supporte jusqu'à 16k tokens
        if (this.config.maxTokens > 16384) {
          this.config.maxTokens = 16384;
        }
        if (this.config.maxTokens < 2048) {
          this.config.maxTokens = 2048;
        }
      }
    } else if (this.config.provider === 'anthropic') {
      // Claude 3.5 Sonnet supporte jusqu'à 8192 tokens de sortie
      if (this.config.maxTokens < 4096) {
        this.config.maxTokens = 4096;
      }
      if (this.config.maxTokens > 8192) {
        this.config.maxTokens = 8192;
      }
    } else if (this.config.provider === 'gemini') {
      // Gemini 2.0 Flash supporte jusqu'à 8192 tokens de sortie
      if (this.config.maxTokens < 2048) {
        this.config.maxTokens = 2048;
      }
      if (this.config.maxTokens > 8192) {
        this.config.maxTokens = 8192;
      }
    } else if (this.config.provider === 'perplexity') {
      // Perplexity models supportent généralement jusqu'à 4096 tokens de sortie
      if (this.config.maxTokens < 2048) {
        this.config.maxTokens = 2048;
      }
      if (this.config.maxTokens > 4096) {
        this.config.maxTokens = 4096;
      }
    }
  }

  onSave(): void {
    // Sauvegarder dans le localStorage
    localStorage.setItem('agent-config', JSON.stringify(this.config));
    this.dialogRef.close(this.config);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
