import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';

export interface MonitoringConfig {
  provider: string;
  model: string;
  mistralApiKey: string;
  openaiApiKey: string;
  maxSources: number;
}

@Component({
  selector: 'app-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, CustomButtonComponent],
  templateUrl: './config-dialog.component.html',
  styleUrls: ['./config-dialog.component.scss']
})
export class ConfigDialogComponent {
  config: MonitoringConfig;

  mistralModels = [
    { value: 'mistral-small-latest', label: 'Mistral Small (Rapide)' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium (Équilibré)' },
    { value: 'mistral-large-latest', label: 'Mistral Large (Puissant)' }
  ];

  openaiModels = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Rapide)' },
    { value: 'gpt-4o', label: 'GPT-4o (Puissant)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
  ];

  constructor(
    public dialogRef: MatDialogRef<ConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MonitoringConfig
  ) {
    this.config = { ...data };
  }

  getAvailableModels() {
    return this.config.provider === 'mistral' ? this.mistralModels : this.openaiModels;
  }

  onProviderChange() {
    // Changer le modèle par défaut selon le provider
    if (this.config.provider === 'mistral') {
      this.config.model = 'mistral-small-latest';
    } else {
      this.config.model = 'gpt-4o-mini';
    }
  }

  isValid(): boolean {
    const hasApiKey = this.config.provider === 'mistral'
      ? this.config.mistralApiKey.trim() !== ''
      : this.config.openaiApiKey.trim() !== '';
    return hasApiKey && this.config.maxSources >= 5 && this.config.maxSources <= 50;
  }

  save(): void {
    if (this.isValid()) {
      this.dialogRef.close(this.config);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
