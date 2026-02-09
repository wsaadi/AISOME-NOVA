import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import {
  ProviderCostConfig,
  AIProvider,
  AI_PROVIDERS
} from '../../core/models/token-consumption.model';

interface DialogData {
  cost?: ProviderCostConfig;
  providers: typeof AI_PROVIDERS;
}

// Modèles disponibles par provider
const MODEL_OPTIONS: Record<AIProvider, { value: string; label: string }[]> = {
  mistral: [
    { value: 'mistral-small-latest', label: 'Mistral Small' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large (Vision)' },
    { value: 'mistral-ocr-latest', label: 'Mistral OCR (Documents)' },
    { value: 'codestral-latest', label: 'Codestral' }
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
  ],
  gemini: [
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
  ],
  perplexity: [
    { value: 'sonar', label: 'Sonar' },
    { value: 'sonar-pro', label: 'Sonar Pro' },
    { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
    { value: 'sonar-deep-research', label: 'Sonar Deep Research' }
  ],
  'nvidia-nim': [
    { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B' },
    { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B' },
    { value: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B' }
  ]
};

@Component({
  selector: 'app-cost-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      @if (isEditing) {
        {{ 'token_consumption.edit_cost_config' | translate }}
      } @else {
        {{ 'token_consumption.add_cost_config' | translate }}
      }
    </h2>

    <mat-dialog-content>
      <div class="form-grid">
        <!-- Provider -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.provider' | translate }}</mat-label>
          <mat-select [(ngModel)]="formData.provider" (selectionChange)="onProviderChange()" [disabled]="isEditing">
            @for (provider of data.providers; track provider.id) {
              <mat-option [value]="provider.id">
                <mat-icon>{{ provider.icon }}</mat-icon>
                {{ provider.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Model -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.model' | translate }}</mat-label>
          <mat-select [(ngModel)]="formData.model" [disabled]="isEditing">
            @for (model of availableModels; track model.value) {
              <mat-option [value]="model.value">{{ model.label }}</mat-option>
            }
          </mat-select>
          <mat-hint>{{ 'token_consumption.model_hint' | translate }}</mat-hint>
        </mat-form-field>

        <!-- Input cost -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.input_cost_per_1m' | translate }}</mat-label>
          <input matInput type="number" [(ngModel)]="formData.inputCostPer1M" min="0" step="0.01">
          <span matTextSuffix>{{ formData.currency }}/1M tokens</span>
          <mat-hint>{{ 'token_consumption.input_cost_hint' | translate }}</mat-hint>
        </mat-form-field>

        <!-- Output cost -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.output_cost_per_1m' | translate }}</mat-label>
          <input matInput type="number" [(ngModel)]="formData.outputCostPer1M" min="0" step="0.01">
          <span matTextSuffix>{{ formData.currency }}/1M tokens</span>
          <mat-hint>{{ 'token_consumption.output_cost_hint' | translate }}</mat-hint>
        </mat-form-field>

        <!-- Currency -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.currency' | translate }}</mat-label>
          <mat-select [(ngModel)]="formData.currency">
            <mat-option value="EUR">EUR (Euro)</mat-option>
            <mat-option value="USD">USD (Dollar)</mat-option>
            <mat-option value="GBP">GBP (Livre)</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Aperçu du calcul -->
      <div class="cost-preview">
        <h4>{{ 'token_consumption.cost_preview' | translate }}</h4>
        <p>
          {{ 'token_consumption.cost_example' | translate }}:
          <br>
          <strong>100K tokens IN + 50K tokens OUT =
            {{ calculateExampleCost() | number:'1.4-4' }} {{ formData.currency }}</strong>
        </p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" [disabled]="!isValid()" (click)="save()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    mat-option mat-icon {
      margin-right: 8px;
    }

    .cost-preview {
      margin-top: 24px;
      padding: 16px;
      background: var(--background-color);
      border-radius: 8px;
      border: 1px solid var(--border-color);

      h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: var(--text-secondary);
      }

      p {
        margin: 0;
        font-size: 13px;

        strong {
          color: var(--primary-color);
          font-size: 16px;
        }
      }
    }
  `]
})
export class CostConfigDialogComponent implements OnInit {
  isEditing = false;
  availableModels: { value: string; label: string }[] = [];

  formData: {
    provider: AIProvider;
    model: string;
    inputCostPer1M: number;
    outputCostPer1M: number;
    currency: string;
  } = {
    provider: 'mistral',
    model: '',
    inputCostPer1M: 0,
    outputCostPer1M: 0,
    currency: 'EUR'
  };

  constructor(
    public dialogRef: MatDialogRef<CostConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    if (this.data.cost) {
      this.isEditing = true;
      this.formData = {
        provider: this.data.cost.provider,
        model: this.data.cost.model,
        inputCostPer1M: this.data.cost.inputCostPer1M,
        outputCostPer1M: this.data.cost.outputCostPer1M,
        currency: this.data.cost.currency
      };
    }
    this.updateAvailableModels();
  }

  onProviderChange(): void {
    this.formData.model = '';
    this.updateAvailableModels();
  }

  updateAvailableModels(): void {
    this.availableModels = MODEL_OPTIONS[this.formData.provider] || [];
    if (this.availableModels.length > 0 && !this.formData.model) {
      this.formData.model = this.availableModels[0].value;
    }
  }

  isValid(): boolean {
    return !!(
      this.formData.provider &&
      this.formData.model &&
      this.formData.inputCostPer1M >= 0 &&
      this.formData.outputCostPer1M >= 0
    );
  }

  calculateExampleCost(): number {
    // 100K tokens IN + 50K tokens OUT
    const inputCost = (100000 / 1_000_000) * this.formData.inputCostPer1M;
    const outputCost = (50000 / 1_000_000) * this.formData.outputCostPer1M;
    return inputCost + outputCost;
  }

  save(): void {
    if (this.isValid()) {
      const config: ProviderCostConfig = {
        provider: this.formData.provider,
        model: this.formData.model,
        inputCostPer1M: this.formData.inputCostPer1M,
        outputCostPer1M: this.formData.outputCostPer1M,
        currency: this.formData.currency,
        updatedAt: new Date().toISOString(),
        updatedBy: ''
      };
      this.dialogRef.close(config);
    }
  }
}
