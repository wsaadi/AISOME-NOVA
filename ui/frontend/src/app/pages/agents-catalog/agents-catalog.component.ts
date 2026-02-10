import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { AgentBuilderService } from '../agent-builder/services/agent-builder.service';
import { AgentDefinition, AgentType } from '../agent-builder/models/agent.models';
import { AgentRuntimeService, AgentSummary } from '../../core/services/agent-runtime.service';
import { RoleService } from '../../core/services/role.service';

export interface Agent {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  categoryKey: string;
  status: 'active' | 'beta' | 'coming-soon';
  route?: string;
  hasConfig?: boolean;
  agentType?: AgentType;
  // Source agent definition from the unified backend
  sourceAgent?: AgentDefinition;
  // Pour les agents du runtime (définis en YAML)
  isRuntime?: boolean;
  runtimeAgent?: AgentSummary;
}

/**
 * Page catalogue des agents IA disponibles
 */
@Component({
  selector: 'app-agents-catalog',
  standalone: true,
  imports: [CommonModule, CustomButtonComponent, MatDialogModule, TranslateModule],
  templateUrl: './agents-catalog.component.html',
  styleUrls: ['./agents-catalog.component.scss']
})
export class AgentsCatalogComponent implements OnInit {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';

  categoryKeys: string[] = [];

  isAdmin = false;

  // Map agent IDs to their i18n translation keys for name and description
  private agentTranslationMap: Record<string, { nameKey: string; descriptionKey: string }> = {
    'document-analyzer': { nameKey: 'agents.document_analyzer.name', descriptionKey: 'agents.document_analyzer.description' },
    'appointment-scheduler': { nameKey: 'agents.appointment_scheduler.name', descriptionKey: 'agents.appointment_scheduler.description' },
    'dolibarr-stats': { nameKey: 'agents.dolibarr_stats.name', descriptionKey: 'agents.dolibarr_stats.description' },
    'web-monitoring': { nameKey: 'agents.web_monitoring.name', descriptionKey: 'agents.web_monitoring.description' },
    'ai-chat': { nameKey: 'agents.ai_chat.name', descriptionKey: 'agents.ai_chat.description' },
    'data-extractor': { nameKey: 'agents.data_extractor.name', descriptionKey: 'agents.data_extractor.description' },
    'report-generator': { nameKey: 'agents.report_generator.name', descriptionKey: 'agents.report_generator.description' },
    'contract-analyzer': { nameKey: 'agents.contract_analyzer.name', descriptionKey: 'agents.contract_analyzer.description' },
    'legal-contract-agent': { nameKey: 'agents.legal_contract.name', descriptionKey: 'agents.legal_contract.description' },
    'pod-analyzer': { nameKey: 'agents.pod_analyzer.name', descriptionKey: 'agents.pod_analyzer.description' },
    'iso9001-audit': { nameKey: 'agents.iso9001.name', descriptionKey: 'agents.iso9001.description' },
    'nvidia-multimodal': { nameKey: 'nvidia_multimodal.title', descriptionKey: 'nvidia_multimodal.subtitle' },
    'nvidia-vista3d': { nameKey: 'nvidia_vista3d.title', descriptionKey: 'nvidia_vista3d.subtitle' },
    'nvidia-fourcastnet': { nameKey: 'nvidia_fourcastnet.title', descriptionKey: 'nvidia_fourcastnet.subtitle' },
    'nvidia-openfold3': { nameKey: 'nvidia_openfold3.title', descriptionKey: 'nvidia_openfold3.subtitle' },
    'nvidia-grounding-dino': { nameKey: 'nvidia_grounding_dino.title', descriptionKey: 'nvidia_grounding_dino.subtitle' },
    'webgpu-local-agent': { nameKey: 'agents.webgpu_local.name', descriptionKey: 'agents.webgpu_local.description' },
  };

