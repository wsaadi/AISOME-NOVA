import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';

import {
  SimpleBuilderService,
  SimpleAgent,
  Conversation,
  ConversationMessage,
  BuilderResponse
} from './services/simple-builder.service';

@Component({
  selector: 'app-simple-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule,
    MatMenuModule,
    MatListModule,
    TranslateModule,
    MarkdownViewerComponent,
  ],
  templateUrl: './simple-builder.component.html',
  styleUrls: ['./simple-builder.component.scss']
})
export class SimpleBuilderComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  // State
  conversation: Conversation | null = null;
  agents: SimpleAgent[] = [];
  isLoading = false;
  userMessage = '';

  // View state
  showAgentsList = false;
  selectedAgent: SimpleAgent | null = null;

  // Edit mode
  editMode = false;
  editingAgentId: string | null = null;
  editingAgent: SimpleAgent | null = null;

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;

  constructor(
    private builderService: SimpleBuilderService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Check for edit mode
    this.editMode = this.route.snapshot.data['editMode'] === true;
    this.editingAgentId = this.route.snapshot.paramMap.get('id');

    // Subscribe to conversation state
    this.builderService.currentConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversation => {
        this.conversation = conversation;
        this.shouldScrollToBottom = true;
      });

    // Subscribe to agents list
    this.builderService.agents$
      .pipe(takeUntil(this.destroy$))
      .subscribe(agents => {
        this.agents = agents;
      });

    // Subscribe to loading state
    this.builderService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    // Load existing agents
    this.loadAgents();

    // If in edit mode, load the agent for editing
    if (this.editMode && this.editingAgentId) {
      this.loadAgentForEdit(this.editingAgentId);
    }
  }

  /**
   * Load an existing agent for editing
   */
  loadAgentForEdit(agentId: string): void {
    this.isLoading = true;
    this.builderService.getAgent(agentId).subscribe({
      next: (response) => {
        if (response.success && response.agent) {
          this.editingAgent = response.agent;
          // Start a new conversation and pre-fill with edit context
          this.builderService.startConversation().subscribe({
            next: () => {
              // Send an initial message to set up the edit context
              const editMessage = `Je souhaite modifier l'agent existant "${response.agent!.name}".

Description actuelle : ${response.agent!.description}
Catégorie : ${response.agent!.category}
${response.agent!.system_prompt ? `Prompt système : ${response.agent!.system_prompt}` : ''}

Quelles modifications souhaitez-vous effectuer ?`;

              // Add the edit context as an assistant message
              if (this.conversation) {
                this.conversation.messages.push({
                  role: 'assistant',
                  content: editMessage,
                  timestamp: new Date().toISOString()
                });
              }
              this.isLoading = false;
            },
            error: () => {
              this.showError('Erreur lors de l\'initialisation de la conversation d\'édition.');
              this.isLoading = false;
            }
          });
        } else {
          this.showError('Agent non trouvé.');
          this.router.navigate(['/agents-catalog']);
        }
      },
      error: (error) => {
        console.error('Failed to load agent for edit:', error);
        this.showError('Erreur lors du chargement de l\'agent.');
        this.router.navigate(['/agents-catalog']);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============== CONVERSATION ==============

  startNewConversation(): void {
    this.builderService.startConversation().subscribe({
      error: (error) => {
        console.error('Failed to start conversation:', error);
        this.showError('Impossible de démarrer la conversation. Réessayez.');
      }
    });
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || this.isLoading || !this.conversation) return;

    const message = this.userMessage.trim();
    this.userMessage = '';

    this.builderService.sendMessage(this.conversation.id, message).subscribe({
      next: (response) => {
        // Handle special statuses
        if (response.conversation_status === 'ready_to_create') {
          this.showSuccess('Agent prêt à être créé !');
        } else if (response.conversation_status === 'out_of_scope') {
          this.showInfo('Cette demande sort du périmètre. Consultez les détails ci-dessus.');
        }
      },
      error: (error) => {
        console.error('Failed to send message:', error);
        this.showError('Erreur lors de l\'envoi du message. Réessayez.');
      }
    });
  }

  confirmCreateAgent(): void {
    if (!this.conversation) return;

    this.builderService.confirmAndCreateAgent(this.conversation.id).subscribe({
      next: (response) => {
        if (response.success && response.agent) {
          this.showSuccess(`Agent "${response.agent.name}" créé avec succès !`);
          // Optionally navigate to the agent
          this.navigateToAgent(response.agent);
        } else {
          this.showError(response.message || 'Erreur lors de la création.');
        }
      },
      error: (error) => {
        console.error('Failed to create agent:', error);
        this.showError('Erreur lors de la création de l\'agent.');
      }
    });
  }

  resetConversation(): void {
    this.builderService.resetConversation();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ============== AGENTS LIST ==============

  loadAgents(): void {
    this.builderService.listAgents().subscribe({
      error: (error) => {
        console.error('Failed to load agents:', error);
      }
    });
  }

  toggleAgentsList(): void {
    this.showAgentsList = !this.showAgentsList;
    if (this.showAgentsList) {
      this.loadAgents();
    }
  }

  navigateToAgent(agent: SimpleAgent): void {
    // Navigate to the agent's chat interface
    this.router.navigate(['/agent', agent.id]);
  }

  activateAgent(agent: SimpleAgent, event: Event): void {
    event.stopPropagation();
    this.builderService.activateAgent(agent.id).subscribe({
      next: () => {
        this.showSuccess(`Agent "${agent.name}" activé.`);
      },
      error: () => {
        this.showError('Erreur lors de l\'activation.');
      }
    });
  }

  deactivateAgent(agent: SimpleAgent, event: Event): void {
    event.stopPropagation();
    this.builderService.deactivateAgent(agent.id).subscribe({
      next: () => {
        this.showSuccess(`Agent "${agent.name}" désactivé.`);
      },
      error: () => {
        this.showError('Erreur lors de la désactivation.');
      }
    });
  }

  deleteAgent(agent: SimpleAgent, event: Event): void {
    event.stopPropagation();
    if (confirm(`Supprimer l'agent "${agent.name}" ?`)) {
      this.builderService.deleteAgent(agent.id).subscribe({
        next: () => {
          this.showSuccess(`Agent "${agent.name}" supprimé.`);
        },
        error: () => {
          this.showError('Erreur lors de la suppression.');
        }
      });
    }
  }

  // ============== HELPERS ==============

  private scrollToBottom(): void {
    try {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop =
          this.chatContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'check_circle';
      case 'draft': return 'edit';
      case 'disabled': return 'pause_circle';
      default: return 'help';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'draft': return 'warn';
      case 'disabled': return '';
      default: return '';
    }
  }

  copyOutOfScopeSummary(): void {
    if (this.conversation?.out_of_scope_summary) {
      navigator.clipboard.writeText(this.conversation.out_of_scope_summary).then(() => {
        this.showSuccess('Résumé copié dans le presse-papier.');
      });
    }
  }
}
