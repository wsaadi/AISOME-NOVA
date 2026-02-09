import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart, registerables, TooltipItem } from 'chart.js';

import { TokenConsumptionService } from '../../core/services/token-consumption.service';
import { QuotaService } from '../../core/services/quota.service';
import { RoleService } from '../../core/services/role.service';
import {
  TokenConsumptionRecord,
  ConsumptionStats,
  ConsumptionByEntity,
  ConsumptionByPeriod,
  ConsumptionFilter,
  QuotaConfig,
  QuotaUsage,
  ProviderCostConfig,
  AIProvider,
  AI_PROVIDERS,
  ViewMode,
  GroupBy,
  QuotaType,
  QuotaPeriod
} from '../../core/models/token-consumption.model';
import { QuotaDialogComponent } from './quota-dialog.component';
import { CostConfigDialogComponent } from './cost-config-dialog.component';

Chart.register(...registerables);

type ChartType = 'doughnut' | 'bar' | 'line' | 'pie' | 'polarArea';

const CHART_COLORS = [
  '#667eea', '#764ba2', '#11998e', '#38ef7d', '#fc466b',
  '#3f5efb', '#f093fb', '#f5576c', '#00b4d8', '#e77f67',
  '#786fa6', '#f8a5c2', '#63cdda', '#cf6a87', '#574b90'
];

