import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { AgentBuilderService } from '../agent-builder/services/agent-builder.service';
import { AgentDefinition, AgentType } from '../agent-builder/models/agent.models';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';

interface AgentWithOwnership extends AgentDefinition {
  isOwner: boolean;
  canManage: boolean;
}

/**
 * Page de gestion du catalogue d'agents
 *
 * Gère TOUS les agents de la plateforme (static, dynamic, runtime):
 * - Admin: peut publier, masquer, supprimer, exporter, importer tous les agents
 * - Utilisateur: peut publier, masquer uniquement ses propres agents
 */
@Component({
  selector: 'app-catalog-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    TranslateModule
  ],
  templateUrl: './catalog-management.component.html',
  styleUrls: ['./catalog-management.component.scss']
})
export class CatalogManagementComponent implements OnInit {
  @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;

  agents: AgentWithOwnership[] = [];
  filteredAgents: AgentWithOwnership[] = [];
  displayedColumns = ['icon', 'name', 'agentType', 'category', 'status', 'createdBy', 'updatedAt', 'actions'];

  // Filtres
  searchTerm = '';
  statusFilter = 'all';
  ownershipFilter = 'all';
  typeFilter = 'all';

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalAgents = 0;

  // Permissions
  isAdmin = false;
  currentUserId = '';

  // Import state
  isImporting = false;

