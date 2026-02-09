import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { AgentBuilderService } from './services/agent-builder.service';
import { CopilotImportService } from './services/copilot-import.service';
import { AgentGeneratorService } from './services/agent-generator.service';
import { AgentDSLService } from './services/agent-dsl.service';
import { AgentDefinition, AgentStatus, ValidationResult } from './models/agent.models';
import { RoleService } from '../../core/services/role.service';

// Sub-components
import { AgentInfoEditorComponent } from './components/agent-info-editor/agent-info-editor.component';
import { ToolsEditorComponent } from './components/tools-editor/tools-editor.component';
import { UILayoutEditorComponent } from './components/ui-layout-editor/ui-layout-editor.component';
import { WidgetGridEditorComponent } from './components/widget-grid-editor/widget-grid-editor.component';
import { AIBehaviorEditorComponent } from './components/ai-behavior-editor/ai-behavior-editor.component';
import { AgentPreviewComponent } from './components/agent-preview/agent-preview.component';
import { CreateAgentDialogComponent } from './components/create-agent-dialog/create-agent-dialog.component';
import { AgentListDialogComponent } from './components/agent-list-dialog/agent-list-dialog.component';
import {
  AgentPromptGeneratorComponent,
  AgentPromptGeneratorDialogResult,
} from './components/agent-prompt-generator/agent-prompt-generator.component';

@Component({
  selector: 'app-agent-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule,
    TranslateModule,
    // Sub-components
    AgentInfoEditorComponent,
    ToolsEditorComponent,
    UILayoutEditorComponent,
    WidgetGridEditorComponent,
    AIBehaviorEditorComponent,
    AgentPreviewComponent,
  ],
  templateUrl: './agent-builder.component.html',
  styleUrls: ['./agent-builder.component.scss'],
})
export class AgentBuilderComponent implements OnInit, OnDestroy {
  agent: AgentDefinition | null = null;
  isLoading = false;
  isSaving = false;
  isDirty = false;
  selectedTabIndex = 0;
  validationResult: ValidationResult | null = null;
  showPreview = false;

  // Permissions
  isAdmin = false;
  currentUserId = '';

  private destroy$ = new Subject<void>();

  constructor(
    private agentBuilderService: AgentBuilderService,
    private copilotImportService: CopilotImportService,
    private agentGeneratorService: AgentGeneratorService,
    private agentDSLService: AgentDSLService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private roleService: RoleService
  ) {}

  async ngOnInit(): Promise<void> {
    // Vérifier les permissions
    this.isAdmin = this.roleService.hasRole('admin');
    const profile = await this.roleService.getUserProfile();
    this.currentUserId = profile?.id || '';

    // Subscribe to current agent
    this.agentBuilderService.currentAgent$.pipe(takeUntil(this.destroy$)).subscribe((agent) => {
      this.agent = agent;
    });

    // Subscribe to dirty state
    this.agentBuilderService.isDirty$.pipe(takeUntil(this.destroy$)).subscribe((isDirty) => {
      this.isDirty = isDirty;
    });

    // Check for agent ID in route
    const agentId = this.route.snapshot.paramMap.get('id');
    if (agentId) {
      this.loadAgent(agentId);
    }
  }

  /**
   * Vérifie si l'utilisateur peut modifier l'agent actuel
   * Admin: peut tout modifier
   * Utilisateur: peut modifier uniquement ses propres agents
   */
  canEdit(): boolean {
    if (this.isAdmin) return true;
    if (!this.agent) return false;
    return this.agent.metadata?.created_by === this.currentUserId;
  }

  /**
   * Vérifie si l'utilisateur peut supprimer l'agent actuel
   * Même logique que canEdit
   */
  canDelete(): boolean {
    return this.canEdit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============== AGENT OPERATIONS ==============

  loadAgent(agentId: string): void {
    this.isLoading = true;
    this.agentBuilderService.getAgent(agentId).subscribe({
      next: (agent) => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.showError('agent_builder.errors.load_failed');
        console.error('Failed to load agent:', error);
      },
    });
  }