  // Map category slugs to translation keys
  private categoryTranslationMap: Record<string, string> = {
    'document_analysis': 'catalog.categories.document_analysis',
    'sales': 'catalog.categories.sales',
    'sales_analysis': 'catalog.categories.sales_analysis',
    'intelligence': 'catalog.categories.intelligence',
    'ai_assistant': 'catalog.categories.ai_assistant',
    'extraction': 'catalog.categories.extraction',
    'generation': 'catalog.categories.generation',
    'legal_analysis': 'catalog.categories.legal_analysis',
    'logistics': 'catalog.categories.logistics',
    'audit_quality': 'catalog.categories.audit_quality',
    'nvidia_ai': 'catalog.categories.nvidia_ai',
    'custom': 'catalog.categories.custom',
    'analytics': 'catalog.categories.sales_analysis',
    'communication': 'catalog.categories.ai_assistant',
    'data_processing': 'catalog.categories.extraction',
    'document_processing': 'catalog.categories.document_analysis',
    'legal': 'catalog.categories.legal_analysis',
  };

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private translate: TranslateService,
    private agentBuilderService: AgentBuilderService,
    private agentRuntimeService: AgentRuntimeService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    // Vérifier si l'utilisateur est admin (par rôle)
    this.isAdmin = this.roleService.hasRole('admin');

