import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { AgentDefinition, AgentStatus, AgentCategory } from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

@Component({
  selector: 'app-agent-list-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>folder_open</mat-icon>
      {{ 'agent_builder.dialog.open_title' | translate }}
    </h2>
    <mat-dialog-content>
      <!-- Search & Filters -->
      <div class="filters">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>{{ 'agent_builder.dialog.search' | translate }}</mat-label>
          <input matInput [(ngModel)]="searchQuery" (ngModelChange)="loadAgents()" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>{{ 'agent_builder.dialog.status' | translate }}</mat-label>
          <mat-select [(ngModel)]="statusFilter" (selectionChange)="loadAgents()">
            <mat-option [value]="null">{{ 'agent_builder.dialog.all_status' | translate }}</mat-option>
            <mat-option value="draft">Draft</mat-option>
            <mat-option value="active">Active</mat-option>
            <mat-option value="beta">Beta</mat-option>
            <mat-option value="disabled">Disabled</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Agent List -->
      @if (isLoading) {
        <div class="loading">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else if (agents.length === 0) {
        <div class="empty-state">
          <mat-icon>inbox</mat-icon>
          <p>{{ 'agent_builder.dialog.no_agents' | translate }}</p>
        </div>
      } @else {
        <mat-selection-list [multiple]="false" class="agent-list">
          @for (agent of agents; track agent.id) {
            <mat-list-option [value]="agent" (click)="selectAgent(agent)">
              <div class="agent-item">
                <div class="agent-icon">
                  <i [class]="agent.icon"></i>
                </div>
                <div class="agent-info">
                  <span class="agent-name">{{ agent.name }}</span>
                  <span class="agent-description">{{ agent.description }}</span>
                  <div class="agent-meta">
                    <mat-chip [class]="'status-' + agent.status">{{ agent.status }}</mat-chip>
                    <span class="agent-date">{{ agent.metadata.updated_at | date : 'short' }}</span>
                  </div>
                </div>
              </div>
            </mat-list-option>
          }
        </mat-selection-list>

        <!-- Pagination Info -->
        <div class="pagination-info">
          {{ 'agent_builder.dialog.showing' | translate : { count: agents.length, total: totalAgents } }}
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        padding: 20px 24px;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        border-bottom: 1px solid #e5e7eb;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);

        mat-icon {
          color: #3f51b5;
          font-size: 28px;
          width: 28px;
          height: 28px;
        }
      }

      mat-dialog-content {
        min-width: 650px;
        max-width: 800px;
        min-height: 400px;
        max-height: 70vh;
        padding: 24px !important;
        margin: 0 !important;
        overflow-y: auto;
      }

      .filters {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;
        align-items: flex-start;

        .search-field {
          flex: 1;
        }

        .filter-field {
          width: 160px;
          flex-shrink: 0;
        }
      }

      .loading {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 60px;
        min-height: 200px;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        color: #6b7280;
        min-height: 200px;

        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          opacity: 0.4;
          margin-bottom: 20px;
          color: #9ca3af;
        }

        p {
          font-size: 1rem;
          margin: 0;
        }
      }

      .agent-list {
        max-height: 400px;
        overflow-y: auto;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background-color: #fff;
      }

      mat-list-option {
        height: auto !important;
        padding: 12px 16px !important;
        border-bottom: 1px solid #f3f4f6;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background-color: #f8fafc;
        }
      }

      .agent-item {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        padding: 8px 0;
        width: 100%;
      }

      .agent-icon {
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        flex-shrink: 0;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

        i {
          font-size: 22px;
          color: white;
        }
      }

      .agent-info {
        flex: 1;
        min-width: 0;
        padding-right: 8px;

        .agent-name {
          display: block;
          font-weight: 600;
          font-size: 15px;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .agent-description {
          display: block;
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
          margin-bottom: 10px;
          /* Permettre le retour à la ligne au lieu de tronquer */
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .agent-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;

          mat-chip {
            font-size: 11px;
            min-height: 24px;
            padding: 4px 10px;
            font-weight: 500;
            border-radius: 6px;
          }

          .status-draft {
            background-color: #fef3c7 !important;
            color: #d97706 !important;
          }
          .status-active {
            background-color: #d1fae5 !important;
            color: #059669 !important;
          }
          .status-beta {
            background-color: #dbeafe !important;
            color: #2563eb !important;
          }
          .status-disabled {
            background-color: #f3f4f6 !important;
            color: #6b7280 !important;
          }

          .agent-date {
            font-size: 12px;
            color: #9ca3af;
          }
        }
      }

      .pagination-info {
        text-align: center;
        padding: 16px;
        font-size: 13px;
        color: #6b7280;
        border-top: 1px solid #f3f4f6;
        background-color: #f9fafb;
        border-radius: 0 0 12px 12px;
        margin-top: -1px;
      }

      mat-dialog-actions {
        padding: 16px 24px !important;
        margin: 0 !important;
        border-top: 1px solid #e5e7eb;
        background-color: #f9fafb;
      }
    `,
  ],
})
export class AgentListDialogComponent implements OnInit {
  agents: AgentDefinition[] = [];
  totalAgents = 0;
  isLoading = false;
  searchQuery = '';
  statusFilter: AgentStatus | null = null;

  constructor(
    private dialogRef: MatDialogRef<AgentListDialogComponent>,
    private agentBuilderService: AgentBuilderService
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents(): void {
    this.isLoading = true;
    this.agentBuilderService
      .listAgents({
        search: this.searchQuery || undefined,
        status: this.statusFilter || undefined,
        pageSize: 50,
      })
      .subscribe({
        next: (response) => {
          this.agents = response.agents;
          this.totalAgents = response.total;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load agents:', error);
          this.isLoading = false;
        },
      });
  }

  selectAgent(agent: AgentDefinition): void {
    this.dialogRef.close(agent);
  }
}
