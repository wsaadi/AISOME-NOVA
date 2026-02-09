import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CreateAgentRequest, AgentCategory } from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

@Component({
  selector: 'app-create-agent-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>add_circle</mat-icon>
      {{ 'agent_builder.dialog.create_title' | translate }}
    </h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="create-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'agent_builder.dialog.name' | translate }}</mat-label>
          <input matInput formControlName="name" [placeholder]="'agent_builder.dialog.name_placeholder' | translate" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>{{ 'agent_builder.dialog.name_required' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'agent_builder.dialog.description' | translate }}</mat-label>
          <textarea
            matInput
            formControlName="description"
            [placeholder]="'agent_builder.dialog.description_placeholder' | translate"
            rows="3"
          ></textarea>
          @if (form.get('description')?.hasError('required')) {
            <mat-error>{{ 'agent_builder.dialog.description_required' | translate }}</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'agent_builder.dialog.category' | translate }}</mat-label>
          <mat-select formControlName="category">
            @for (category of categories; track category.id) {
              <mat-option [value]="category.id">
                <i [class]="category.icon" class="category-icon"></i>
                {{ category.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div class="icon-selection">
          <label>{{ 'agent_builder.dialog.icon' | translate }}</label>
          <div class="icon-grid">
            @for (icon of icons; track icon) {
              <button
                type="button"
                class="icon-btn"
                [class.selected]="form.get('icon')?.value === icon"
                (click)="selectIcon(icon)"
              >
                <i [class]="icon"></i>
              </button>
            }
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="create()">
        <mat-icon>add</mat-icon>
        {{ 'agent_builder.dialog.create' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .create-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 400px;
      }

      .full-width {
        width: 100%;
      }

      .category-icon {
        margin-right: 8px;
      }

      .icon-selection {
        margin-top: 8px;

        label {
          display: block;
          margin-bottom: 12px;
          font-weight: 500;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .icon-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 8px;
      }

      .icon-btn {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;

        i {
          font-size: 18px;
          color: #666;
        }

        &:hover {
          border-color: #3f51b5;
        }

        &.selected {
          background-color: #3f51b5;
          border-color: #3f51b5;

          i {
            color: white;
          }
        }
      }
    `,
  ],
})
export class CreateAgentDialogComponent implements OnInit {
  form!: FormGroup;
  categories: AgentCategory[] = [];

  icons = [
    'fa fa-robot',
    'fa fa-brain',
    'fa fa-comments',
    'fa fa-file-alt',
    'fa fa-chart-line',
    'fa fa-search',
    'fa fa-cogs',
    'fa fa-database',
    'fa fa-envelope',
    'fa fa-calendar',
    'fa fa-users',
    'fa fa-shopping-cart',
    'fa fa-truck',
    'fa fa-shield-alt',
    'fa fa-code',
    'fa fa-magic',
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateAgentDialogComponent>,
    private agentBuilderService: AgentBuilderService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', [Validators.required, Validators.minLength(1)]],
      category: ['custom'],
      icon: ['fa fa-robot'],
    });

    this.loadCategories();
  }

  private loadCategories(): void {
    this.agentBuilderService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: () => {
        this.categories = [
          { id: 'custom', name: 'Custom', icon: 'fa fa-robot' },
          { id: 'document_analysis', name: 'Document Analysis', icon: 'fa fa-file-alt' },
          { id: 'data_processing', name: 'Data Processing', icon: 'fa fa-database' },
          { id: 'communication', name: 'Communication', icon: 'fa fa-comments' },
          { id: 'analytics', name: 'Analytics', icon: 'fa fa-chart-line' },
        ];
      },
    });
  }

  selectIcon(icon: string): void {
    this.form.patchValue({ icon });
  }

  create(): void {
    if (this.form.valid) {
      const request: CreateAgentRequest = this.form.value;
      this.dialogRef.close(request);
    }
  }
}
