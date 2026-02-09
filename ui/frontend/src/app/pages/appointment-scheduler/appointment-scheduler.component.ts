import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { environment } from '../../../environments/environment';

interface CompanyAnalysis {
  recent_news: any[];
  market_analysis: string;
  tech_stack?: string;
}

interface ContactAnalysis {
  background: string;
  recent_activities: any[];
  professional_positions: string;
  key_interests?: string;
}

interface Recommendations {
  talking_points: string[];
  questions_to_ask: string[];
  value_propositions: string[];
  risks_and_considerations: string[];
}

interface AppointmentSynthesis {
  company_analysis: CompanyAnalysis;
  contact_analysis: ContactAnalysis;
  recommendations: Recommendations;
  executive_summary: string;
}

interface SchedulerResult {
  success: boolean;
  message: string;
  preparation_id: string;
  synthesis?: AppointmentSynthesis;
  pptx_file_id?: string;
  processing_time_seconds?: number;
}

/**
 * Page principale de l'agent de préparation de rendez-vous
 */
@Component({
  selector: 'app-appointment-scheduler',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    TranslateModule,
    CustomButtonComponent,
    ProgressBarComponent,
    MarkdownViewerComponent
  ],
  templateUrl: './appointment-scheduler.component.html',
  styleUrls: ['./appointment-scheduler.component.scss']
})
export class AppointmentSchedulerComponent implements OnInit {
  // Configuration LLM
  provider: string = 'mistral';
  mistralApiKey: string = '';
  mistralModel: string = 'mistral-small-latest';
  openaiApiKey: string = '';
  openaiModel: string = 'gpt-4o';
  temperature: number = 0.7;
  maxTokens: number = 4096;

  // Données du formulaire
  appointmentDate: string = '';
  companyName: string = '';
  contactName: string = '';
  contactPosition: string = '';
  appointmentObjective: string = '';

  // État
  isPreparing: boolean = false;
  progress: number = 0;
  preparationResult?: SchedulerResult;
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    // Définir la date par défaut à aujourd'hui
    const today = new Date();
    this.appointmentDate = today.toISOString().split('T')[0];
  }

  loadConfig(): void {
    const savedConfig = localStorage.getItem('appointment-scheduler-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      this.provider = config.provider || 'mistral';
      this.mistralApiKey = config.mistralApiKey || '';
      this.mistralModel = config.mistralModel || 'mistral-small-latest';
      this.openaiApiKey = config.openaiApiKey || '';
      this.openaiModel = config.openaiModel || 'gpt-4o';
      this.temperature = config.temperature || 0.7;
      this.maxTokens = config.maxTokens || 4096;
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
        agentId: 'appointment-scheduler',
        agentName: this.translate.instant('agents.appointment_scheduler.name')
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

  async prepareAppointment(): Promise<void> {
    if (!this.canPrepare) {
      this.errorMessage = this.translate.instant('agents.appointment_scheduler.errors.fill_required');
      return;
    }

    if (!this.mistralApiKey) {
      this.errorMessage = this.translate.instant('agents.appointment_scheduler.errors.api_key_required');
      return;
    }

    this.isPreparing = true;
    this.progress = 0;
    this.errorMessage = '';
    this.preparationResult = undefined;

    let progressInterval: any;

    try {
      // Préparer les données
      const requestData = {
        appointment_date: this.appointmentDate,
        company_name: this.companyName,
        contact_name: this.contactName,
        contact_position: this.contactPosition,
        appointment_objective: this.appointmentObjective,
        mistral_api_key: this.mistralApiKey,
        mistral_model: this.mistralModel,
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };

      // Simuler la progression
      progressInterval = setInterval(() => {
        if (this.progress < 90) {
          this.progress += 10;
        }
      }, 2000);

      // Appel API
      const response = await firstValueFrom(
        this.http.post<SchedulerResult>(
          `${environment.api.appointmentScheduler}/api/v1/scheduler/prepare`,
          requestData
        )
      );

      this.progress = 100;
      this.preparationResult = response;

      if (!response.success) {
        this.errorMessage = response.message || this.translate.instant('agents.appointment_scheduler.errors.preparation_error');
      }

    } catch (error: any) {
      this.errorMessage = error.error?.detail || error.message || this.translate.instant('errors.network');
      console.error('Erreur de préparation:', error);
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      this.isPreparing = false;

      if (this.errorMessage) {
        this.progress = 0;
      }
    }
  }

  async downloadPowerPoint(): Promise<void> {
    if (!this.preparationResult?.pptx_file_id) return;

    try {
      const fileId = this.preparationResult.pptx_file_id;
      const downloadUrl = `${environment.api.appointmentScheduler}/api/v1/scheduler/files/${fileId}`;

      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du fichier');
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `preparation_rdv_${this.companyName.replace(/\s+/g, '_')}.pptx`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      this.errorMessage = this.translate.instant('agents.appointment_scheduler.errors.download_error');
    }
  }

  resetPreparation(): void {
    this.appointmentDate = new Date().toISOString().split('T')[0];
    this.companyName = '';
    this.contactName = '';
    this.contactPosition = '';
    this.appointmentObjective = '';
    this.preparationResult = undefined;
    this.errorMessage = '';
    this.progress = 0;
  }

  get canPrepare(): boolean {
    return this.appointmentDate.trim().length > 0 &&
           this.companyName.trim().length > 0 &&
           this.contactName.trim().length > 0 &&
           this.contactPosition.trim().length > 0 &&
           this.appointmentObjective.trim().length > 0 &&
           this.mistralApiKey.trim().length > 0 &&
           !this.isPreparing;
  }
}
