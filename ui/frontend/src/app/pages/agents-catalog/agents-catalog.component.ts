import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { AgentConfigDialogComponent, AgentConfig } from '../../shared/components/agent-config-dialog/agent-config-dialog.component';
import { AgentBuilderService } from '../agent-builder/services/agent-builder.service';
import { AgentDefinition } from '../agent-builder/models/agent.models';
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
  // Pour les agents dynamiques (créés via l'agent builder)
  isDynamic?: boolean;
  dynamicAgent?: AgentDefinition;
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
  agents: Agent[] = [
    {
      id: 'document-analyzer',
      nameKey: 'agents.document_analyzer.name',
      descriptionKey: 'agents.document_analyzer.description',
      icon: 'fa fa-file-contract',
      categoryKey: 'catalog.categories.document_analysis',
      status: 'active',
      route: '/document-analyzer',
      hasConfig: true
    },
    {
      id: 'appointment-scheduler',
      nameKey: 'agents.appointment_scheduler.name',
      descriptionKey: 'agents.appointment_scheduler.description',
      icon: 'fa fa-calendar-check',
      categoryKey: 'catalog.categories.sales',
      status: 'active',
      route: '/appointment-scheduler',
      hasConfig: true
    },
    {
      id: 'dolibarr-stats',
      nameKey: 'agents.dolibarr_stats.name',
      descriptionKey: 'agents.dolibarr_stats.description',
      icon: 'fa fa-chart-pie',
      categoryKey: 'catalog.categories.sales_analysis',
      status: 'active',
      route: '/dolibarr-stats',
      hasConfig: true
    },
    {
      id: 'web-monitoring',
      nameKey: 'agents.web_monitoring.name',
      descriptionKey: 'agents.web_monitoring.description',
      icon: 'fa fa-globe',
      categoryKey: 'catalog.categories.intelligence',
      status: 'active',
      route: '/web-monitoring',
      hasConfig: true
    },
    {
      id: 'ai-chat',
      nameKey: 'agents.ai_chat.name',
      descriptionKey: 'agents.ai_chat.description',
      icon: 'fa fa-comments',
      categoryKey: 'catalog.categories.ai_assistant',
      status: 'active',
      route: '/ai-chat',
      hasConfig: true
    },
    {
      id: 'data-extractor',
      nameKey: 'agents.data_extractor.name',
      descriptionKey: 'agents.data_extractor.description',
      icon: 'fa fa-database',
      categoryKey: 'catalog.categories.extraction',
      status: 'active',
      hasConfig: true
    },
    {
      id: 'report-generator',
      nameKey: 'agents.report_generator.name',
      descriptionKey: 'agents.report_generator.description',
      icon: 'fa fa-file-word',
      categoryKey: 'catalog.categories.generation',
      status: 'beta',
      hasConfig: true
    },
    {
      id: 'contract-analyzer',
      nameKey: 'agents.contract_analyzer.name',
      descriptionKey: 'agents.contract_analyzer.description',
      icon: 'fa fa-gavel',
      categoryKey: 'catalog.categories.legal_analysis',
      status: 'active',
      route: '/contract-analysis',
      hasConfig: true
    },
    {
      id: 'legal-contract-agent',
      nameKey: 'legal_contract.title',
      descriptionKey: 'legal_contract.subtitle',
      icon: 'fa fa-scale-balanced',
      categoryKey: 'catalog.categories.legal_analysis',
      status: 'active',
      route: '/legal-contract-agent',
      hasConfig: true
    },
    {
      id: 'pod-analyzer',
      nameKey: 'agents.pod_analyzer.name',
      descriptionKey: 'agents.pod_analyzer.description',
      icon: 'fa fa-file-pdf',
      categoryKey: 'catalog.categories.logistics',
      status: 'active',
      route: '/pod-analyzer',
      hasConfig: true
    },
    {
      id: 'iso9001-audit',
      nameKey: 'agents.iso9001.name',
      descriptionKey: 'agents.iso9001.description',
      icon: 'fa fa-clipboard-check',
      categoryKey: 'catalog.categories.audit_quality',
      status: 'active',
      route: '/iso9001-audit',
      hasConfig: true
    },
    {
      id: 'nvidia-multimodal',
      nameKey: 'nvidia_multimodal.title',
      descriptionKey: 'nvidia_multimodal.subtitle',
      icon: 'fa fa-microchip',
      categoryKey: 'catalog.categories.nvidia_ai',
      status: 'active',
      route: '/nvidia-multimodal',
      hasConfig: false
    },
    {
      id: 'nvidia-vista3d',
      nameKey: 'nvidia_vista3d.title',
      descriptionKey: 'nvidia_vista3d.subtitle',
      icon: 'fa fa-cube',
      categoryKey: 'catalog.categories.nvidia_ai',
      status: 'active',
      route: '/nvidia-vista3d',
      hasConfig: false
    },
    {
      id: 'nvidia-fourcastnet',
      nameKey: 'nvidia_fourcastnet.title',
      descriptionKey: 'nvidia_fourcastnet.subtitle',
      icon: 'fa fa-cloud-sun',
      categoryKey: 'catalog.categories.nvidia_ai',
      status: 'active',
      route: '/nvidia-fourcastnet',
      hasConfig: false
    },
    {
      id: 'nvidia-openfold3',
      nameKey: 'nvidia_openfold3.title',
      descriptionKey: 'nvidia_openfold3.subtitle',
      icon: 'fa fa-dna',
      categoryKey: 'catalog.categories.nvidia_ai',
      status: 'active',
      route: '/nvidia-openfold3',
      hasConfig: false
    },
    {
      id: 'webgpu-local-agent',
      nameKey: 'menu.webgpu_local_agent',
      descriptionKey: 'menu.webgpu_local_agent',
      icon: 'fa fa-eye',
      categoryKey: 'catalog.categories.nvidia_ai',
      status: 'active',
      route: '/webgpu-local-agent',
      hasConfig: false
    },
    {
      id: 'nvidia-grounding-dino',
      nameKey: 'nvidia_grounding_dino.title',
      descriptionKey: 'nvidia_grounding_dino.subtitle',
      icon: 'fa fa-crosshairs',
      categoryKey: 'catalog.categories.nvidia_ai',
      status: 'active',
      route: '/nvidia-grounding-dino',
      hasConfig: false
    }
  ];

  filteredAgents: Agent[] = [];
  selectedCategory: string = 'all';
  searchTerm: string = '';

  categoryKeys: string[] = [];

  isAdmin = false;

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

    // Extraire les clés de catégories uniques des agents statiques
    this.categoryKeys = ['catalog.categories.all', ...new Set(this.agents.map(a => a.categoryKey))];
    this.filteredAgents = [...this.agents];

    // Charger les agents du runtime (définis en YAML)
    this.loadRuntimeAgents();

    // Charger les agents dynamiques actifs depuis l'agent builder
    this.loadDynamicAgents();
  }

  /**
   * Charge les agents du runtime (définis en YAML) et les ajoute au catalogue
   */
  loadRuntimeAgents(): void {
    this.agentRuntimeService.getAgents().subscribe({
      next: (runtimeAgents) => {
        // S'assurer que runtimeAgents est un tableau
        if (!Array.isArray(runtimeAgents)) {
          console.warn('Runtime agents response is not an array:', runtimeAgents);
          return;
        }

        // Mapper les agents du runtime vers le format du catalogue
        const mappedAgents: Agent[] = runtimeAgents
          .filter(agent => agent.status === 'active')
          .map(agent => ({
            id: agent.id,
            nameKey: agent.name,
            descriptionKey: agent.description,
            icon: agent.icon || 'fa fa-robot',
            categoryKey: this.mapCategoryToKey(agent.category),
            status: 'active' as const,
            route: `/agent-runtime/${agent.slug}`,
            hasConfig: true,
            isRuntime: true,
            runtimeAgent: agent
          }));

        // Filtrer les agents statiques qui existent aussi dans le runtime (éviter les doublons)
        const runtimeSlugs = runtimeAgents.map(a => a.slug);
        const staticAgentMappings: Record<string, string> = {
          'document-analyzer': 'document-analyzer',
          'dolibarr-stats': 'dolibarr-stats-agent',
          'web-monitoring': 'web-monitoring-agent',
          'contract-analyzer': 'contract-analysis-agent',
          'pod-analyzer': 'email-pod-analyzer',
          'ai-chat': 'ai-chat-agent'
        };

        // Supprimer les agents statiques qui sont maintenant gérés par le runtime
        this.agents = this.agents.filter(agent => {
          const runtimeSlug = staticAgentMappings[agent.id];
          return !runtimeSlug || !runtimeSlugs.includes(runtimeSlug);
        });

        // Filtrer les agents runtime qui dupliquent un agent statique avec route custom
        const remainingStaticIds = new Set(this.agents.map(a => a.id));
        const filteredMappedAgents = mappedAgents.filter(agent => {
          const slug = agent.runtimeAgent?.slug || '';
          return !remainingStaticIds.has(slug);
        });

        // Ajouter les agents du runtime (sans doublons)
        this.agents = [...this.agents, ...filteredMappedAgents];

        // Mettre à jour les catégories
        const runtimeCategories = filteredMappedAgents
          .map(a => a.categoryKey)
          .filter(c => !this.categoryKeys.includes(c));
        this.categoryKeys = [...this.categoryKeys, ...new Set(runtimeCategories)];

        // Rafraîchir la liste filtrée
        this.filterAgents();
      },
      error: (error) => {
        console.warn('Runtime service not available, using static agents only:', error.message);
        // Si le runtime n'est pas disponible, on garde les agents statiques
      }
    });
  }

  /**
   * Mappe une catégorie du runtime vers une clé de traduction
   */
  private mapCategoryToKey(category: string): string {
    const categoryMap: Record<string, string> = {
      'document_analysis': 'catalog.categories.document_analysis',
      'analytics': 'catalog.categories.sales_analysis',
      'intelligence': 'catalog.categories.intelligence',
      'communication': 'catalog.categories.ai_assistant',
      'data_processing': 'catalog.categories.extraction',
      'document_processing': 'catalog.categories.document_analysis',
      'legal': 'catalog.categories.legal_analysis',
      'sales': 'catalog.categories.sales',
      'logistics': 'catalog.categories.logistics'
    };
    return categoryMap[category] || `catalog.categories.${category}`;
  }

  /**
   * Charge les agents actifs créés via l'agent builder et les ajoute au catalogue
   */
  loadDynamicAgents(): void {
    this.agentBuilderService.listAgents({ status: 'active' }).subscribe({
      next: (response) => {
        const dynamicAgents: Agent[] = response.agents.map(agent => ({
          id: agent.id,
          nameKey: agent.name, // Les agents dynamiques utilisent le nom directement
          descriptionKey: agent.description,
          icon: agent.icon || 'fa fa-robot',
          categoryKey: agent.category || 'catalog.categories.custom',
          status: 'active' as const,
          route: `/agent/${agent.id}`,
          hasConfig: true,
          isDynamic: true,
          dynamicAgent: agent
        }));

        // Ajouter les agents dynamiques à la liste
        this.agents = [...this.agents, ...dynamicAgents];

        // Mettre à jour les catégories
        const dynamicCategories = dynamicAgents
          .map(a => a.categoryKey)
          .filter(c => !this.categoryKeys.includes(c));
        this.categoryKeys = [...this.categoryKeys, ...new Set(dynamicCategories)];

        // Rafraîchir la liste filtrée
        this.filterAgents();
      },
      error: (error) => {
        console.error('Failed to load dynamic agents:', error);
      }
    });
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

    const agentName = agent.isDynamic ? agent.nameKey : this.translate.instant(agent.nameKey);

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
      // Pour les agents dynamiques, utiliser directement les valeurs, sinon traduire
      const agentCategory = agent.isDynamic ? agent.categoryKey : this.translate.instant(agent.categoryKey);
      const selectedCat = this.selectedCategory === 'all' ? 'all' :
        (agent.isDynamic ? this.selectedCategory : this.translate.instant(this.selectedCategory));

      const matchesCategory = this.selectedCategory === 'all' || agentCategory === selectedCat;

      const agentName = (agent.isDynamic ? agent.nameKey : this.translate.instant(agent.nameKey)).toLowerCase();
      const agentDesc = (agent.isDynamic ? agent.descriptionKey : this.translate.instant(agent.descriptionKey)).toLowerCase();
      const matchesSearch = agentName.includes(this.searchTerm.toLowerCase()) ||
                           agentDesc.includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
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
