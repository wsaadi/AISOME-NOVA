import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { FileUploadComponent, UploadedFile } from '../../shared/components/file-upload/file-upload.component';
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { environment } from '../../../environments/environment';

interface AnalysisResult {
  success: boolean;
  message: string;
  analysis_id: string;
  synthesis?: {
    deadline?: string;
    response_method?: string;
    lots_summary?: string;
    specifications_analysis?: string;
    clauses_analysis?: string;
    full_synthesis: string;
    formatted_output?: string;
  };
  synthesis_word_file_id?: string;
  processing_time_seconds?: number;
}

/**
 * Page principale de l'agent d'analyse de documents
 */
@Component({
  selector: 'app-document-analyzer',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    TranslateModule,
    FileUploadComponent,
    CustomButtonComponent,
    ProgressBarComponent,
    MarkdownViewerComponent
  ],
  templateUrl: './document-analyzer.component.html',
  styleUrls: ['./document-analyzer.component.scss']
})
export class DocumentAnalyzerComponent implements OnInit {
  // Configuration
  provider: string = 'mistral';
  mistralApiKey: string = '';
  mistralModel: string = 'mistral-small-latest';
  openaiApiKey: string = '';
  openaiModel: string = 'gpt-4o';
  temperature: number = 0.7;
  maxTokens: number = 4096;

  // État
  uploadedFiles: UploadedFile[] = [];
  isAnalyzing: boolean = false;
  progress: number = 0;
  analysisResult?: AnalysisResult;
  errorMessage: string = '';

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
  }

  loadConfig(): void {
    const savedConfig = localStorage.getItem('document-analyzer-config');
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
        agentId: 'document-analyzer',
        agentName: this.translate.instant('agents.document_analyzer.name')
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

  onFilesSelected(files: UploadedFile[]): void {
    this.uploadedFiles = files;
    this.errorMessage = '';
    this.analysisResult = undefined;
  }

  onFilesRemoved(files: UploadedFile[]): void {
    this.uploadedFiles = files;
  }

  async analyzeDocuments(): Promise<void> {
    if (this.uploadedFiles.length === 0) {
      this.errorMessage = this.translate.instant('agents.document_analyzer.errors.select_document');
      return;
    }

    if (!this.mistralApiKey) {
      this.errorMessage = this.translate.instant('agents.document_analyzer.errors.api_key_required');
      return;
    }

    this.isAnalyzing = true;
    this.progress = 0;
    this.errorMessage = '';
    this.analysisResult = undefined;

    let progressInterval: any;

    try {
      // Préparer les fichiers
      const formData = new FormData();
      this.uploadedFiles.forEach(file => {
        formData.append('files', file.file);
      });
      formData.append('mistral_api_key', this.mistralApiKey);
      formData.append('mistral_model', this.mistralModel);
      formData.append('temperature', this.temperature.toString());
      formData.append('max_tokens', this.maxTokens.toString());

      // Simuler la progression
      progressInterval = setInterval(() => {
        if (this.progress < 90) {
          this.progress += 10;
        }
      }, 1000);

      // Appel API
      const response = await firstValueFrom(
        this.http.post<AnalysisResult>(
          `${environment.api.documentAnalyzer}/api/v1/analyze/documents`,
          formData
        )
      );

      this.progress = 100;
      this.analysisResult = response;

      if (!response.success) {
        this.errorMessage = response.message || this.translate.instant('agents.document_analyzer.errors.analysis_error');
      }

    } catch (error: any) {
      this.errorMessage = error.error?.detail || error.message || this.translate.instant('errors.network');
      console.error('Erreur d\'analyse:', error);
    } finally {
      // Toujours nettoyer l'intervalle et réinitialiser l'état
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      this.isAnalyzing = false;

      // Si une erreur s'est produite, réinitialiser la progression
      if (this.errorMessage) {
        this.progress = 0;
      }
    }
  }

  async downloadWordSynthesis(): Promise<void> {
    if (!this.analysisResult?.synthesis_word_file_id) return;

    try {
      const fileId = this.analysisResult.synthesis_word_file_id;
      const downloadUrl = `${environment.api.documentAnalyzer}/api/v1/analyze/files/${fileId}`;

      // Télécharger le fichier
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement du fichier');
      }

      const blob = await response.blob();

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `synthese_${this.analysisResult.analysis_id}.docx`;
      document.body.appendChild(link);
      link.click();

      // Nettoyer
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur de téléchargement:', error);
      this.errorMessage = this.translate.instant('agents.document_analyzer.errors.download_error');
    }
  }

  resetAnalysis(): void {
    this.uploadedFiles = [];
    this.analysisResult = undefined;
    this.errorMessage = '';
    this.progress = 0;
  }

  get canAnalyze(): boolean {
    return this.uploadedFiles.length > 0 && this.mistralApiKey.trim().length > 0 && !this.isAnalyzing;
  }
}
