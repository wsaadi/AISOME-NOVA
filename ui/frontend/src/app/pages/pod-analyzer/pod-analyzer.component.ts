import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { FileUploadComponent, UploadedFile } from '../../shared/components/file-upload/file-upload.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { environment } from '../../../environments/environment';

interface FileInfo {
  filename: string;
  path: string;
  size: number;
  modified_date?: string;
  has_pod_attachment?: boolean;
}

interface FolderContent {
  folder_path: string;
  files: FileInfo[];
  total_files: number;
}

interface CriteriaCheck {
  criteria_name: string;
  match_rate: number;
  status: string;
  pod_value?: string;
  bdc_value?: string;
  comment: string;
}

interface CorrelationResult {
  eml_filename: string;
  pod_filename: string;
  bdc_filename: string;
  correlation_score: number;
  matching_fields: string[];
  synthesis: string;
  criteria_checks?: CriteriaCheck[];
  pod_deleted: boolean;
  bdc_deleted: boolean;
}

interface AnalysisResponse {
  success: boolean;
  message: string;
  analysis_id: string;
  mail_folder_content?: FolderContent;
  bdc_folder_content?: FolderContent;
  correlations?: CorrelationResult[];
  processing_time_seconds?: number;
  error?: string;
}

interface UploadedFileInfo {
  filename: string;
  size: number;
  saved_path: string;
  file_type: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  uploaded_files: UploadedFileInfo[];
  mail_folder_path: string;
  bdc_folder_path: string;
  error?: string;
}

/**
 * Page principale de l'agent d'analyse de pièces jointes POD
 */
@Component({
  selector: 'app-pod-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    CustomButtonComponent,
    ProgressBarComponent,
    MarkdownViewerComponent,
    FileUploadComponent
  ],
  templateUrl: './pod-analyzer.component.html',
  styleUrls: ['./pod-analyzer.component.scss']
})
export class PodAnalyzerComponent implements OnInit {
  // Configuration
  provider: string = 'mistral';
  mistralApiKey: string = '';
  mistralModel: string = 'mistral-small-latest';
  openaiApiKey: string = '';
  openaiModel: string = 'gpt-4o';
  temperature: number = 0.3;
  maxTokens: number = 4096;
  podFolderPath: string = '/tmp/POD';
  bdcFolderPath: string = '/tmp/BDC';

  // État
  isAnalyzing: boolean = false;
  isLoading: boolean = false;
  isUploading: boolean = false;
  progress: number = 0;
  analysisResult?: AnalysisResponse;
  errorMessage: string = '';
  uploadMessage: string = '';

  // Contenu des dossiers
  podFiles: FileInfo[] = [];
  bdcFiles: FileInfo[] = [];