@Component({
  selector: 'app-token-consumption',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatButtonToggleModule,
    TranslateModule
  ],
  templateUrl: './token-consumption.component.html',
  styleUrls: ['./token-consumption.component.scss']
})
export class TokenConsumptionComponent implements OnInit, OnDestroy, AfterViewInit {
  // Chart canvas references
  @ViewChild('chartByUser') chartByUserRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartByAgent') chartByAgentRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartByProvider') chartByProviderRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTimeline') chartTimelineRef!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private chartByUser: Chart | null = null;
  private chartByAgent: Chart | null = null;
  private chartByProvider: Chart | null = null;
  private chartTimeline: Chart | null = null;

  // Chart display options
  showCharts = signal(true);
  chartTypeEntity = signal<ChartType>('doughnut');
  chartTypeTimeline = signal<ChartType>('bar');
  private chartsInitialized = false;

  // Mode d'affichage
  viewMode = signal<ViewMode>('tokens');
  groupBy = signal<GroupBy>('day');

  // Filtres
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);
  selectedUsers = signal<string[]>([]);
  selectedAgents = signal<string[]>([]);
  selectedProviders = signal<AIProvider[]>([]);

  // Données
  globalStats = signal<ConsumptionStats | null>(null);
  statsByPeriod = signal<ConsumptionByPeriod[]>([]);
  statsByUser = signal<ConsumptionByEntity[]>([]);
  statsByAgent = signal<ConsumptionByEntity[]>([]);
  statsByProvider = signal<ConsumptionByEntity[]>([]);
  recentRecords = signal<TokenConsumptionRecord[]>([]);

  // Quotas
  quotas = signal<QuotaConfig[]>([]);
  quotaUsages = signal<{ quota: QuotaConfig; usage: QuotaUsage }[]>([]);

  // Configuration des coûts
  providerCosts = signal<ProviderCostConfig[]>([]);

  // Données pour les filtres
  availableUsers = signal<{ id: string; name: string }[]>([]);
  availableAgents = signal<{ id: string; name: string }[]>([]);
  availableProviders = AI_PROVIDERS;

  // Colonnes du tableau
  recordColumns = ['timestamp', 'username', 'agentName', 'provider', 'model', 'tokens', 'cost', 'duration'];
  quotaColumns = ['type', 'target', 'provider', 'period', 'limit', 'usage', 'status', 'actions'];

  // Computed: alertes quotas
  hasQuotaAlerts = computed(() => {
    return this.quotaUsages().some(q => q.usage.isAlertTriggered || q.usage.isExceeded);
  });

  // Computed
  filter = computed<ConsumptionFilter>(() => {
    const f: ConsumptionFilter = {};

    if (this.startDate()) {
      f.startDate = this.startDate()!.toISOString();
    }
    if (this.endDate()) {
      f.endDate = this.endDate()!.toISOString();
    }
    if (this.selectedUsers().length > 0) {
      f.userIds = this.selectedUsers();
    }
    if (this.selectedAgents().length > 0) {
      f.agentIds = this.selectedAgents();
    }
    if (this.selectedProviders().length > 0) {
      f.providers = this.selectedProviders();
    }

    return f;
  });

  constructor(
    private tokenConsumptionService: TokenConsumptionService,
    private quotaService: QuotaService,
    private roleService: RoleService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadQuotas();
    this.loadProviderCosts();

    // Initialiser les dates par défaut (30 derniers jours)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.startDate.set(start);
    this.endDate.set(end);

    // Charger les options de filtres
    this.availableUsers.set(this.tokenConsumptionService.getUniqueUsers());
    this.availableAgents.set(this.tokenConsumptionService.getUniqueAgents());
  }

  ngAfterViewInit(): void {
    this.chartsInitialized = true;
    this.renderAllCharts();
  }

  ngOnDestroy(): void {
    this.destroyAllCharts();
  }

  // ==================== CHARTS ====================

  toggleChartsView(): void {
    this.showCharts.update(v => !v);
    if (this.showCharts()) {
      setTimeout(() => this.renderAllCharts(), 50);
    }
  }

  onChartTypeEntityChange(type: ChartType): void {
    this.chartTypeEntity.set(type);
    this.renderEntityCharts();
  }

  onChartTypeTimelineChange(type: ChartType): void {
    this.chartTypeTimeline.set(type);
    this.renderTimelineChart();
  }

  private destroyAllCharts(): void {
    this.chartByUser?.destroy();
    this.chartByAgent?.destroy();
    this.chartByProvider?.destroy();
    this.chartTimeline?.destroy();
    this.chartByUser = null;
    this.chartByAgent = null;
    this.chartByProvider = null;
    this.chartTimeline = null;
  }

  renderAllCharts(): void {
    if (!this.chartsInitialized || !this.showCharts()) return;
    this.renderEntityCharts();
    this.renderTimelineChart();
  }

  private renderEntityCharts(): void {
    this.renderEntityChart('user');
    this.renderEntityChart('agent');
    this.renderEntityChart('provider');
  }

  private renderEntityChart(entity: 'user' | 'agent' | 'provider'): void {
    let canvasRef: ElementRef<HTMLCanvasElement> | undefined;
    let data: ConsumptionByEntity[];
    let existingChart: Chart | null;

    switch (entity) {
      case 'user':
        canvasRef = this.chartByUserRef;
        data = this.statsByUser();
        existingChart = this.chartByUser;
        break;
      case 'agent':
        canvasRef = this.chartByAgentRef;
        data = this.statsByAgent();
        existingChart = this.chartByAgent;
        break;
      case 'provider':
        canvasRef = this.chartByProviderRef;
        data = this.statsByProvider();
        existingChart = this.chartByProvider;
        break;
    }

    if (!canvasRef?.nativeElement) return;

    existingChart?.destroy();

    const isTokenMode = this.viewMode() === 'tokens';
    const labels = data.map(d => d.entityName);
    const values = data.map(d => isTokenMode ? d.stats.totalTokens : d.stats.totalCost);
    const chartType = this.chartTypeEntity();

    const isPolar = chartType === 'polarArea';
    const isDoughnutOrPie = chartType === 'doughnut' || chartType === 'pie';

    const chart = new Chart(canvasRef.nativeElement, {
      type: isPolar ? 'polarArea' : chartType as any,
      data: {
        labels,
        datasets: [{
          label: isTokenMode ? 'Tokens' : 'Cost (EUR)',
          data: values,
          backgroundColor: isDoughnutOrPie || isPolar
            ? CHART_COLORS.slice(0, data.length)
            : CHART_COLORS.slice(0, data.length).map(c => c + 'CC'),
          borderColor: isDoughnutOrPie || isPolar
            ? '#fff'
            : CHART_COLORS.slice(0, data.length),
          borderWidth: isDoughnutOrPie ? 2 : 1,
          borderRadius: chartType === 'bar' ? 4 : 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: isDoughnutOrPie || isPolar,
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<typeof chartType>) => {
                const val = ctx.parsed as number;
                const rawVal = typeof ctx.parsed === 'object' ? (ctx.parsed as any).y ?? (ctx.parsed as any).r ?? val : val;
                return isTokenMode
                  ? `${ctx.label}: ${this.formatTokens(rawVal)}`
                  : `${ctx.label}: ${this.formatCost(rawVal)}`;
              }
            }
          }
        },
        scales: isDoughnutOrPie || isPolar ? {} : {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val: any) => isTokenMode ? this.formatTokens(val) : this.formatCost(val)
            }
          }
        }
      }
    });

    switch (entity) {
      case 'user': this.chartByUser = chart; break;
      case 'agent': this.chartByAgent = chart; break;
      case 'provider': this.chartByProvider = chart; break;
    }
  }

  private renderTimelineChart(): void {
    if (!this.chartTimelineRef?.nativeElement) return;

    this.chartTimeline?.destroy();

    const periodData = this.statsByPeriod();
    const isTokenMode = this.viewMode() === 'tokens';
    const labels = periodData.map(d => d.period);
    const chartType = this.chartTypeTimeline();

    const isPolar = chartType === 'polarArea';
    const isDoughnutOrPie = chartType === 'doughnut' || chartType === 'pie';

    const datasets: any[] = isDoughnutOrPie || isPolar
      ? [{
          data: periodData.map(d => isTokenMode ? d.stats.totalTokens : d.stats.totalCost),
          backgroundColor: CHART_COLORS.slice(0, periodData.length),
          borderColor: '#fff',
          borderWidth: 2,
        }]
      : [
          {
            label: isTokenMode ? 'Prompt Tokens' : 'Prompt Cost',
            data: periodData.map(d => isTokenMode ? d.stats.totalPromptTokens : (d.stats as any).promptCost ?? d.stats.totalCost * 0.4),
            backgroundColor: '#667eeaCC',
            borderColor: '#667eea',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 4 : 0,
            fill: chartType === 'line',
            tension: 0.3,
          },
          {
            label: isTokenMode ? 'Completion Tokens' : 'Completion Cost',
            data: periodData.map(d => isTokenMode ? d.stats.totalCompletionTokens : (d.stats as any).completionCost ?? d.stats.totalCost * 0.6),
            backgroundColor: '#38ef7dCC',
            borderColor: '#11998e',
            borderWidth: 2,
            borderRadius: chartType === 'bar' ? 4 : 0,
            fill: chartType === 'line',
            tension: 0.3,
          }
        ];

    this.chartTimeline = new Chart(this.chartTimelineRef.nativeElement, {
      type: isPolar ? 'polarArea' : chartType as any,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, usePointStyle: true, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx: TooltipItem<typeof chartType>) => {
                const val = typeof ctx.parsed === 'object' ? (ctx.parsed as any).y ?? ctx.parsed : ctx.parsed;
                return isTokenMode
                  ? `${ctx.dataset.label || ctx.label}: ${this.formatTokens(val as number)}`
                  : `${ctx.dataset.label || ctx.label}: ${this.formatCost(val as number)}`;
              }
            }
          }
        },
        scales: isDoughnutOrPie || isPolar ? {} : {
          x: {
            stacked: chartType === 'bar',
          },
          y: {
            stacked: chartType === 'bar',
            beginAtZero: true,
            ticks: {
              callback: (val: any) => isTokenMode ? this.formatTokens(val) : this.formatCost(val)
            }
          }
        }
      }
    });
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  loadData(): void {
    const filter = this.filter();

    this.globalStats.set(this.tokenConsumptionService.getGlobalStats(filter));
    this.statsByPeriod.set(this.tokenConsumptionService.getStatsByPeriod(this.getTimeGrouping(), filter));
    this.statsByUser.set(this.tokenConsumptionService.getStatsByUser(filter));
    this.statsByAgent.set(this.tokenConsumptionService.getStatsByAgent(filter));
    this.statsByProvider.set(this.tokenConsumptionService.getStatsByProvider(filter));

    const records = this.tokenConsumptionService.getFilteredRecords(filter);
    this.recentRecords.set(records.slice(-100).reverse());

    if (this.chartsInitialized) {
      setTimeout(() => this.renderAllCharts(), 50);
    }
  }

  loadQuotas(): void {
    this.quotas.set(this.quotaService.getQuotas());
    this.quotaUsages.set(this.quotaService.getAllQuotaUsages());
  }

  loadProviderCosts(): void {
    this.providerCosts.set(this.tokenConsumptionService.getCosts());
  }

  // ==================== ACTIONS FILTRES ====================

  applyFilters(): void {
    this.loadData();
  }

  resetFilters(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    this.startDate.set(start);
    this.endDate.set(end);
    this.selectedUsers.set([]);
    this.selectedAgents.set([]);
    this.selectedProviders.set([]);

    this.loadData();
  }

  setDateRange(range: 'today' | 'week' | 'month' | 'year'): void {
    const end = new Date();
    const start = new Date();

    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    this.startDate.set(start);
    this.endDate.set(end);
    this.loadData();
  }

  onViewModeChange(): void {
    if (this.chartsInitialized) {
      setTimeout(() => this.renderAllCharts(), 50);
    }
  }

  onGroupByChange(): void {
    this.loadData();
  }

  // ==================== ACTIONS QUOTAS ====================

  openQuotaDialog(quota?: QuotaConfig): void {
    const dialogRef = this.dialog.open(QuotaDialogComponent, {
      width: '600px',
      data: { quota, users: this.availableUsers(), agents: this.availableAgents() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (quota) {
          this.quotaService.updateQuota(quota.id, result);
          this.showMessage('token_consumption.quota_updated');
        } else {
          this.quotaService.createQuota(result, 'admin');
          this.showMessage('token_consumption.quota_created');
        }
        this.loadQuotas();
      }
    });
  }

  toggleQuota(quota: QuotaConfig): void {
    this.quotaService.toggleQuota(quota.id);
    this.loadQuotas();
  }

  deleteQuota(quota: QuotaConfig): void {
    if (confirm(this.translate.instant('token_consumption.confirm_delete_quota'))) {
      this.quotaService.deleteQuota(quota.id);
      this.showMessage('token_consumption.quota_deleted');
      this.loadQuotas();
    }
  }

  // ==================== ACTIONS COÛTS ====================

  openCostDialog(cost?: ProviderCostConfig): void {
    const dialogRef = this.dialog.open(CostConfigDialogComponent, {
      width: '500px',
      data: { cost, providers: AI_PROVIDERS }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.tokenConsumptionService.updateCostConfig(result, 'admin');
        this.showMessage('token_consumption.cost_updated');
        this.loadProviderCosts();
      }
    });
  }

  resetCostsToDefault(): void {
    if (confirm(this.translate.instant('token_consumption.confirm_reset_costs'))) {
      this.tokenConsumptionService.resetCostsToDefault();
      this.showMessage('token_consumption.costs_reset');
      this.loadProviderCosts();
    }
  }

  // ==================== UTILITAIRES ====================

  private getTimeGrouping(): 'day' | 'week' | 'month' {
    const group = this.groupBy();
    if (group === 'day' || group === 'week' || group === 'month') {
      return group;
    }
    return 'day';
  }

  formatTokens(tokens: number): string {
    return this.tokenConsumptionService.formatTokens(tokens);
  }

  formatCost(cost: number): string {
    return this.tokenConsumptionService.formatCost(cost);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('fr-FR');
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  getProviderIcon(provider: string): string {
    return AI_PROVIDERS.find(p => p.id === provider)?.icon || 'help';
  }

  getProviderName(provider: string): string {
    return AI_PROVIDERS.find(p => p.id === provider)?.name || provider;
  }

  getQuotaTypeIcon(type: QuotaType): string {
    return this.quotaService.getQuotaTypeIcon(type);
  }

  formatQuotaType(type: QuotaType): string {
    return this.quotaService.formatQuotaType(type);
  }

  formatPeriod(period: QuotaPeriod): string {
    return this.quotaService.formatPeriod(period);
  }

  getUsageColor(percentUsed: number, alertThreshold: number): string {
    return this.quotaService.getUsageColor(percentUsed, alertThreshold);
  }

  getProgressColor(percentUsed: number): string {
    if (percentUsed >= 100) return 'warn';
    if (percentUsed >= 80) return 'accent';
    return 'primary';
  }

  private showMessage(key: string): void {
    this.snackBar.open(
      this.translate.instant(key),
      this.translate.instant('common.close'),
      { duration: 3000 }
    );
  }

  // Getters pour les totaux en mode financier
  getTotalCostDisplay(): string {
    const stats = this.globalStats();
    if (!stats) return '0,00 €';
    return this.formatCost(stats.totalCost);
  }

  getTotalTokensDisplay(): string {
    const stats = this.globalStats();
    if (!stats) return '0';
    return this.formatTokens(stats.totalTokens);
  }

  // Export des données
  exportToCSV(): void {
    const records = this.tokenConsumptionService.getFilteredRecords(this.filter());

    const headers = ['Date', 'Utilisateur', 'Agent', 'Provider', 'Modèle', 'Tokens Prompt', 'Tokens Completion', 'Tokens Total', 'Coût (€)', 'Durée (ms)'];
    const rows = records.map(r => [
      r.timestamp,
      r.username,
      r.agentName,
      r.provider,
      r.model,
      r.promptTokens,
      r.completionTokens,
      r.totalTokens,
      r.totalCost || 0,
      r.durationMs
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `token_consumption_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    this.showMessage('token_consumption.export_success');
  }
}
