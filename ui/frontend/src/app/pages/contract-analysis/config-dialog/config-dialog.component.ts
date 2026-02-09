import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    CustomButtonComponent
  ],
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.scss']
})
export class ConfigDialogComponent {
  config: AgentConfig;

  mistralModels = [
    { value: 'mistral-small-latest', label: 'Mistral Small (Recommandé)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium' },
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large (Vision)' },
    { value: 'mistral-ocr-latest', label: 'Mistral OCR (Documents)' }
  ];

  openaiModels = [
    { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo (Recommandé)' },
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

  constructor(
    public dialogRef: MatDialogRef<ConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AgentConfig
  ) {
    this.config = { ...data };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // Sauvegarder dans le localStorage
    localStorage.setItem('contract-agent-config', JSON.stringify(this.config));
    this.dialogRef.close(this.config);
  }

  formatTemperature(value: number): string {
    return value.toFixed(1);
  }

  formatMaxTokens(value: number): string {
    return value.toString();
  }
}
