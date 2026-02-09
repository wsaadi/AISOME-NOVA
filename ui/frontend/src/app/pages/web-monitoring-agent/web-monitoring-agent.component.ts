import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { environment } from '../../../environments/environment';

interface KeyInsight {
  category: string;
  description: string;
  importance: string;
  sources: string[];
}

interface MarketAnalysis {
  key_players: string[];
  market_trends: string[];
  opportunities: string[];
  challenges: string[];
}

interface Source {
  title: string;
  url: string;
  snippet: string;
  language: string;
  relevance_score: number;
}

interface MonitoringSummary {
  topic: string;
  time_range: string;
  analysis_date: string;
  total_sources_analyzed: number;
  executive_summary: string;
  key_insights: KeyInsight[];
  market_analysis: MarketAnalysis;
  technology_evolution: string;
  recommendations: string[];
  sources: Source[];
  formatted_output?: string;
}

interface MonitoringResult {
  success: boolean;
  summary?: MonitoringSummary;
  metadata?: {
    sources_found: number;
    processing_time_seconds: number;
  };
  error?: string;
}

/**
 * Page principale de l'agent de veille technologique et marché
 */
@Component({
  selector: 'app-web-monitoring-agent',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    CustomButtonComponent,
    ProgressBarComponent,
    MarkdownViewerComponent
  ],
  templateUrl: './web-monitoring-agent.component.html',
  styleUrls: ['./web-monitoring-agent.component.scss']
})
export class WebMonitoringAgentComponent implements OnInit {
  // Configuration
  provider: string = 'mistral';
  mistralApiKey: string = '';
  mistralModel: string = 'mistral-small-latest';
  openaiApiKey: string = '';
  openaiModel: string = 'gpt-4o';
  temperature: number = 0.7;
  maxTokens: number = 4096;

  // Paramètres de veille
  topic: string = '';
  timeRange: string = 'last_3_months';
  maxSources: number = 20;
  languageFilter: string = '';

  // État
  isAnalyzing: boolean = false;
  progress: number = 0;
  monitoringResult?: MonitoringResult;
  errorMessage: string = '';

  timeRangeOptions = [
    { value: 'last_week', label: 'Dernière semaine' },
    { value: 'last_month', label: 'Dernier mois' },
    { value: 'last_3_months', label: '3 derniers mois' },
    { value: 'last_6_months', label: '6 derniers mois' }
  ];

  languageOptions = [
    { value: '', label: 'Toutes les langues' },
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'Anglais' },
    { value: 'es', label: 'Espagnol' },
    { value: 'de', label: 'Allemand' }
  ];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    const savedConfig = localStorage.getItem('web-monitoring-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      this.provider = config.provider || 'mistral';
      this.mistralApiKey = config.mistralApiKey || '';
      this.mistralModel = config.mistralModel || 'mistral-small-latest';
      this.openaiApiKey = config.openaiApiKey || '';
      this.openaiModel = config.openaiModel || 'gpt-4o';
      this.temperature = config.temperature || 0.7;
      this.maxTokens = config.maxTokens || 4096;
      this.maxSources = config.maxSources || 20;
    }
  }

  openConfigDialog(): void {
    const dialogRef = this.dialog.open(AgentConfigDialogComponent, {
      width: '600px',
      data: {
        config: {
          provider: this.provider,
          mistralApiKey: this.mistralApiKey,
          mistralModel: this.mistralModel,
          openaiApiKey: this.openaiApiKey,
          openaiModel: this.openaiModel,
          temperature: this.temperature,
          maxTokens: this.maxTokens
        } as AgentConfig,
        agentId: 'web-monitoring',
        agentName: 'Veille Technologique et Marché'
      }
    });

    dialogRef.afterClosed().subscribe((result: AgentConfig) => {
      if (result) {
        this.provider = result.provider;
        this.mistralApiKey = result.mistralApiKey;
        this.mistralModel = result.mistralModel;
        this.openaiApiKey = result.openaiApiKey;
        this.openaiModel = result.openaiModel;
        this.temperature = result.temperature;
        this.maxTokens = result.maxTokens;
      }
    });
  }

  canAnalyze(): boolean {
    const hasApiKey = this.provider === 'mistral'
      ? this.mistralApiKey.trim() !== ''
      : this.openaiApiKey.trim() !== '';
    return this.topic.trim() !== '' && hasApiKey && !this.isAnalyzing;
  }

  async analyze(): Promise<void> {
    if (!this.canAnalyze()) {
      this.errorMessage = 'Veuillez saisir une thématique et configurer votre clé API';
      return;
    }

    this.isAnalyzing = true;
    this.progress = 0;
    this.errorMessage = '';
    this.monitoringResult = undefined;

    const progressInterval = setInterval(() => {
      if (this.progress < 90) {
        this.progress += 2;
      }
    }, 1000);

    try {
      const requestBody: any = {
        topic: this.topic,
        time_range: this.timeRange,
        provider: this.provider,
        model: this.provider === 'mistral' ? this.mistralModel : this.openaiModel,
        max_sources: this.maxSources
      };

      if (this.languageFilter) {
        requestBody.language_filter = this.languageFilter;
      }

      if (this.provider === 'mistral') {
        requestBody.mistral_api_key = this.mistralApiKey;
      } else {
        requestBody.openai_api_key = this.openaiApiKey;
      }

      const apiUrl = `${environment.api.webMonitoring}/api/v1/monitoring/analyze`;

      const response = await firstValueFrom(
        this.http.post<MonitoringResult>(apiUrl, requestBody)
      );

      this.monitoringResult = response;
      this.progress = 100;
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse:', error);
      this.errorMessage = error.error?.error || error.message || 'Une erreur est survenue lors de l\'analyse';
      this.progress = 0;
    } finally {
      clearInterval(progressInterval);
      this.isAnalyzing = false;
    }
  }

  reset(): void {
    this.topic = '';
    this.timeRange = 'last_3_months';
    this.languageFilter = '';
    this.monitoringResult = undefined;
    this.errorMessage = '';
    this.progress = 0;
  }

  getCategoryIcon(category: string): string {
    switch (category.toLowerCase()) {
      case 'innovation': return 'fa-lightbulb';
      case 'tendance': return 'fa-chart-line';
      case 'risque': return 'fa-exclamation-triangle';
      case 'opportunité': return 'fa-star';
      default: return 'fa-info-circle';
    }
  }

  getCategoryClass(category: string): string {
    switch (category.toLowerCase()) {
      case 'innovation': return 'insight--innovation';
      case 'tendance': return 'insight--trend';
      case 'risque': return 'insight--risk';
      case 'opportunité': return 'insight--opportunity';
      default: return 'insight--info';
    }
  }
}
