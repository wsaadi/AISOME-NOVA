import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';

interface AgentSettings {
  mistralApiKey: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

/**
 * Page de paramétrage de l'agent
 */
@Component({
  selector: 'app-agent-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CustomButtonComponent
  ],
  templateUrl: './agent-settings.component.html',
  styleUrls: ['./agent-settings.component.scss']
})
export class AgentSettingsComponent implements OnInit {
  settings: AgentSettings = {
    mistralApiKey: '',
    defaultModel: 'mistral-small-latest',
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  };

  isSaved: boolean = false;
  errorMessage: string = '';

  modelOptions = [
    { label: 'Mistral Small (Recommandé)', value: 'mistral-small-latest' },
    { label: 'Mistral Medium', value: 'mistral-medium-latest' },
    { label: 'Mistral Large', value: 'mistral-large-latest' },
    { label: 'Pixtral Large (Vision)', value: 'pixtral-large-latest' },
    { label: 'Mistral OCR (Documents)', value: 'mistral-ocr-latest' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    const savedSettings = localStorage.getItem('document-analyzer-settings');
    if (savedSettings) {
      this.settings = JSON.parse(savedSettings);
    }
  }

  saveSettings(): void {
    try {
      localStorage.setItem('document-analyzer-settings', JSON.stringify(this.settings));
      this.isSaved = true;
      this.errorMessage = '';

      setTimeout(() => {
        this.isSaved = false;
      }, 3000);
    } catch (error) {
      this.errorMessage = 'Erreur lors de la sauvegarde des paramètres';
    }
  }

  resetSettings(): void {
    if (confirm('Voulez-vous vraiment réinitialiser tous les paramètres ?')) {
      this.settings = {
        mistralApiKey: '',
        defaultModel: 'mistral-small-latest',
        defaultTemperature: 0.7,
        defaultMaxTokens: 4096
      };
      this.saveSettings();
    }
  }

  goBack(): void {
    this.router.navigate(['/agents/document-analyzer']);
  }
}
