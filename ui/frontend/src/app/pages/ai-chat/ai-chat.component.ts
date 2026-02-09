import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom, timeout, TimeoutError, Subscription } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { RoleService } from '../../core/services/role.service';
import { TokenConsumptionService } from '../../core/services/token-consumption.service';
import { QuotaService } from '../../core/services/quota.service';
import { AIProvider } from '../../core/models/token-consumption.model';
import { environment } from '../../../environments/environment';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  documents?: {name: string; type: string; content: string}[];
  timestamp?: Date;
  metadata?: {
    moderation?: ModerationInfo;
    classification?: ClassificationInfo;
  };
  blocked?: boolean;
  blockedReason?: string;
  isError?: boolean;  // Distinguer les erreurs techniques des blocages de modération
}

interface ModerationInfo {
  approved: boolean;
  risk_level: string;
  flags: string[];
  message: string;
}

interface ClassificationInfo {
  request_type: string;
  business_domain: string;
  professional_score: number;
  is_professional: boolean;
  confidence: number;
}

interface ChatResponse {
  success: boolean;
  message?: {
    role: string;
    content: string;
  };
  moderation?: ModerationInfo;
  classification?: ClassificationInfo;
  error?: string;
  blocked_reason?: string;
  metadata?: any;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Composant AI Chat - Interface de chat gouvernée avec modération
 */
@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    CustomButtonComponent,
    MarkdownViewerComponent,
    TranslateModule
  ],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.scss']
})
export class AiChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // Configuration
  provider: string = 'mistral';
  mistralModel: string = 'mistral-small-latest';
  openaiModel: string = 'gpt-4o';
  anthropicModel: string = 'claude-3-5-sonnet-20241022';
  geminiModel: string = 'gemini-2.0-flash-exp';
  perplexityModel: string = 'sonar';
  nvidiaNimModel: string = 'meta/llama-3.1-8b-instruct';
  temperature: number = 0.7;
  maxTokens: number = 4096;
  mistralApiKey: string = '';
  openaiApiKey: string = '';
  anthropicApiKey: string = '';
  geminiApiKey: string = '';
  perplexityApiKey: string = '';
  nvidiaNimApiKey: string = '';
  strictModeration: boolean = true;

  // État
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  isSending: boolean = false;
  errorMessage: string = '';
  showMetadata: boolean = false;
  uploadedImages: string[] = [];
  uploadedDocuments: {name: string; type: string; content: string}[] = [];
  uploadedDocumentFiles: File[] = []; // Stocke les fichiers bruts pour FormData

  private shouldScrollToBottom = false;
  private langChangeSubscription?: Subscription;

  private requestStartTime: number = 0;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router,
    private roleService: RoleService,
    private tokenConsumptionService: TokenConsumptionService,
    private quotaService: QuotaService,
    private translate: TranslateService
  ) {}

  get isAdmin(): boolean {
    return this.roleService.hasRole('admin');
  }

  ngOnInit(): void {
    this.loadConfig();
    this.initializeChat();

    // S'abonner aux changements de langue pour mettre à jour le message de bienvenue
    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      // Mettre à jour le message de bienvenue si le chat n'a que le message initial
      if (this.messages.length === 1 && this.messages[0].role === 'assistant') {
        this.messages[0].content = this.translate.instant('agents.ai_chat.welcome_message');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadConfig(): void {
    const savedConfig = localStorage.getItem('ai-chat-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      this.provider = config.provider || 'mistral';
      this.mistralModel = config.mistralModel || 'mistral-small-latest';
      this.openaiModel = config.openaiModel || 'gpt-4o';
      this.anthropicModel = config.anthropicModel || 'claude-3-5-sonnet-20241022';
      this.geminiModel = config.geminiModel || 'gemini-2.0-flash-exp';
      this.perplexityModel = config.perplexityModel || 'sonar';
      this.nvidiaNimModel = config.nvidiaNimModel || 'meta/llama-3.1-8b-instruct';
      this.temperature = config.temperature || 0.7;
      this.maxTokens = config.maxTokens || 4096;
      this.mistralApiKey = config.mistralApiKey || '';
      this.openaiApiKey = config.openaiApiKey || '';
      this.anthropicApiKey = config.anthropicApiKey || '';
      this.geminiApiKey = config.geminiApiKey || '';
      this.perplexityApiKey = config.perplexityApiKey || '';
      this.nvidiaNimApiKey = config.nvidiaNimApiKey || '';
      this.strictModeration = config.strictModeration !== undefined ? config.strictModeration : true;
    }
  }

  saveConfig(): void {
    const config = {
      provider: this.provider,
      mistralModel: this.mistralModel,
      openaiModel: this.openaiModel,
      anthropicModel: this.anthropicModel,
      geminiModel: this.geminiModel,
      perplexityModel: this.perplexityModel,
      nvidiaNimModel: this.nvidiaNimModel,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      mistralApiKey: this.mistralApiKey,
      openaiApiKey: this.openaiApiKey,
      anthropicApiKey: this.anthropicApiKey,
      geminiApiKey: this.geminiApiKey,
      perplexityApiKey: this.perplexityApiKey,
      nvidiaNimApiKey: this.nvidiaNimApiKey,
      strictModeration: this.strictModeration
    };
    localStorage.setItem('ai-chat-config', JSON.stringify(config));
  }

  initializeChat(): void {
    // Message de bienvenue traduit
    const welcomeMessage = this.translate.instant('agents.ai_chat.welcome_message');
    this.messages = [
      {
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      }
    ];
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
          anthropicApiKey: this.anthropicApiKey,
          anthropicModel: this.anthropicModel,
          geminiApiKey: this.geminiApiKey,
          geminiModel: this.geminiModel,
          perplexityApiKey: this.perplexityApiKey,
          perplexityModel: this.perplexityModel,
          nvidiaNimApiKey: this.nvidiaNimApiKey,
          nvidiaNimModel: this.nvidiaNimModel,
          temperature: this.temperature,
          maxTokens: this.maxTokens
        } as AgentConfig,
        agentId: 'ai-chat',
        agentName: this.translate.instant('agents.ai_chat.name')
      }
    });

    dialogRef.afterClosed().subscribe((result: AgentConfig) => {
      if (result) {
        this.provider = result.provider;
        this.mistralModel = result.mistralModel;
        this.openaiModel = result.openaiModel;
        this.anthropicModel = result.anthropicModel;
        this.geminiModel = result.geminiModel;
        this.perplexityModel = result.perplexityModel;
        this.nvidiaNimModel = result.nvidiaNimModel;
        this.temperature = result.temperature;
        this.maxTokens = result.maxTokens;
        this.mistralApiKey = result.mistralApiKey;
        this.openaiApiKey = result.openaiApiKey;
        this.anthropicApiKey = result.anthropicApiKey;
        this.geminiApiKey = result.geminiApiKey;
        this.perplexityApiKey = result.perplexityApiKey;
        this.nvidiaNimApiKey = result.nvidiaNimApiKey;
        this.saveConfig();
      }
    });
  }

  getCurrentModel(): string {
    switch (this.provider) {
      case 'mistral': return this.mistralModel;
      case 'openai': return this.openaiModel;
      case 'anthropic': return this.anthropicModel;
      case 'gemini': return this.geminiModel;
      case 'perplexity': return this.perplexityModel;
      case 'nvidia-nim': return this.nvidiaNimModel;
      default: return this.mistralModel;
    }
  }

  getCurrentApiKey(): string {
    switch (this.provider) {
      case 'mistral': return this.mistralApiKey;
      case 'openai': return this.openaiApiKey;
      case 'anthropic': return this.anthropicApiKey;
      case 'gemini': return this.geminiApiKey;
      case 'perplexity': return this.perplexityApiKey;
      case 'nvidia-nim': return this.nvidiaNimApiKey;
      default: return this.mistralApiKey;
    }
  }

  getApiKeyFieldName(): string {
    switch (this.provider) {
      case 'mistral': return 'mistral_api_key';
      case 'openai': return 'openai_api_key';
      case 'anthropic': return 'anthropic_api_key';
      case 'gemini': return 'gemini_api_key';
      case 'perplexity': return 'perplexity_api_key';
      case 'nvidia-nim': return 'nvidia_nim_api_key';
      default: return 'mistral_api_key';
    }
  }

  openModerationSettings(): void {
    this.router.navigate(['/moderation-settings']);
  }

  async sendMessage(): Promise<void> {
    if ((!this.currentMessage.trim() && this.uploadedImages.length === 0 && this.uploadedDocuments.length === 0) || this.isSending) {
      return;
    }

    // Vérifier la clé API selon le provider
    const apiKey = this.getCurrentApiKey();
    if (!apiKey) {
      this.errorMessage = this.translate.instant('agents.ai_chat.errors.api_key_missing', { provider: this.providerName });
      return;
    }

    this.isSending = true;
    this.errorMessage = '';
    this.requestStartTime = Date.now();

    // Ajouter le message utilisateur avec images et documents
    const userMessage: ChatMessage = {
      role: 'user',
      content: this.currentMessage || this.translate.instant('agents.ai_chat.messages.files_attached'),
      images: this.uploadedImages.length > 0 ? [...this.uploadedImages] : undefined,
      documents: this.uploadedDocuments.length > 0 ? [...this.uploadedDocuments] : undefined,
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    this.shouldScrollToBottom = true;

    const messageContent = this.currentMessage;
    this.currentMessage = '';
    const messageImages = [...this.uploadedImages];
    const messageDocuments = [...this.uploadedDocuments];
    const messageDocumentFiles = [...this.uploadedDocumentFiles];
    this.uploadedImages = [];
    this.uploadedDocuments = [];
    this.uploadedDocumentFiles = [];

    try {
      let response: ChatResponse;

      // Si des fichiers sont uploadés, utiliser multipart/form-data
      if (messageDocumentFiles.length > 0) {
        // Utiliser FormData pour éviter les problèmes avec les gros PDFs
        const formData = new FormData();

        // Ajouter le message
        formData.append('message', messageContent || this.translate.instant('agents.ai_chat.messages.files_attached'));

        // Ajouter les fichiers
        messageDocumentFiles.forEach(file => {
          formData.append('files', file);
        });

        // Ajouter la configuration
        formData.append('provider', this.provider);
        formData.append('model', this.getCurrentModel());
        formData.append('temperature', this.temperature.toString());
        formData.append('max_tokens', this.maxTokens.toString());
        formData.append('strict_moderation', this.strictModeration.toString());

        formData.append(this.getApiKeyFieldName(), this.getCurrentApiKey());

        // Ajouter l'historique de conversation (messages non bloqués, sans le dernier)
        const conversationHistory = this.messages
          .filter(m => !m.blocked)
          .slice(0, -1) // Exclure le message qu'on vient d'ajouter
          .map(m => ({
            role: m.role,
            content: m.content,
            images: m.images
          }));

        if (conversationHistory.length > 0) {
          formData.append('conversation_history', JSON.stringify(conversationHistory));
        }

        // Appel API avec FormData
        response = await firstValueFrom(
          this.http.post<ChatResponse>(
            `${environment.api.aiChat}/api/v1/chat/completions/multipart`,
            formData
          ).pipe(
            timeout(180000) // 3 minutes timeout
          )
        );
      } else {
        // Pas de fichiers : utiliser JSON comme avant
        const requestMessages = this.messages
          .filter(m => !m.blocked)
          .map(m => ({
            role: m.role,
            content: m.content,
            images: m.images,
            documents: m.documents
          }));

        const requestBody: Record<string, any> = {
          messages: requestMessages,
          provider: this.provider,
          model: this.getCurrentModel(),
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          strict_moderation: this.strictModeration,
          [this.getApiKeyFieldName()]: this.getCurrentApiKey()
        };

        // Appel API avec JSON
        response = await firstValueFrom(
          this.http.post<ChatResponse>(
            `${environment.api.aiChat}/api/v1/chat/completions`,
            requestBody
          ).pipe(
            timeout(180000) // 3 minutes timeout
          )
        );
      }

      if (response.success && response.message) {
        // Calculer la durée de la requête
        const durationMs = Date.now() - this.requestStartTime;

        // Ajouter la réponse de l'assistant
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.message.content,
          timestamp: new Date(),
          metadata: {
            moderation: response.moderation,
            classification: response.classification
          }
        };
        this.messages.push(assistantMessage);

        // Enregistrer la consommation de tokens
        this.recordTokenConsumption(
          messageContent,
          response.message.content,
          response.usage,
          durationMs
        );
      } else {
        // Message bloqué - Marquer AUSSI le message utilisateur comme bloqué
        // pour éviter qu'il soit renvoyé dans les prochaines requêtes
        userMessage.blocked = true;

        // Afficher le message de refus formaté
        const blockedReason = response.blocked_reason || response.error || this.translate.instant('agents.ai_chat.errors.blocked_default');

        const blockedMessage: ChatMessage = {
          role: 'assistant',
          content: blockedReason,
          timestamp: new Date(),
          blocked: true,
          blockedReason: blockedReason,
          metadata: {
            moderation: response.moderation,
            classification: response.classification
          }
        };
        this.messages.push(blockedMessage);
      }

      this.shouldScrollToBottom = true;

    } catch (error: any) {
      // Déterminer le type d'erreur et fournir un message approprié
      let errorMessage: string;
      let errorDetails: string = '';

      if (error instanceof TimeoutError || error.name === 'TimeoutError') {
        // Timeout - le serveur prend trop de temps à répondre
        errorMessage = this.translate.instant('agents.ai_chat.errors.timeout');
        const docNames = messageDocuments.length > 0 ? messageDocuments.map(d => d.name).join(', ') : '-';
        errorDetails = `**${this.translate.instant('agents.ai_chat.errors.timeout_details')}**

**${this.translate.instant('agents.ai_chat.errors.timeout_causes')}**
- ${this.translate.instant('agents.ai_chat.errors.timeout_cause_large_doc')} (${docNames})
- ${this.translate.instant('agents.ai_chat.errors.timeout_cause_overload')}
- ${this.translate.instant('agents.ai_chat.errors.timeout_cause_complex')}

**${this.translate.instant('agents.ai_chat.errors.timeout_solutions')}**
- ${this.translate.instant('agents.ai_chat.errors.timeout_solution_smaller')}
- ${this.translate.instant('agents.ai_chat.errors.timeout_solution_split')}
- ${this.translate.instant('agents.ai_chat.errors.timeout_solution_retry')}`;
      } else if (error.status === 0) {
        // Erreur HTTP 0 = problème de connexion réseau
        errorMessage = this.translate.instant('agents.ai_chat.errors.backend_not_running');
        errorDetails = `**${this.translate.instant('agents.ai_chat.errors.backend_details')}**

\`\`\`bash
# Docker Compose
docker-compose up -d ai-chat-agent

# Health check
curl ${environment.api.aiChat}/health
\`\`\`

**Services:**
- AI Chat Agent (port 8012)
- Prompt Moderation (port 8013)
- Content Classification (port 8014)
- Mistral Connector (port 8005)

**URL:** ${environment.api.aiChat}`;
      } else if (error.status >= 500) {
        // Erreur serveur
        errorMessage = this.translate.instant('agents.ai_chat.errors.server_internal');
        errorDetails = error.error?.detail || error.message || this.translate.instant('agents.ai_chat.errors.unexpected_error');
      } else if (error.status >= 400) {
        // Erreur client (requête invalide)
        errorMessage = this.translate.instant('agents.ai_chat.errors.request_error');
        errorDetails = error.error?.detail || error.message || this.translate.instant('agents.ai_chat.errors.unexpected_error');
      } else {
        // Autre erreur
        errorMessage = this.translate.instant('agents.ai_chat.errors.connection_error');
        errorDetails = error.error?.detail || error.message || this.translate.instant('agents.ai_chat.errors.unexpected_error');
      }

      this.errorMessage = errorMessage;
      console.error('Erreur d\'envoi:', error);
      console.error('Type:', error.name);
      console.error('Status:', error.status);
      console.error('Details:', errorDetails);

      // Ajouter un message d'erreur détaillé dans le chat
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `**${errorMessage}**\n\n${errorDetails}`,
        timestamp: new Date(),
        blocked: false,
        isError: true  // Marquer comme erreur technique, pas modération
      };
      this.messages.push(errorMsg);
      this.shouldScrollToBottom = true;
    } finally {
      this.isSending = false;
    }
  }

  clearChat(): void {
    this.messages = [];
    this.initializeChat();
    this.errorMessage = '';
  }

  toggleMetadata(): void {
    this.showMetadata = !this.showMetadata;
  }

  getMessageMetadata(message: ChatMessage): string {
    if (!message.metadata) return '';

    let metadata = '';

    if (message.metadata.moderation) {
      const mod = message.metadata.moderation;
      const status = mod.approved
        ? this.translate.instant('agents.ai_chat.moderation.approved')
        : this.translate.instant('agents.ai_chat.moderation.rejected');
      metadata += `**${this.translate.instant('moderation.title')}:** ${status} (${this.translate.instant('agents.ai_chat.moderation.risk_level')}: ${mod.risk_level})`;
      if (mod.flags.length > 0) {
        metadata += `\n${this.translate.instant('agents.ai_chat.moderation.flags')}: ${mod.flags.join(', ')}`;
      }
    }

    if (message.metadata.classification) {
      const cls = message.metadata.classification;
      metadata += `\n\n**${this.translate.instant('agents.ai_chat.classification.title')}:**\n${this.translate.instant('agents.ai_chat.classification.type')}: ${cls.request_type}\n${this.translate.instant('agents.ai_chat.classification.domain')}: ${cls.business_domain}\n${this.translate.instant('agents.ai_chat.classification.professional_score')}: ${cls.professional_score}/100`;
    }

    return metadata;
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async onImageSelect(event: any): Promise<void> {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Vérifier que c'est une image
      if (!file.type.startsWith('image/')) {
        this.errorMessage = this.translate.instant('agents.ai_chat.errors.image_type_invalid');
        continue;
      }

      // Limiter la taille (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = this.translate.instant('agents.ai_chat.errors.image_size_exceeded');
        continue;
      }

      // Convertir en base64
      try {
        const base64 = await this.fileToBase64(file);
        this.uploadedImages.push(base64);
      } catch (error) {
        console.error('Erreur conversion image:', error);
        this.errorMessage = this.translate.instant('agents.ai_chat.errors.image_load_failed');
      }
    }

    // Réinitialiser l'input
    event.target.value = '';
  }

  async onDocumentSelect(event: any): Promise<void> {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Limiter la taille (10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = this.translate.instant('agents.ai_chat.errors.document_size_exceeded');
        continue;
      }

      try {
        // Stocker le fichier brut pour FormData
        this.uploadedDocumentFiles.push(file);

        // Pour l'affichage dans l'interface, stocker aussi les métadonnées
        this.uploadedDocuments.push({
          name: file.name,
          type: file.type || this.getFileType(file.name),
          content: '' // Pas besoin de lire le contenu maintenant
        });
      } catch (error) {
        console.error('Erreur lecture document:', error);
        this.errorMessage = this.translate.instant('agents.ai_chat.errors.document_load_failed');
      }
    }

    // Réinitialiser l'input
    event.target.value = '';
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'ppt': 'application/vnd.ms-powerpoint',
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'csv': 'text/csv'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  removeDocument(index: number): void {
    this.uploadedDocuments.splice(index, 1);
    this.uploadedDocumentFiles.splice(index, 1);
  }

  get canSend(): boolean {
    const apiKey = this.getCurrentApiKey();
    const hasContent = this.currentMessage.trim().length > 0 || this.uploadedImages.length > 0 || this.uploadedDocuments.length > 0;
    return hasContent && !this.isSending && apiKey.length > 0;
  }

  get providerName(): string {
    const names: Record<string, string> = {
      'mistral': 'Mistral AI',
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'gemini': 'Google Gemini',
      'perplexity': 'Perplexity',
      'nvidia-nim': 'NVIDIA NIM'
    };
    return names[this.provider] || this.provider;
  }

  /**
   * Enregistre la consommation de tokens pour cette interaction
   */
  private async recordTokenConsumption(
    promptContent: string,
    responseContent: string,
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    durationMs: number = 0
  ): Promise<void> {
    try {
      // Obtenir les infos utilisateur
      const profile = await this.roleService.getUserProfile();
      const userId = profile?.id || 'anonymous';
      const username = profile?.username || profile?.email || 'Utilisateur';

      // Estimer les tokens si non fournis par l'API
      // Estimation approximative : 1 token ≈ 4 caractères en moyenne
      const promptTokens = usage?.prompt_tokens || Math.ceil(promptContent.length / 4);
      const completionTokens = usage?.completion_tokens || Math.ceil(responseContent.length / 4);

      // Déterminer le provider et le modèle
      const provider = this.provider as AIProvider;
      const model = this.getCurrentModel();

      // Enregistrer la consommation
      this.tokenConsumptionService.recordConsumption({
        userId,
        username,
        agentId: 'ai-chat',
        agentName: 'Assistant IA Professionnel',
        provider,
        model,
        promptTokens,
        completionTokens,
        durationMs
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la consommation:', error);
    }
  }
}