  // Statuts disponibles
  statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'active', label: 'Publié' },
    { value: 'beta', label: 'Beta' },
    { value: 'disabled', label: 'Masqué' },
    { value: 'archived', label: 'Archivé' }
  ];

  ownershipOptions = [
    { value: 'all', label: 'Tous les agents' },
    { value: 'mine', label: 'Mes agents' },
    { value: 'others', label: 'Agents des autres' }
  ];

  typeOptions = [
    { value: 'all', label: 'Tous les types' },
    { value: 'static', label: 'Intégré (Static)' },
    { value: 'dynamic', label: 'Personnalisé (Dynamic)' },
    { value: 'runtime', label: 'Runtime (YAML)' }
  ];

  constructor(
    private agentBuilderService: AgentBuilderService,
    private roleService: RoleService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.isAdmin = this.roleService.hasRole('admin');
    const profile = await this.roleService.getUserProfile();
    this.currentUserId = profile?.id || '';
    this.loadAgents();
  }

  loadAgents(): void {
    // Charger TOUS les agents (sans filtre de statut ni de type)
    this.agentBuilderService.listAgents({ pageSize: 200 }).subscribe({
      next: (response) => {
        this.agents = response.agents.map(agent => ({
          ...agent,
          isOwner: this.isOwnerOf(agent),
          canManage: this.canManageAgent(agent)
        }));
        this.totalAgents = response.total;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error loading agents:', err);
        this.snackBar.open(
          this.translate.instant('catalog_management.load_error'),
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
      }
    });
  }

  isOwnerOf(agent: AgentDefinition): boolean {
    return agent.metadata?.created_by === this.currentUserId;
  }

  canManageAgent(agent: AgentDefinition): boolean {
    if (this.isAdmin) return true;
    return this.isOwnerOf(agent);
  }

  applyFilters(): void {
    let filtered = [...this.agents];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === this.statusFilter);
    }

    // Filtre par type d'agent
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(a => (a.agent_type || 'dynamic') === this.typeFilter);
    }

    // Filtre par propriété
    if (this.ownershipFilter === 'mine') {
      filtered = filtered.filter(a => a.isOwner);
    } else if (this.ownershipFilter === 'others') {
      filtered = filtered.filter(a => !a.isOwner);
    }

    this.filteredAgents = filtered;
    this.totalAgents = filtered.length;
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
  }

  onOwnershipFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  getPagedAgents(): AgentWithOwnership[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredAgents.slice(start, start + this.pageSize);
  }

  // Actions sur les agents
  publishAgent(agent: AgentWithOwnership): void {
    if (!agent.canManage) {
      this.showPermissionError();
      return;
    }

    this.agentBuilderService.activateAgent(agent.id).subscribe({
      next: () => {
        agent.status = 'active';
        this.snackBar.open(
          this.translate.instant('catalog_management.publish_success', { name: agent.name }),
          this.translate.instant('common.close'),
          { duration: 3000, panelClass: 'success-snackbar' }
        );
      },
      error: (err) => {
        console.error('Error publishing agent:', err);
        this.snackBar.open(
          this.translate.instant('catalog_management.publish_error'),
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
      }
    });
  }

  hideAgent(agent: AgentWithOwnership): void {
    if (!agent.canManage) {
      this.showPermissionError();
      return;
    }

    this.agentBuilderService.deactivateAgent(agent.id).subscribe({
      next: () => {
        agent.status = 'disabled';
        this.snackBar.open(
          this.translate.instant('catalog_management.hide_success', { name: agent.name }),
          this.translate.instant('common.close'),
          { duration: 3000, panelClass: 'success-snackbar' }
        );
      },
      error: (err) => {
        console.error('Error hiding agent:', err);
        this.snackBar.open(
          this.translate.instant('catalog_management.hide_error'),
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
      }
    });
  }

  deleteAgent(agent: AgentWithOwnership): void {
    if (!this.isAdmin) {
      this.showPermissionError();
      return;
    }

    const confirmMessage = this.translate.instant('catalog_management.confirm_delete', { name: agent.name });
    if (!confirm(confirmMessage)) {
      return;
    }

    this.agentBuilderService.deleteAgent(agent.id).subscribe({
      next: () => {
        this.agents = this.agents.filter(a => a.id !== agent.id);
        this.applyFilters();
        this.snackBar.open(
          this.translate.instant('catalog_management.delete_success', { name: agent.name }),
          this.translate.instant('common.close'),
          { duration: 3000, panelClass: 'success-snackbar' }
        );
      },
      error: (err) => {
        console.error('Error deleting agent:', err);
        this.snackBar.open(
          this.translate.instant('catalog_management.delete_error'),
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
      }
    });
  }

  editAgent(agent: AgentWithOwnership): void {
    if (!agent.canManage) {
      this.showPermissionError();
      return;
    }
    // Les agents statiques ne sont pas éditables via le builder
    if (agent.agent_type === 'static') {
      this.snackBar.open(
        'Les agents intégrés ne peuvent pas être édités via le builder',
        this.translate.instant('common.close'),
        { duration: 3000, panelClass: 'warning-snackbar' }
      );
      return;
    }
    this.router.navigate(['/edit-agent', agent.id]);
  }

  viewAgent(agent: AgentWithOwnership): void {
    if (agent.route) {
      this.router.navigate([agent.route]);
    } else {
      this.router.navigate(['/agent', agent.id]);
    }
  }

  duplicateAgent(agent: AgentWithOwnership): void {
    const newName = prompt(
      this.translate.instant('catalog_management.duplicate_prompt'),
      `${agent.name} (copie)`
    );

    if (!newName) return;

    this.agentBuilderService.duplicateAgent(agent.id, newName).subscribe({
      next: (newAgent) => {
        this.agents.push({
          ...newAgent,
          isOwner: true,
          canManage: true
        });
        this.applyFilters();
        this.snackBar.open(
          this.translate.instant('catalog_management.duplicate_success', { name: newName }),
          this.translate.instant('common.close'),
          { duration: 3000, panelClass: 'success-snackbar' }
        );
      },
      error: (err) => {
        console.error('Error duplicating agent:', err);
        this.snackBar.open(
          this.translate.instant('catalog_management.duplicate_error'),
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
      }
    });
  }

  // ============== IMPORT / EXPORT ==============

  /**
   * Exporte un agent sous forme d'archive ZIP
   */
  exportAgentArchive(agent: AgentWithOwnership): void {
    this.agentBuilderService.exportAgentArchive(agent.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}.agent.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.snackBar.open(
          `Archive "${agent.name}" téléchargée`,
          this.translate.instant('common.close'),
          { duration: 3000, panelClass: 'success-snackbar' }
        );
      },
      error: (err) => {
        console.error('Error exporting agent archive:', err);
        this.snackBar.open(
          'Erreur lors de l\'export de l\'archive',
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
      }
    });
  }

  /**
   * Ouvre le sélecteur de fichier pour importer une archive
   */
  triggerImportArchive(): void {
    if (this.importFileInput) {
      this.importFileInput.nativeElement.click();
    }
  }

  /**
   * Gère l'import d'une archive ZIP sélectionnée
   */
  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (!file.name.endsWith('.zip')) {
      this.snackBar.open(
        'Veuillez sélectionner un fichier .zip',
        this.translate.instant('common.close'),
        { duration: 3000, panelClass: 'warning-snackbar' }
      );
      return;
    }

    this.isImporting = true;
    this.agentBuilderService.importAgentArchive(file).subscribe({
      next: (newAgent) => {
        this.isImporting = false;
        this.agents.push({
          ...newAgent,
          isOwner: true,
          canManage: true
        });
        this.applyFilters();
        this.snackBar.open(
          `Agent "${newAgent.name}" importé avec succès`,
          this.translate.instant('common.close'),
          { duration: 3000, panelClass: 'success-snackbar' }
        );
        // Reset file input
        input.value = '';
      },
      error: (err) => {
        this.isImporting = false;
        console.error('Error importing agent archive:', err);
        this.snackBar.open(
          'Erreur lors de l\'import de l\'archive: ' + (err.error?.detail || err.message),
          this.translate.instant('common.close'),
          { duration: 5000, panelClass: 'error-snackbar' }
        );
        input.value = '';
      }
    });
  }

  // ============== BULK ACTIONS ==============

  publishSelected(agents: AgentWithOwnership[]): void {
    if (!this.isAdmin) {
      this.showPermissionError();
      return;
    }
    const manageable = agents.filter(a => a.canManage && a.status !== 'active');
    manageable.forEach(agent => this.publishAgent(agent));
  }

  hideSelected(agents: AgentWithOwnership[]): void {
    if (!this.isAdmin) {
      this.showPermissionError();
      return;
    }
    const manageable = agents.filter(a => a.canManage && a.status === 'active');
    manageable.forEach(agent => this.hideAgent(agent));
  }

  // ============== HELPERS ==============

  private showPermissionError(): void {
    this.snackBar.open(
      this.translate.instant('catalog_management.permission_denied'),
      this.translate.instant('common.close'),
      { duration: 3000, panelClass: 'warning-snackbar' }
    );
  }

  getAgentTypeLabel(agentType: string): string {
    const typeMap: { [key: string]: string } = {
      'static': 'Intégré',
      'dynamic': 'Personnalisé',
      'runtime': 'Runtime'
    };
    return typeMap[agentType] || agentType || 'Personnalisé';
  }

  getAgentTypeClass(agentType: string): string {
    return `type-${agentType || 'dynamic'}`;
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'draft': 'catalog_management.status.draft',
      'active': 'catalog_management.status.active',
      'beta': 'catalog_management.status.beta',
      'disabled': 'catalog_management.status.disabled',
      'archived': 'catalog_management.status.archived'
    };
    return this.translate.instant(statusMap[status] || status);
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getOwnerName(agent: AgentDefinition): string {
    if (this.isOwnerOf(agent)) {
      return this.translate.instant('catalog_management.you');
    }
    return agent.metadata?.created_by || this.translate.instant('catalog_management.unknown');
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
