import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

export interface PodAgentConfig {
  provider: string;
  mistralApiKey: string;
  mistralModel: string;
  openaiApiKey: string;
  openaiModel: string;
  temperature: number;
  maxTokens: number;
}

@Component({
  selector: 'app-pod-config-dialog',
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
  config: PodAgentConfig;

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

  constructor(
    public dialogRef: MatDialogRef<ConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PodAgentConfig
  ) {
    this.config = { ...data };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    localStorage.setItem('pod-analyzer-config', JSON.stringify(this.config));
    this.dialogRef.close(this.config);
  }

  formatTemperature(value: number): string {
    return value.toFixed(1);
  }

  formatMaxTokens(value: number): string {
    return value.toString();
  }
}
