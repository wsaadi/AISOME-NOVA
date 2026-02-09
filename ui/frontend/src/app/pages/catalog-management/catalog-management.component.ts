import { Component, OnInit } from '@angular/core';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { AgentBuilderService } from '../agent-builder/services/agent-builder.service';
import { AgentDefinition } from '../agent-builder/models/agent.models';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';

interface AgentWithOwnership extends AgentDefinition {
  isOwner: boolean;
  canManage: boolean;
}

/**
 * Page de gestion du catalogue d'agents
 *
 * - Admin: peut publier, masquer, supprimer tous les agents
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
    TranslateModule
  ],
  templateUrl: './catalog-management.component.html',
  styleUrls: ['./catalog-management.component.scss']
})
export class CatalogManagementComponent implements OnInit {
  agents: AgentWithOwnership[] = [];
  filteredAgents: AgentWithOwnership[] = [];
  displayedColumns = ['icon', 'name', 'category', 'status', 'createdBy', 'updatedAt', 'actions'];

  // Filtres
  searchTerm = '';
  statusFilter = 'all';
  ownershipFilter = 'all';

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalAgents = 0;

  // Permissions
  isAdmin = false;
  currentUserId = '';

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
    // Vérifier si l'utilisateur est admin (par rôle)
    this.isAdmin = this.roleService.hasRole('admin');

    // Obtenir l'ID utilisateur courant
    const profile = await this.roleService.getUserProfile();
    this.currentUserId = profile?.id || '';

    // Charger les agents
    this.loadAgents();
  }

  loadAgents(): void {
    this.agentBuilderService.listAgents({}).subscribe({
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
    // Seuls les admins peuvent supprimer
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
    this.router.navigate(['/agent-builder', agent.id]);
  }

  viewAgent(agent: AgentWithOwnership): void {
    if (agent.status === 'active') {
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
        // Ajouter le nouvel agent à la liste
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

  // Actions en masse (admin uniquement)
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

  private showPermissionError(): void {
    this.snackBar.open(
      this.translate.instant('catalog_management.permission_denied'),
      this.translate.instant('common.close'),
      { duration: 3000, panelClass: 'warning-snackbar' }
    );
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