  createNewAgent(): void {
    const dialogRef = this.dialog.open(CreateAgentDialogComponent, {
      width: '500px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.isLoading = true;
        this.agentBuilderService.createAgent(result).subscribe({
          next: (agent) => {
            this.isLoading = false;
            this.showSuccess('agent_builder.messages.created');
            this.router.navigate(['/agent-builder', agent.id]);
          },
          error: (error) => {
            this.isLoading = false;
            this.showError('agent_builder.errors.create_failed');
            console.error('Failed to create agent:', error);
          },
        });
      }
    });
  }

  openAgentGenerator(): void {
    const dialogRef = this.dialog.open(AgentPromptGeneratorComponent, {
      width: '950px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'agent-generator-dialog',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result: AgentPromptGeneratorDialogResult) => {
      if (!result || result.action === 'cancel') return;

      if (result.action === 'create' && result.agentId) {
        // Agent was created directly - navigate to it
        this.showSuccess('agent_builder.messages.created');
        this.router.navigate(['/agent-builder', result.agentId]).then(() => {
          this.loadAgent(result.agentId!);
        });
      } else if (result.action === 'edit' && result.yaml) {
        // User wants to edit the generated YAML in the builder
        // Import the YAML and navigate to the agent
        this.agentDSLService.importFromYAML(result.yaml).subscribe({
          next: (response) => {
            this.showSuccess('agent_builder.messages.created');
            this.router.navigate(['/agent-builder', response.agent_id]).then(() => {
              this.loadAgent(response.agent_id);
            });
          },
          error: (error) => {
            this.showError('agent_builder.errors.import_failed');
            console.error('Failed to import generated YAML:', error);
          },
        });
      }
    });
  }

  openAgentList(): void {
    const dialogRef = this.dialog.open(AgentListDialogComponent, {
      width: '800px',
      maxHeight: '80vh',
    });

    dialogRef.afterClosed().subscribe((selectedAgent) => {
      if (selectedAgent) {
        this.router.navigate(['/agent-builder', selectedAgent.id]);
      }
    });
  }

  saveAgent(): void {
    if (!this.agent) return;

    this.isSaving = true;
    this.agentBuilderService
      .updateAgent(this.agent.id, {
        name: this.agent.name,
        description: this.agent.description,
        long_description: this.agent.long_description,
        icon: this.agent.icon,
        category: this.agent.category,
        tools: this.agent.tools,
        ui_layout: this.agent.ui_layout,
        ai_behavior: this.agent.ai_behavior,
        workflows: this.agent.workflows,
      })
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.showSuccess('agent_builder.messages.saved');
        },
        error: (error) => {
          this.isSaving = false;
          this.showError('agent_builder.errors.save_failed');
          console.error('Failed to save agent:', error);
        },
      });
  }

  validateAgent(): void {
    if (!this.agent) return;

    this.agentBuilderService.validateAgent(this.agent.id).subscribe({
      next: (result) => {
        this.validationResult = result;
        if (result.valid) {
          this.showSuccess('agent_builder.messages.validation_passed');
        } else {
          this.showError('agent_builder.messages.validation_failed');
        }
      },
      error: (error) => {
        this.showError('agent_builder.errors.validation_failed');
        console.error('Validation failed:', error);
      },
    });
  }

  activateAgent(): void {
    if (!this.agent) return;

    this.agentBuilderService.activateAgent(this.agent.id).subscribe({
      next: (agent) => {
        this.showSuccess('agent_builder.messages.activated');
      },
      error: (error) => {
        this.showError('agent_builder.errors.activation_failed');
        console.error('Activation failed:', error);
      },
    });
  }

  deactivateAgent(): void {
    if (!this.agent) return;

    this.agentBuilderService.deactivateAgent(this.agent.id).subscribe({
      next: (agent) => {
        this.showSuccess('agent_builder.messages.deactivated');
      },
      error: (error) => {
        this.showError('agent_builder.errors.deactivation_failed');
        console.error('Deactivation failed:', error);
      },
    });
  }

  duplicateAgent(): void {
    if (!this.agent) return;

    const newName = `${this.agent.name} (Copy)`;
    this.agentBuilderService.duplicateAgent(this.agent.id, newName).subscribe({
      next: (agent) => {
        this.showSuccess('agent_builder.messages.duplicated');
        this.router.navigate(['/agent-builder', agent.id]);
      },
      error: (error) => {
        this.showError('agent_builder.errors.duplicate_failed');
        console.error('Duplication failed:', error);
      },
    });
  }

  exportAgent(): void {
    if (!this.agent) return;

    this.agentBuilderService.exportAgent(this.agent.id).subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.agent!.name.toLowerCase().replace(/\s+/g, '-')}-agent.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess('agent_builder.messages.exported');
      },
      error: (error) => {
        this.showError('agent_builder.errors.export_failed');
        console.error('Export failed:', error);
      },
    });
  }

  importAgent(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Detect file type
    const isZip = file.name.toLowerCase().endsWith('.zip');
    const isJson = file.name.toLowerCase().endsWith('.json');

    if (isZip) {
      // Handle Microsoft Copilot ZIP import
      this.importCopilotZip(file);
    } else if (isJson) {
      // Handle standard JSON import
      this.importJson(file);
    } else {
      this.showError('agent_builder.errors.invalid_file_type');
    }

    input.value = ''; // Reset input
  }

  private importJson(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        this.agentBuilderService.importAgent(data).subscribe({
          next: (agent) => {
            this.showSuccess('agent_builder.messages.imported');
            this.router.navigate(['/agent-builder', agent.id]);
          },
          error: (error) => {
            this.showError('agent_builder.errors.import_failed');
            console.error('Import failed:', error);
          },
        });
      } catch (error) {
        this.showError('agent_builder.errors.invalid_file');
      }
    };
    reader.readAsText(file);
  }

  private async importCopilotZip(file: File): Promise<void> {
    try {
      this.isLoading = true;

      // Validate it's a Copilot ZIP
      const isValid = await this.copilotImportService.isValidCopilotZip(file);
      if (!isValid) {
        this.isLoading = false;
        this.showError('agent_builder.errors.invalid_copilot_zip');
        return;
      }

      // Parse the ZIP and convert to agent definitions (one per conversation starter)
      const agentsData = await this.copilotImportService.importCopilotZip(file);

      console.log(`✅ Copilot parsed: ${agentsData.length} agent(s) to import`);

      // Import all agents in parallel
      const importObservables = agentsData.map(agentData =>
        this.agentBuilderService.importAgent(agentData)
      );

      forkJoin(importObservables).subscribe({
        next: (agents) => {
          console.log(`✅ ${agents.length} agent(s) imported successfully:`, agents);

          // Show success message
          const message = agents.length === 1
            ? this.translate.instant('agent_builder.messages.copilot_imported')
            : this.translate.instant('agent_builder.messages.copilot_imported_multiple', { count: agents.length });

          this.showSuccess(message);

          // Navigate to the first agent and force reload
          if (agents.length > 0) {
            this.router.navigate(['/agent-builder', agents[0].id]).then(() => {
              console.log('✅ Navigation completed to:', agents[0].id);
              this.loadAgent(agents[0].id);
            });
          }
        },
        error: (error) => {
          console.error('❌ Copilot import failed:', error);
          this.isLoading = false;
          this.showError('agent_builder.errors.import_failed');
        },
      });
    } catch (error) {
      console.error('❌ Failed to parse Copilot ZIP:', error);
      this.isLoading = false;
      this.showError('agent_builder.errors.copilot_parse_failed');
    }
  }

  deleteAgent(): void {
    if (!this.agent) return;

    if (confirm(this.translate.instant('agent_builder.confirm.delete'))) {
      this.agentBuilderService.deleteAgent(this.agent.id).subscribe({
        next: () => {
          this.showSuccess('agent_builder.messages.deleted');
          this.router.navigate(['/agent-builder']);
        },
        error: (error) => {
          this.showError('agent_builder.errors.delete_failed');
          console.error('Delete failed:', error);
        },
      });
    }
  }

  // ============== PREVIEW ==============

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  // ============== TAB HANDLING ==============

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
  }

  // ============== STATUS HELPERS ==============

  getStatusColor(status: AgentStatus): string {
    const colors: Record<AgentStatus, string> = {
      draft: 'warn',
      active: 'primary',
      beta: 'accent',
      disabled: '',
      archived: '',
    };
    return colors[status] || '';
  }

  getStatusIcon(status: AgentStatus): string {
    const icons: Record<AgentStatus, string> = {
      draft: 'edit',
      active: 'check_circle',
      beta: 'science',
      disabled: 'pause_circle',
      archived: 'archive',
    };
    return icons[status] || 'help';
  }

  // ============== NOTIFICATIONS ==============

  private showSuccess(messageKey: string): void {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), {
      duration: 3000,
      panelClass: 'success-snackbar',
    });
  }

  private showError(messageKey: string): void {
    this.snackBar.open(this.translate.instant(messageKey), this.translate.instant('common.close'), {
      duration: 5000,
      panelClass: 'error-snackbar',
    });
  }
}