  // Upload de fichiers
  podUploadFiles: UploadedFile[] = [];
  bdcUploadFiles: UploadedFile[] = [];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadFolders();
  }

  loadConfig(): void {
    const savedConfig = localStorage.getItem('pod-analyzer-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      this.provider = config.provider || 'mistral';
      this.mistralApiKey = config.mistralApiKey || '';
      this.mistralModel = config.mistralModel || 'mistral-small-latest';
      this.openaiApiKey = config.openaiApiKey || '';
      this.openaiModel = config.openaiModel || 'gpt-4o';
      this.temperature = config.temperature || 0.3;
      this.maxTokens = config.maxTokens || 4096;
      this.podFolderPath = config.podFolderPath || '/tmp/POD';
      this.bdcFolderPath = config.bdcFolderPath || '/tmp/BDC';
    }
  }

  saveConfig(): void {
    const config = {
      provider: this.provider,
      mistralApiKey: this.mistralApiKey,
      mistralModel: this.mistralModel,
      openaiApiKey: this.openaiApiKey,
      openaiModel: this.openaiModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      podFolderPath: this.podFolderPath,
      bdcFolderPath: this.bdcFolderPath
    };
    localStorage.setItem('pod-analyzer-config', JSON.stringify(config));
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
        agentId: 'pod-analyzer',
        agentName: 'Analyseur de POD'
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

  async loadFolders(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const requestData = {
        provider: this.provider,
        mistral_api_key: this.mistralApiKey,
        mistral_model: this.mistralModel,
        openai_api_key: this.openaiApiKey,
        openai_model: this.openaiModel,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        pod_folder_path: this.podFolderPath,
        bdc_folder_path: this.bdcFolderPath
      };

      const response = await firstValueFrom(
        this.http.post<AnalysisResponse>(
          `${environment.apiUrl}/api/v1/analyzer/list-folders`,
          requestData
        )
      );

      if (response.success) {
        this.podFiles = response.mail_folder_content?.files || [];
        this.bdcFiles = response.bdc_folder_content?.files || [];
      } else {
        this.errorMessage = response.error || 'Erreur lors du chargement des dossiers';
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des dossiers:', error);
      this.errorMessage = error.error?.detail || error.message || 'Erreur lors du chargement des dossiers';
    } finally {
      this.isLoading = false;
    }
  }

  async analyzeFiles(): Promise<void> {
    this.isAnalyzing = true;
    this.progress = 0;
    this.errorMessage = '';
    this.analysisResult = undefined;

    // Sauvegarder la configuration
    this.saveConfig();

    try {
      // Simuler la progression
      const progressInterval = setInterval(() => {
        if (this.progress < 90) {
          this.progress += 10;
        }
      }, 1000);

      const requestData = {
        provider: this.provider,
        mistral_api_key: this.mistralApiKey,
        mistral_model: this.mistralModel,
        openai_api_key: this.openaiApiKey,
        openai_model: this.openaiModel,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        pod_folder_path: this.podFolderPath,
        bdc_folder_path: this.bdcFolderPath
      };

      const response = await firstValueFrom(
        this.http.post<AnalysisResponse>(
          `${environment.apiUrl}/api/v1/analyzer/analyze`,
          requestData
        )
      );

      clearInterval(progressInterval);
      this.progress = 100;

      if (response.success) {
        this.analysisResult = response;

        // Recharger les dossiers pour voir les fichiers supprimés
        await this.loadFolders();
      } else {
        this.errorMessage = response.error || 'Erreur lors de l\'analyse';
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'analyse:', error);
      this.errorMessage = error.error?.detail || error.message || 'Erreur lors de l\'analyse';
    } finally {
      this.isAnalyzing = false;
    }
  }

  resetAnalysis(): void {
    this.analysisResult = undefined;
    this.errorMessage = '';
    this.progress = 0;
    this.loadFolders();
  }

  get canAnalyze(): boolean {
    return this.podFiles.length > 0 && this.bdcFiles.length > 0 && !this.isAnalyzing;
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
  }

  getCorrelationScoreClass(score: number): string {
    if (score >= 0.8) return 'score-high';
    if (score >= 0.5) return 'score-medium';
    return 'score-low';
  }

  getDeletedFilesCount(): number {
    if (!this.analysisResult?.correlations) return 0;
    const podDeleted = this.analysisResult.correlations.filter(c => c.pod_deleted).length;
    const bdcDeleted = this.analysisResult.correlations.filter(c => c.bdc_deleted).length;
    return podDeleted + bdcDeleted;
  }

  getCriteriaStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok':
        return 'criteria-status-ok';
      case 'warning':
        return 'criteria-status-warning';
      case 'error':
        return 'criteria-status-error';
      default:
        return 'criteria-status-unknown';
    }
  }

  getCriteriaStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok':
        return 'fa fa-check-circle';
      case 'warning':
        return 'fa fa-exclamation-triangle';
      case 'error':
        return 'fa fa-times-circle';
      default:
        return 'fa fa-question-circle';
    }
  }

  // Gestion de l'upload de fichiers POD
  onPodFilesSelected(files: UploadedFile[]): void {
    this.podUploadFiles = files;
    this.uploadMessage = '';
  }

  // Gestion de l'upload de fichiers BDC
  onBdcFilesSelected(files: UploadedFile[]): void {
    this.bdcUploadFiles = files;
    this.uploadMessage = '';
  }

  // Upload des fichiers vers le serveur
  async uploadFiles(): Promise<void> {
    if (this.podUploadFiles.length === 0 && this.bdcUploadFiles.length === 0) {
      this.uploadMessage = 'Veuillez sélectionner au moins un fichier à uploader';
      return;
    }

    this.isUploading = true;
    this.uploadMessage = '';
    this.errorMessage = '';

    try {
      const formData = new FormData();

      // Ajouter les fichiers POD
      this.podUploadFiles.forEach(file => {
        formData.append('files', file.file);
      });

      // Ajouter les fichiers BDC
      this.bdcUploadFiles.forEach(file => {
        formData.append('files', file.file);
      });

      // Ajouter les chemins des dossiers
      formData.append('pod_folder_path', this.podFolderPath);
      formData.append('bdc_folder_path', this.bdcFolderPath);

      const response = await firstValueFrom(
        this.http.post<UploadResponse>(
          `${environment.apiUrl}/api/v1/analyzer/upload`,
          formData
        )
      );

      if (response.success) {
        this.uploadMessage = response.message;

        // Réinitialiser les fichiers sélectionnés
        this.podUploadFiles = [];
        this.bdcUploadFiles = [];

        // Recharger les dossiers pour afficher les nouveaux fichiers
        await this.loadFolders();
      } else {
        this.errorMessage = response.error || 'Erreur lors de l\'upload des fichiers';
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      this.errorMessage = error.error?.detail || error.message || 'Erreur lors de l\'upload des fichiers';
    } finally {
      this.isUploading = false;
    }
  }

  // Gestion des erreurs d'upload
  onUploadError(error: string): void {
    this.errorMessage = error;
  }

  get canUpload(): boolean {
    return (this.podUploadFiles.length > 0 || this.bdcUploadFiles.length > 0) && !this.isUploading;
  }
}