    // Charger tous les agents depuis le backend unifié
    this.loadAllAgents();
  }

  /**
   * Charge tous les agents actifs depuis le backend unifié (static + dynamic + runtime).
   * Tous les agents sont désormais stockés dans le même système.
   */
  loadAllAgents(): void {
    this.agentBuilderService.listAgents({ status: 'active', pageSize: 200 }).subscribe({
      next: (response) => {
        this.agents = response.agents.map(agent => this.mapToDisplayAgent(agent));

        // Ajouter les agents du runtime si disponible
        this.loadRuntimeAgents();

        // Mettre à jour les catégories
        this.refreshCategories();
        this.filterAgents();
      },
      error: (error) => {
        console.error('Failed to load agents from unified storage:', error);
        // Fallback: essayer de charger les agents du runtime
        this.loadRuntimeAgents();
      }
    });
  }

  /**
   * Mappe un AgentDefinition du backend vers le format d'affichage Agent
   */
  private mapToDisplayAgent(agent: AgentDefinition): Agent {
    const agentType = agent.agent_type || 'dynamic';

    // Déterminer la route selon le type d'agent
    let route = agent.route;
    if (!route) {
      route = `/agent/${agent.id}`;
    }

    // Use i18n translation keys for known agents, fallback to raw backend values
    const translationKeys = this.agentTranslationMap[agent.id];
    const nameKey = translationKeys ? translationKeys.nameKey : agent.name;
    const descriptionKey = translationKeys ? translationKeys.descriptionKey : agent.description;

    return {
      id: agent.id,
      nameKey: nameKey,
      descriptionKey: descriptionKey,
      icon: agent.icon || 'fa fa-robot',
      categoryKey: this.mapCategoryToKey(agent.category),
      status: agent.status === 'beta' ? 'beta' : 'active',
      route: route || undefined,
      hasConfig: agentType !== 'runtime',
      agentType: agentType as AgentType,
      sourceAgent: agent,
    };
  }

  /**
   * Charge les agents du runtime (définis en YAML) en complément
   */
  loadRuntimeAgents(): void {
    this.agentRuntimeService.getAgents().subscribe({
      next: (runtimeAgents) => {
        if (!Array.isArray(runtimeAgents)) {
          return;
        }

        // Ne garder que les agents runtime qui ne sont pas déjà dans le backend unifié
        const existingIds = new Set(this.agents.map(a => a.id));
        const existingRoutes = new Set(this.agents.map(a => a.route).filter(Boolean));

        const mappedAgents: Agent[] = runtimeAgents
          .filter(agent => agent.status === 'active')
          .filter(agent => !existingIds.has(agent.id))
          .filter(agent => !existingRoutes.has(`/agent-runtime/${agent.slug}`))
          .map(agent => ({
            id: agent.id,
            nameKey: agent.name,
            descriptionKey: agent.description,
            icon: agent.icon || 'fa fa-robot',
            categoryKey: this.mapCategoryToKey(agent.category),
            status: 'active' as const,
            route: `/agent-runtime/${agent.slug}`,
            hasConfig: true,
            agentType: 'runtime' as AgentType,
            isRuntime: true,
            runtimeAgent: agent
          }));

        if (mappedAgents.length > 0) {
          this.agents = [...this.agents, ...mappedAgents];
          this.refreshCategories();
          this.filterAgents();
        }
      },
      error: (error) => {
        console.warn('Runtime service not available:', error.message);
      }
    });
  }

  /**
   * Mappe une catégorie vers une clé de traduction
   */
  private mapCategoryToKey(category: string): string {
    return this.categoryTranslationMap[category] || `catalog.categories.${category}`;
  }

  /**
   * Rafraîchit la liste des catégories depuis les agents chargés
   */
  private refreshCategories(): void {
    const cats = new Set(this.agents.map(a => a.categoryKey));
    this.categoryKeys = ['catalog.categories.all', ...cats];
  }

  openModerationSettings(agent: Agent, event: Event): void {
    // Empêcher l'ouverture de l'agent lors du clic sur le bouton de modération
    event.stopPropagation();
    // Naviguer vers la page de paramètres de modération
    this.router.navigate(['/moderation-settings']);
  }

  openConfigDialog(agent: Agent, event: Event): void {
    // Empêcher l'ouverture de l'agent lors du clic sur le bouton de config
    event.stopPropagation();

    // Charger la configuration depuis localStorage
    const storageKey = `${agent.id}-config`;
    const savedConfig = localStorage.getItem(storageKey);

    let config: AgentConfig = {
      provider: 'mistral',
      mistralApiKey: '',
      mistralModel: 'mistral-small-latest',
      openaiApiKey: '',
      openaiModel: 'gpt-4o',
      anthropicApiKey: '',
      anthropicModel: 'claude-3-5-sonnet-20241022',
      geminiApiKey: '',
      geminiModel: 'gemini-2.0-flash-exp',
      perplexityApiKey: '',
      perplexityModel: 'sonar',
      nvidiaNimApiKey: '',
      nvidiaNimModel: 'meta/llama-3.1-8b-instruct',
      temperature: 0.7,
      maxTokens: 4096
    };

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        config = { ...config, ...parsed };
      } catch (e) {
        console.error('Error parsing saved config:', e);
      }
    }

    const agentName = this.resolveText(agent.nameKey);

    const dialogRef = this.dialog.open(AgentConfigDialogComponent, {
      width: '600px',
      data: {
        config: config,
        agentId: agent.id,
        agentName: agentName
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // La sauvegarde est déjà effectuée dans le dialog component
        console.log('Configuration updated for', agentName);
      }
    });
  }

  filterAgents(): void {
    this.filteredAgents = this.agents.filter(agent => {
      // Résolution du nom: essayer la traduction, sinon utiliser la valeur directe
      const agentCategory = this.resolveText(agent.categoryKey);
      const selectedCat = this.selectedCategory === 'all' ? 'all' :
        this.resolveText(this.selectedCategory);

      const matchesCategory = this.selectedCategory === 'all' || agentCategory === selectedCat;

      const agentName = this.resolveText(agent.nameKey).toLowerCase();
      const agentDesc = this.resolveText(agent.descriptionKey).toLowerCase();
      const matchesSearch = agentName.includes(this.searchTerm.toLowerCase()) ||
                           agentDesc.includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  /**
   * Résout un texte: si c'est une clé de traduction, la traduit; sinon retourne la valeur directe.
   */
  resolveText(key: string): string {
    const translated = this.translate.instant(key);
    // Si la traduction retourne la clé elle-même, c'est une valeur directe
    return translated !== key ? translated : key;
  }

  onCategoryChange(categoryKey: string): void {
    this.selectedCategory = categoryKey === 'catalog.categories.all' ? 'all' : categoryKey;
    this.filterAgents();
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.filterAgents();
  }

  openAgent(agent: Agent): void {
    if (agent.status === 'active' && agent.route) {
      this.router.navigate([agent.route]);
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return this.translate.instant('catalog.status.active');
      case 'beta': return this.translate.instant('catalog.status.beta');
      case 'coming-soon': return this.translate.instant('catalog.status.coming_soon');
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status--active';
      case 'beta': return 'status--beta';
      case 'coming-soon': return 'status--coming-soon';
      default: return '';
    }
  }

  openCatalogManagement(): void {
    this.router.navigate(['/catalog-management']);
  }
}
