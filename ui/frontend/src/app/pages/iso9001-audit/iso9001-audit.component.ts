import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { UploadedFile } from '../../shared/components/file-upload/file-upload.component';
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { environment } from '../../../environments/environment';

// ===== Interfaces =====

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  documents?: { name: string; type: string; content: string }[];
  isError?: boolean;
  blocked?: boolean;
  blockedReason?: string;
}

interface ChatResponse {
  success: boolean;
  message?: { role: string; content: string };
  error?: string;
  blocked_reason?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface ISOChapter {
  number: string;
  title: string;
  icon: string;
  subChapters: string[];
}

interface GenerationResult {
  success: boolean;
  content: string;
  fileId?: string;
  processingTime?: number;
}

// ===== Component =====

@Component({
  selector: 'app-iso9001-audit',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatDialogModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    TranslateModule,
    CustomButtonComponent,
    ProgressBarComponent,
    MarkdownViewerComponent
  ],
  templateUrl: './iso9001-audit.component.html',
  styleUrls: ['./iso9001-audit.component.scss']
})
export class Iso9001AuditComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // ===== Configuration LLM =====
  provider: string = 'anthropic';
  mistralApiKey: string = '';
  mistralModel: string = 'mistral-large-latest';
  openaiApiKey: string = '';
  openaiModel: string = 'gpt-4';
  anthropicApiKey: string = '';
  anthropicModel: string = 'claude-sonnet-4-20250514';
  temperature: number = 0.4;
  maxTokens: number = 8192;

  // ===== Tab active =====
  activeTabIndex: number = 0;

  // ===== Framework ISO 9001 =====
  selectedChapter: string = '';
  sectorFilter: string = '';
  companySizeFilter: string = '';
  frameworkContent: string = '';
  isLoadingFramework: boolean = false;
  frameworkSearchQuery: string = '';

  isoChapters: ISOChapter[] = [
    { number: '4', title: 'Contexte de l\'organisation', icon: 'fa-building', subChapters: ['4.1 Compréhension du contexte', '4.2 Parties intéressées', '4.3 Domaine d\'application', '4.4 SMQ et processus'] },
    { number: '5', title: 'Leadership', icon: 'fa-crown', subChapters: ['5.1 Leadership et engagement', '5.2 Politique qualité', '5.3 Rôles et responsabilités'] },
    { number: '6', title: 'Planification', icon: 'fa-chess', subChapters: ['6.1 Risques et opportunités', '6.2 Objectifs qualité', '6.3 Planification des modifications'] },
    { number: '7', title: 'Support', icon: 'fa-hands-helping', subChapters: ['7.1 Ressources', '7.2 Compétences', '7.3 Sensibilisation', '7.4 Communication', '7.5 Informations documentées'] },
    { number: '8', title: 'Réalisation des activités opérationnelles', icon: 'fa-cogs', subChapters: ['8.1 Planification opérationnelle', '8.2 Exigences produits/services', '8.3 Conception et développement', '8.4 Prestataires externes', '8.5 Production et prestation', '8.6 Libération produits', '8.7 Éléments non conformes'] },
    { number: '9', title: 'Évaluation des performances', icon: 'fa-chart-line', subChapters: ['9.1 Surveillance et mesure', '9.2 Audit interne', '9.3 Revue de direction'] },
    { number: '10', title: 'Amélioration', icon: 'fa-arrow-up', subChapters: ['10.1 Généralités', '10.2 Non-conformité et actions correctives', '10.3 Amélioration continue'] }
  ];

  sectors = [
    { value: '', label: 'Tous secteurs' },
    { value: 'industrie', label: 'Industrie manufacturière' },
    { value: 'automobile', label: 'Automobile (IATF 16949)' },
    { value: 'aeronautique', label: 'Aéronautique (EN 9100)' },
    { value: 'medical', label: 'Dispositifs médicaux (ISO 13485)' },
    { value: 'it', label: 'Services IT / Logiciel' },
    { value: 'services', label: 'Services' },
    { value: 'sante', label: 'Santé (HAS)' },
    { value: 'agroalimentaire', label: 'Agroalimentaire' },
    { value: 'construction', label: 'Construction / BTP' },
    { value: 'energie', label: 'Énergie' }
  ];

  companySizes = [
    { value: '', label: 'Toutes tailles' },
    { value: 'tpe', label: 'TPE (< 10 employés)' },
    { value: 'pme', label: 'PME (10-250 employés)' },
    { value: 'eti', label: 'ETI (250-5000 employés)' },
    { value: 'ge', label: 'Grande Entreprise (> 5000)' }
  ];

  // ===== Assistant Chat =====
  conversationMode: string = 'auditeur';
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  isTyping: boolean = false;
  uploadedDocuments: UploadedFile[] = [];
  sessionId: string = '';
  private shouldScrollToBottom = false;

  conversationModes = [
    { value: 'auditeur', label: 'Auditeur', icon: 'fa-user-check', description: 'Vocabulaire technique, focus méthodologie et détection NC' },
    { value: 'audite', label: 'Audité / Resp. Qualité', icon: 'fa-user-tie', description: 'Vocabulaire pédagogique, focus conformité et mise en oeuvre' },
    { value: 'consultant', label: 'Consultant / Expert', icon: 'fa-user-graduate', description: 'Vocabulaire avancé, références normatives, cas limites' }
  ];

  // ===== Générateur de Documents =====
  documentType: string = '';
  exportFormat: string = 'word';
  isGenerating: boolean = false;
  generationProgress: number = 0;
  generatedContent: string = '';
  generatedFileId: string = '';
  generationError: string = '';

  // Plan d'audit
  planCompanyName: string = '';
  planSector: string = '';
  planEmployeeCount: number | null = null;
  planCertificationScope: string = '';
  planAuditType: string = '';
  planAuditDuration: number | null = null;
  planExcludedClauses: string = '';
  planSpecificFocus: string = '';

  // Fiche NC
  ncIsoChapter: string = '';
  ncRawNotes: string = '';

  // Checklist
  checklistChapters: string[] = [];
  checklistSector: string = '';
  checklistCompanySize: string = '';

  // Rapport d'audit
  reportCompanyName: string = '';
  reportAuditId: string = '';
  reportAuditDates: string = '';
  reportAuditType: string = '';
  reportFindings: string = '';
  reportPositivePoints: string = '';
  reportRecommendation: string = '';

  // Feuille de route
  roadmapFindings: string = '';

  // Synthèse exécutive
  summaryCompany: string = '';
  summaryFindings: string = '';

  documentTypes = [
    { value: 'audit_plan', label: 'Plan d\'audit', icon: 'fa-calendar-alt', description: 'Programme détaillé jour par jour' },
    { value: 'audit_report', label: 'Rapport d\'audit complet', icon: 'fa-file-contract', description: 'Rapport officiel avec constats, NC, recommandations' },
    { value: 'nc_sheet', label: 'Fiche de non-conformité', icon: 'fa-exclamation-triangle', description: 'Fiche NC professionnelle depuis notes brutes' },
    { value: 'checklist', label: 'Checklist d\'audit', icon: 'fa-tasks', description: 'Points de contrôle par chapitre' },
    { value: 'roadmap', label: 'Feuille de route', icon: 'fa-route', description: 'Plan d\'action priorisé pour l\'audité' },
    { value: 'executive_summary', label: 'Synthèse exécutive', icon: 'fa-file-lines', description: 'Résumé 2-3 pages pour la direction' }
  ];

  auditTypes = [
    { value: 'certification_initial', label: 'Certification initiale' },
    { value: 'surveillance', label: 'Audit de surveillance' },
    { value: 'renouvellement', label: 'Audit de renouvellement' }
  ];

  ncChapters = [
    { value: '4.1', label: '4.1 - Contexte de l\'organisation' },
    { value: '4.2', label: '4.2 - Parties intéressées' },
    { value: '4.3', label: '4.3 - Domaine d\'application' },
    { value: '4.4', label: '4.4 - SMQ et processus' },
    { value: '5.1', label: '5.1 - Leadership et engagement' },
    { value: '5.2', label: '5.2 - Politique qualité' },
    { value: '5.3', label: '5.3 - Rôles et responsabilités' },
    { value: '6.1', label: '6.1 - Risques et opportunités' },
    { value: '6.2', label: '6.2 - Objectifs qualité' },
    { value: '6.3', label: '6.3 - Planification des modifications' },
    { value: '7.1', label: '7.1 - Ressources' },
    { value: '7.2', label: '7.2 - Compétences' },
    { value: '7.3', label: '7.3 - Sensibilisation' },
    { value: '7.4', label: '7.4 - Communication' },
    { value: '7.5', label: '7.5 - Informations documentées' },
    { value: '8.1', label: '8.1 - Planification opérationnelle' },
    { value: '8.2', label: '8.2 - Exigences produits/services' },
    { value: '8.3', label: '8.3 - Conception et développement' },
    { value: '8.4', label: '8.4 - Prestataires externes' },
    { value: '8.5', label: '8.5 - Production et prestation' },
    { value: '8.6', label: '8.6 - Libération produits' },
    { value: '8.7', label: '8.7 - Éléments non conformes' },
    { value: '9.1', label: '9.1 - Surveillance et mesure' },
    { value: '9.2', label: '9.2 - Audit interne' },
    { value: '9.3', label: '9.3 - Revue de direction' },
    { value: '10.1', label: '10.1 - Généralités' },
    { value: '10.2', label: '10.2 - Non-conformité et actions correctives' },
    { value: '10.3', label: '10.3 - Amélioration continue' }
  ];

  // Stats
  totalMessages: number = 0;
  totalDocuments: number = 0;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.sessionId = 'iso9001-' + Date.now();
    this.addWelcomeMessage();
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // ===== Configuration =====

  loadConfig(): void {
    const saved = localStorage.getItem('iso9001-audit-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.provider = config.provider || 'anthropic';
      this.mistralApiKey = config.mistralApiKey || '';
      this.mistralModel = config.mistralModel || 'mistral-large-latest';
      this.openaiApiKey = config.openaiApiKey || '';
      this.openaiModel = config.openaiModel || 'gpt-4';
      this.anthropicApiKey = config.anthropicApiKey || '';
      this.anthropicModel = config.anthropicModel || 'claude-sonnet-4-20250514';
      this.temperature = config.temperature ?? 0.4;
      this.maxTokens = config.maxTokens ?? 8192;
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
        agentId: 'iso9001-audit',
        agentName: 'Audit ISO 9001'
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

  get providerName(): string {
    switch (this.provider) {
      case 'anthropic': return 'Claude';
      case 'mistral': return 'Mistral';
      case 'openai': return 'OpenAI';
      default: return this.provider;
    }
  }

  // ===== FRAMEWORK ISO 9001 =====

  selectChapter(chapter: ISOChapter): void {
    this.selectedChapter = chapter.number;
    this.loadFrameworkChapter();
  }

  async loadFrameworkChapter(): Promise<void> {
    if (!this.selectedChapter) return;

    this.isLoadingFramework = true;
    this.frameworkContent = '';

    const chapter = this.isoChapters.find(c => c.number === this.selectedChapter);
    if (!chapter) return;

    try {
      const systemPrompt = this.getSystemPrompt();
      let userPrompt = `Présente de manière exhaustive et structurée le chapitre ${this.selectedChapter} - "${chapter.title}" de la norme ISO 9001:2015.\n\n`;

      if (this.sectorFilter) {
        userPrompt += `Adapte les particularités sectorielles au secteur : ${this.sectors.find(s => s.value === this.sectorFilter)?.label || this.sectorFilter}\n`;
      }
      if (this.companySizeFilter) {
        userPrompt += `Adapte les exemples à une entreprise de taille : ${this.companySizes.find(s => s.value === this.companySizeFilter)?.label || this.companySizeFilter}\n`;
      }

      userPrompt += `\nStructure ta réponse avec pour chaque sous-chapitre :\n`;
      userPrompt += `### X.X - Titre\n`;
      userPrompt += `**Exigences normatives** : texte de la norme et interprétation\n`;
      userPrompt += `**Points de contrôle** : ✅ liste détaillée\n`;
      userPrompt += `**Preuves attendues** : 📄 liste\n`;
      userPrompt += `**Documents associés** : liste\n`;
      userPrompt += `**NC fréquentes** : tableau avec Type | Description | Fréquence | Gravité\n`;
      userPrompt += `**Questions d'audit suggérées** : par rôle (Direction, Opérationnels, Documentaire)\n`;

      const response = await this.callLLM(systemPrompt, userPrompt);
      this.frameworkContent = response;
    } catch (error: any) {
      this.frameworkContent = `**Erreur** : Impossible de charger le chapitre. ${error.message || 'Vérifiez votre configuration LLM.'}`;
    } finally {
      this.isLoadingFramework = false;
    }
  }

  async searchFramework(): Promise<void> {
    if (!this.frameworkSearchQuery.trim()) return;

    this.isLoadingFramework = true;
    this.frameworkContent = '';

    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = `Recherche dans le référentiel ISO 9001:2015 : "${this.frameworkSearchQuery}"\n\n` +
        `Liste tous les chapitres, exigences, points de contrôle et preuves attendues en rapport avec cette recherche.\n` +
        `Mets en évidence les termes pertinents et indique la référence normative précise (§X.X.X) pour chaque résultat.`;

      const response = await this.callLLM(systemPrompt, userPrompt);
      this.frameworkContent = response;
    } catch (error: any) {
      this.frameworkContent = `**Erreur** : ${error.message || 'Impossible de rechercher.'}`;
    } finally {
      this.isLoadingFramework = false;
    }
  }

  // ===== ASSISTANT CHAT =====

  addWelcomeMessage(): void {
    this.messages.push({
      role: 'assistant',
      content: `## Bienvenue dans l'Assistant ISO 9001 ! 👋

Je suis votre expert en audit de certification **ISO 9001:2015**. Je peux vous aider sur :

- 📋 **La norme** : exigences, interprétations, documents obligatoires
- 🔍 **L'audit** : méthodologie, questions, classification des NC
- 📊 **Les bonnes pratiques** : par secteur d'activité et taille d'entreprise
- 📝 **La documentation** : ce qu'il faut, comment le structurer

**Mode actuel** : Auditeur (changez via le sélecteur ci-dessus)

### Exemples de questions :
- *"Quels documents dois-je vérifier pour le chapitre 7.2 ?"*
- *"Quelle est la différence entre NC majeure et mineure ?"*
- *"Comment adapter l'ISO 9001 à une startup IT ?"*
- *"Prépare-moi les questions d'audit pour le chapitre 9"*

> ⚠️ Les réponses sont fournies à titre informatif. L'interprétation finale relève de l'auditeur certifié.`,
      timestamp: new Date()
    });
  }

  async sendMessage(): Promise<void> {
    if (!this.currentMessage.trim() && this.uploadedDocuments.length === 0) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: this.currentMessage,
      timestamp: new Date(),
      documents: this.uploadedDocuments.map(f => ({ name: f.file.name, type: f.file.type, content: '' }))
    };
    this.messages.push(userMsg);
    this.totalMessages++;

    const messageText = this.currentMessage;
    this.currentMessage = '';
    this.isTyping = true;
    this.shouldScrollToBottom = true;

    try {
      // Build prompt with context
      const systemPrompt = this.getSystemPrompt();
      const modeLabel = this.conversationModes.find(m => m.value === this.conversationMode)?.label || 'Auditeur';
      let userPrompt = `Mode: ${modeLabel}\n\n`;

      // Add document context if any
      if (this.uploadedDocuments.length > 0) {
        userPrompt += `[Documents uploadés : ${this.uploadedDocuments.map(f => f.file.name).join(', ')}]\n\n`;
      }

      userPrompt += messageText;

      // Call LLM via agent runtime chat endpoint
      const response = await this.callChat(systemPrompt, userPrompt);

      this.messages.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });
      this.totalMessages++;
    } catch (error: any) {
      this.messages.push({
        role: 'assistant',
        content: `**Erreur** : ${error.message || 'Impossible de générer une réponse. Vérifiez votre configuration LLM.'}`,
        timestamp: new Date(),
        isError: true
      });
    } finally {
      this.isTyping = false;
      this.shouldScrollToBottom = true;
    }
  }

  onChatKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  onDocumentsSelected(files: UploadedFile[]): void {
    this.uploadedDocuments = files;
  }

  onDocumentsRemoved(files: UploadedFile[]): void {
    this.uploadedDocuments = files;
  }

  clearChat(): void {
    this.messages = [];
    this.sessionId = 'iso9001-' + Date.now();
    this.addWelcomeMessage();
  }

  get canSendMessage(): boolean {
    return (this.currentMessage.trim().length > 0 || this.uploadedDocuments.length > 0) && !this.isTyping;
  }

  get currentModeIcon(): string {
    const mode = this.conversationModes.find(m => m.value === this.conversationMode);
    return mode?.icon || 'fa-user';
  }

  get currentModeLabel(): string {
    const mode = this.conversationModes.find(m => m.value === this.conversationMode);
    return mode?.label || 'Auditeur';
  }

  // ===== DOCUMENT GENERATOR =====

  async generateDocument(): Promise<void> {
    if (!this.documentType) {
      this.generationError = 'Veuillez sélectionner un type de document.';
      return;
    }

    if (!this.validateDocumentForm()) return;

    this.isGenerating = true;
    this.generationProgress = 0;
    this.generatedContent = '';
    this.generatedFileId = '';
    this.generationError = '';

    const progressInterval = setInterval(() => {
      if (this.generationProgress < 85) {
        this.generationProgress += Math.random() * 8 + 2;
      }
    }, 800);

    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildDocumentPrompt();

      const response = await this.callLLM(systemPrompt, userPrompt);
      this.generationProgress = 90;

      this.generatedContent = response;

      // Generate file if Word or Excel format
      if (this.exportFormat === 'word' || this.exportFormat === 'excel') {
        await this.generateExportFile(response);
      }

      this.generationProgress = 100;
      this.totalDocuments++;
    } catch (error: any) {
      this.generationError = error.message || 'Erreur lors de la génération du document.';
    } finally {
      clearInterval(progressInterval);
      this.isGenerating = false;
      if (this.generationError) {
        this.generationProgress = 0;
      }
    }
  }

  validateDocumentForm(): boolean {
    switch (this.documentType) {
      case 'audit_plan':
        if (!this.planCompanyName || !this.planSector || !this.planEmployeeCount || !this.planCertificationScope || !this.planAuditType || !this.planAuditDuration) {
          this.generationError = 'Veuillez remplir tous les champs obligatoires du plan d\'audit.';
          return false;
        }
        break;
      case 'nc_sheet':
        if (!this.ncIsoChapter || !this.ncRawNotes) {
          this.generationError = 'Veuillez sélectionner un chapitre ISO et saisir vos notes.';
          return false;
        }
        break;
      case 'checklist':
        if (this.checklistChapters.length === 0) {
          this.generationError = 'Veuillez sélectionner au moins un chapitre.';
          return false;
        }
        break;
      case 'audit_report':
        if (!this.reportCompanyName || !this.reportAuditId || !this.reportFindings) {
          this.generationError = 'Veuillez remplir les champs obligatoires du rapport.';
          return false;
        }
        break;
      case 'roadmap':
        if (!this.roadmapFindings) {
          this.generationError = 'Veuillez saisir les non-conformités.';
          return false;
        }
        break;
      case 'executive_summary':
        if (!this.summaryCompany || !this.summaryFindings) {
          this.generationError = 'Veuillez remplir les champs obligatoires.';
          return false;
        }
        break;
    }
    return true;
  }

  buildDocumentPrompt(): string {
    switch (this.documentType) {
      case 'audit_plan':
        return `Génère un plan d'audit ISO 9001:2015 professionnel et très détaillé.

Informations de l'audit :
- Entreprise : ${this.planCompanyName}
- Secteur : ${this.sectors.find(s => s.value === this.planSector)?.label || this.planSector}
- Effectif : ${this.planEmployeeCount} personnes
- Périmètre de certification : ${this.planCertificationScope}
- Type d'audit : ${this.auditTypes.find(t => t.value === this.planAuditType)?.label || this.planAuditType}
- Durée : ${this.planAuditDuration} jours
${this.planExcludedClauses ? `- Exclusions : ${this.planExcludedClauses}` : ''}
${this.planSpecificFocus ? `- Focus particulier : ${this.planSpecificFocus}` : ''}

Structure le plan avec :
1. INFORMATIONS GÉNÉRALES (organisme, dates, équipe, périmètre)
2. PROGRAMME DÉTAILLÉ par jour et demi-journée avec :
   - Horaires précis
   - Chapitres ISO à couvrir
   - Personnes à rencontrer (fonctions)
   - Documents à consulter
   - Points de vigilance spécifiques
3. DOCUMENTS À FOURNIR AVANT L'AUDIT (checklist)
4. LOGISTIQUE (salle, accès, EPI si nécessaire)`;

      case 'nc_sheet':
        return `Génère une fiche de non-conformité ISO 9001:2015 professionnelle.

Notes brutes de l'auditeur :
${this.ncRawNotes}

Chapitre ISO concerné : ${this.ncChapters.find(c => c.value === this.ncIsoChapter)?.label || this.ncIsoChapter}

Structure la fiche :
- **Numéro de NC** : NC-XXX
- **Classification** : Majeure ou Mineure (avec justification)
- **Chapitre ISO** : référence précise §X.X
- **Description de l'écart** : reformulation factuelle et professionnelle
- **Preuves constatées** : ce qui a été vu, dit, consulté
- **Exigence de la norme** : citation exacte de l'exigence ISO
- **Impact potentiel** : conséquences de l'écart
- **Recommandation d'action corrective** : étapes détaillées et numérotées
- **Délai de traitement** : nombre de jours suggéré`;

      case 'checklist':
        const chapterLabels = this.checklistChapters.map(c =>
          this.isoChapters.find(ch => ch.number === c)?.title || `Chapitre ${c}`
        ).join(', ');
        return `Génère une checklist d'audit ISO 9001:2015 complète et détaillée.

Chapitres à couvrir : ${chapterLabels}
${this.checklistSector ? `Secteur : ${this.sectors.find(s => s.value === this.checklistSector)?.label || this.checklistSector}` : ''}
${this.checklistCompanySize ? `Taille entreprise : ${this.companySizes.find(s => s.value === this.checklistCompanySize)?.label || this.checklistCompanySize}` : ''}

Pour chaque chapitre et sous-chapitre, liste :
☐ Points de contrôle détaillés (avec référence §X.X.X)
☐ Preuves / documents à vérifier
☐ Questions clés à poser (par rôle si pertinent)
☐ NC fréquentes à surveiller`;

      case 'audit_report':
        return `Génère un rapport d'audit ISO 9001:2015 complet et professionnel.

Informations :
- Entreprise : ${this.reportCompanyName}
- Identifiant audit : ${this.reportAuditId}
- Dates : ${this.reportAuditDates}
- Type : ${this.auditTypes.find(t => t.value === this.reportAuditType)?.label || this.reportAuditType}
- Recommandation : ${this.reportRecommendation}

Constats :
${this.reportFindings}

${this.reportPositivePoints ? `Points forts :\n${this.reportPositivePoints}` : ''}

Structure le rapport :
1. PAGE DE GARDE
2. SOMMAIRE
3. INTRODUCTION ET CONTEXTE
4. MÉTHODOLOGIE D'AUDIT
5. SYNTHÈSE DES RÉSULTATS (score de conformité global, nombre NC/observations)
6. CONSTATS DÉTAILLÉS PAR CHAPITRE ISO
7. FICHES DE NON-CONFORMITÉ (une par NC)
8. OBSERVATIONS ET OPPORTUNITÉS D'AMÉLIORATION
9. POINTS FORTS
10. CONCLUSION ET RECOMMANDATION
11. ANNEXES (documents consultés, personnes rencontrées)`;

      case 'roadmap':
        return `Génère une feuille de route de mise en conformité ISO 9001:2015.

Non-conformités et observations :
${this.roadmapFindings}

Structure :
1. SYNTHÈSE DES ÉCARTS (tableau récapitulatif)
2. PLAN D'ACTION PRIORISÉ (NC majeures d'abord, puis mineures, puis observations)
   Pour chaque action :
   - Description de l'action corrective
   - Responsable suggéré (fonction)
   - Échéance réaliste
   - Ressources nécessaires
   - Indicateur de réalisation
3. JALONS CLÉS ET DATES BUTOIRS
4. TABLEAU DE SUIVI avec colonnes : Action | Responsable | Échéance | Statut | Commentaires`;

      case 'executive_summary':
        return `Génère une synthèse exécutive d'audit ISO 9001:2015 (2-3 pages max, langage stratégique).

Entreprise : ${this.summaryCompany}
Résultats :
${this.summaryFindings}

Structure :
1. CONTEXTE (quoi, quand, qui - 3 lignes)
2. RÉSULTATS EN UN COUP D'OEIL (scoring, nombre NC, recommandation)
3. TOP 3 DES POINTS FORTS
4. TOP 3 DES AXES D'AMÉLIORATION PRIORITAIRES
5. PROCHAINES ÉTAPES ET ÉCHÉANCES`;

      default:
        return 'Erreur: type de document inconnu.';
    }
  }

  async generateExportFile(content: string): Promise<void> {
    try {
      if (this.exportFormat === 'word') {
        const paragraphs = content.split('\n').filter(p => p.trim());
        const title = this.getDocumentTitle();

        const formData = new FormData();
        const blob = new Blob([JSON.stringify({ title, paragraphs })], { type: 'application/json' });
        formData.append('data', blob);

        const response = await firstValueFrom(
          this.http.post<any>(`${environment.api.wordCrud}/api/v1/word/create`, {
            title,
            paragraphs
          })
        );

        if (response?.file_id) {
          this.generatedFileId = response.file_id;
        }
      }
    } catch (error) {
      console.warn('Export file generation failed, content is still available as markdown:', error);
    }
  }

  getDocumentTitle(): string {
    switch (this.documentType) {
      case 'audit_plan': return `Plan d'audit - ${this.planCompanyName}`;
      case 'audit_report': return `Rapport d'audit ${this.reportAuditId} - ${this.reportCompanyName}`;
      case 'nc_sheet': return `Fiche NC - §${this.ncIsoChapter}`;
      case 'checklist': return `Checklist d'audit ISO 9001`;
      case 'roadmap': return `Feuille de route de mise en conformité`;
      case 'executive_summary': return `Synthèse exécutive - ${this.summaryCompany}`;
      default: return `Document ISO 9001`;
    }
  }

  async downloadGeneratedFile(): Promise<void> {
    if (!this.generatedFileId) {
      // Fallback: download markdown content as file
      this.downloadAsMarkdown();
      return;
    }

    try {
      const downloadUrl = `${environment.api.wordCrud}/api/v1/word/download/${this.generatedFileId}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.getDocumentTitle()}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      this.downloadAsMarkdown();
    }
  }

  downloadAsMarkdown(): void {
    const blob = new Blob([this.generatedContent], { type: 'text/markdown' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.getDocumentTitle()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  resetGenerator(): void {
    this.documentType = '';
    this.generatedContent = '';
    this.generatedFileId = '';
    this.generationProgress = 0;
    this.generationError = '';
    this.planCompanyName = '';
    this.planSector = '';
    this.planEmployeeCount = null;
    this.planCertificationScope = '';
    this.planAuditType = '';
    this.planAuditDuration = null;
    this.planExcludedClauses = '';
    this.planSpecificFocus = '';
    this.ncIsoChapter = '';
    this.ncRawNotes = '';
    this.checklistChapters = [];
    this.checklistSector = '';
    this.checklistCompanySize = '';
    this.reportCompanyName = '';
    this.reportAuditId = '';
    this.reportAuditDates = '';
    this.reportAuditType = '';
    this.reportFindings = '';
    this.reportPositivePoints = '';
    this.reportRecommendation = '';
    this.roadmapFindings = '';
    this.summaryCompany = '';
    this.summaryFindings = '';
  }

  get canGenerate(): boolean {
    return this.documentType !== '' && !this.isGenerating;
  }

  // ===== LLM Calls =====

  private getSystemPrompt(): string {
    return `Tu es un expert ISO 9001:2015, spécialisé dans l'audit de certification.
Ton rôle est d'assister les auditeurs et responsables qualité en fournissant des réponses précises, sourcées, et actionnables.

Principes :
- Toujours citer la norme ISO 9001:2015 avec références précises (§X.X.X)
- Fournir des exemples concrets adaptés au secteur si mentionné
- Rester factuel et objectif, ne jamais inventer d'informations
- Si incertain, le dire clairement
- Adapter le vocabulaire au profil utilisateur

Structure tes réponses en markdown bien formaté.

Classification des Non-Conformités :
- NC Majeure : Absence totale/systématique, risque élevé, impact fort
- NC Mineure : Application partielle, écart ponctuel, risque limité
- Observation : Piste d'amélioration, risque potentiel futur

Durées d'audit IAF MD 5 (jours par effectif) :
1-5: 1.5j | 6-10: 2j | 11-25: 3j | 26-45: 4j | 46-65: 5j | 66-85: 6j | 86-125: 7j | 126-175: 8j | 176-275: 9j | 276-425: 10j`;
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    const runtimeUrl = environment.agentRuntimeUrl || 'http://localhost:8025';

    const body: any = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      provider: this.provider
    };

    // Add provider-specific config
    if (this.provider === 'mistral') {
      body.model = this.mistralModel;
      if (this.mistralApiKey) body.api_key = this.mistralApiKey;
    } else if (this.provider === 'openai') {
      body.model = this.openaiModel;
      if (this.openaiApiKey) body.api_key = this.openaiApiKey;
    } else if (this.provider === 'anthropic') {
      body.model = this.anthropicModel;
      if (this.anthropicApiKey) body.api_key = this.anthropicApiKey;
    }

    const response = await firstValueFrom(
      this.http.post<ChatResponse>(`${runtimeUrl}/api/v1/chat/completions`, body)
    );

    if (response.success && response.message?.content) {
      return response.message.content;
    } else if (response.error) {
      throw new Error(response.error);
    }
    throw new Error('Réponse vide du LLM');
  }

  private async callChat(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.callLLM(systemPrompt, userPrompt);
  }

  // ===== Utility =====

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  toggleChecklistChapter(chapter: string): void {
    const idx = this.checklistChapters.indexOf(chapter);
    if (idx >= 0) {
      this.checklistChapters.splice(idx, 1);
    } else {
      this.checklistChapters.push(chapter);
    }
  }

  isChapterSelected(chapter: string): boolean {
    return this.checklistChapters.includes(chapter);
  }
}
