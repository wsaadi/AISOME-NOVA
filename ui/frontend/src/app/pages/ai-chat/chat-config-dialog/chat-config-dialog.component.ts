import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

export interface ChatConfig {
  provider: 'mistral' | 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'nvidia-nim';
  model: string;
  temperature: number;
  maxTokens: number;
  mistralApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  geminiApiKey: string;
  perplexityApiKey: string;
  nvidiaNimApiKey: string;
  strictModeration: boolean;
}

@Component({
  selector: 'app-chat-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    CustomButtonComponent
  ],
  templateUrl: './chat-config-dialog.component.html',
  styleUrls: ['./chat-config-dialog.component.scss']
})
export class ChatConfigDialogComponent implements OnInit {
  config: ChatConfig;

  mistralModels = [
    { value: 'mistral-small-latest', label: 'Mistral Small (Latest)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium (Latest)' },
    { value: 'mistral-large-latest', label: 'Mistral Large (Latest)' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large (Vision)' },
    { value: 'mistral-ocr-latest', label: 'Mistral OCR (Documents)' },
    { value: 'open-mistral-7b', label: 'Open Mistral 7B' },
    { value: 'open-mixtral-8x7b', label: 'Open Mixtral 8x7B' }
  ];

  openaiModels = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ];

  anthropicModels = [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' }
  ];

  geminiModels = [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' }
  ];

  perplexityModels = [
    { value: 'sonar', label: 'Sonar (Recherche)' },
    { value: 'sonar-pro', label: 'Sonar Pro (Recherche avancée)' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro (Raisonnement)' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research (Recherche approfondie)' }
  ];

  nvidiaNimModels = [
    { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Rapide)' },
    { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Puissant)' },
    { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B (Ultra)' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ChatConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ChatConfig
  ) {
    this.config = { ...data };
  }

  ngOnInit(): void {
    // Update model if switching providers
    this.onProviderChange();
  }

  onProviderChange(): void {
    // Set default model based on provider if current model doesn't match
    if (this.config.provider === 'mistral') {
      const validModel = this.mistralModels.find(m => m.value === this.config.model);
      if (!validModel) {
        this.config.model = 'mistral-small-latest';
      }
    } else if (this.config.provider === 'openai') {
      const validModel = this.openaiModels.find(m => m.value === this.config.model);
      if (!validModel) {
        this.config.model = 'gpt-4o-mini';
      }
    } else if (this.config.provider === 'anthropic') {
      const validModel = this.anthropicModels.find(m => m.value === this.config.model);
      if (!validModel) {
        this.config.model = 'claude-3-5-sonnet-20241022';
      }
    } else if (this.config.provider === 'gemini') {
      const validModel = this.geminiModels.find(m => m.value === this.config.model);
      if (!validModel) {
        this.config.model = 'gemini-2.0-flash-exp';
      }
    } else if (this.config.provider === 'perplexity') {
      const validModel = this.perplexityModels.find(m => m.value === this.config.model);
      if (!validModel) {
        this.config.model = 'sonar';
      }
    } else if (this.config.provider === 'nvidia-nim') {
      const validModel = this.nvidiaNimModels.find(m => m.value === this.config.model);
      if (!validModel) {
        this.config.model = 'meta/llama-3.1-8b-instruct';
      }
    }
  }

  get availableModels() {
    switch (this.config.provider) {
      case 'mistral':
        return this.mistralModels;
      case 'openai':
        return this.openaiModels;
      case 'anthropic':
        return this.anthropicModels;
      case 'gemini':
        return this.geminiModels;
      case 'perplexity':
        return this.perplexityModels;
      case 'nvidia-nim':
        return this.nvidiaNimModels;
      default:
        return this.mistralModels;
    }
  }

  get currentApiKey(): string {
    switch (this.config.provider) {
      case 'mistral':
        return this.config.mistralApiKey;
      case 'openai':
        return this.config.openaiApiKey;
      case 'anthropic':
        return this.config.anthropicApiKey;
      case 'gemini':
        return this.config.geminiApiKey;
      case 'perplexity':
        return this.config.perplexityApiKey;
      case 'nvidia-nim':
        return this.config.nvidiaNimApiKey;
      default:
        return this.config.mistralApiKey;
    }
  }

  set currentApiKey(value: string) {
    switch (this.config.provider) {
      case 'mistral':
        this.config.mistralApiKey = value;
        break;
      case 'openai':
        this.config.openaiApiKey = value;
        break;
      case 'anthropic':
        this.config.anthropicApiKey = value;
        break;
      case 'gemini':
        this.config.geminiApiKey = value;
        break;
      case 'perplexity':
        this.config.perplexityApiKey = value;
        break;
      case 'nvidia-nim':
        this.config.nvidiaNimApiKey = value;
        break;
    }
  }

  saveConfig(): void {
    // Save to localStorage
    localStorage.setItem('ai-chat-config', JSON.stringify(this.config));
    this.dialogRef.close(this.config);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
