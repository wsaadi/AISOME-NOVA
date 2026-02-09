import { Component, Inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { Role, Permission } from '../../core/models/user.model';

export interface RoleDialogData {
  mode: 'create' | 'edit';
  role?: Role;
  permissions: Permission[];
}

export interface RoleDialogResult {
  name: string;
  description: string;
  permissions: string[];
}

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatDialogModule,
    MatIconModule,
    CustomButtonComponent
  ],
  template: `
    <div class="role-dialog">
      <div class="dialog-header">
        <h2>{{ (data.mode === 'create' ? 'user_management.dialog.create_role' : 'user_management.dialog.edit_role') | translate }}</h2>
        <button class="close-btn" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <!-- Basic Info -->
        <div class="form-section">
          <h3>{{ 'user_management.dialog.role_info' | translate }}</h3>

          <div class="form-group">
            <label for="roleName">{{ 'user_management.form.role_name' | translate }} *</label>
            <input
              type="text"
              id="roleName"
              [(ngModel)]="formData.name"
              [placeholder]="'user_management.form.role_name_placeholder' | translate"
              [disabled]="!!data.role?.isSystem"
              required
            />
            @if (data.role?.isSystem) {
              <p class="help-text">{{ 'user_management.form.system_role_name_readonly' | translate }}</p>
            }
          </div>

          <div class="form-group">
            <label for="roleDescription">{{ 'user_management.form.role_description' | translate }}</label>
            <textarea
              id="roleDescription"
              [(ngModel)]="formData.description"
              [placeholder]="'user_management.form.role_description_placeholder' | translate"
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Permissions -->
        <div class="form-section">
          <h3>{{ 'user_management.dialog.role_permissions' | translate }}</h3>
          <p class="section-description">{{ 'user_management.dialog.role_permissions_description' | translate }}</p>

          <div class="quick-actions">
            <button class="quick-btn" (click)="selectAll()">
              {{ 'user_management.actions.select_all' | translate }}
            </button>
            <button class="quick-btn" (click)="deselectAll()">
              {{ 'user_management.actions.deselect_all' | translate }}
            </button>
          </div>

          @for (category of permissionCategories(); track category) {
            <div class="permission-category">
              <div class="category-header" (click)="toggleCategory(category)">
                <mat-icon>{{ isCategoryExpanded(category) ? 'expand_more' : 'chevron_right' }}</mat-icon>
                <span class="category-name">{{ getCategoryLabel(category) }}</span>
                <span class="category-count">
                  {{ getSelectedCountByCategory(category) }}/{{ getPermissionsByCategory(category).length }}
                </span>
                <button class="select-category-btn" (click)="toggleSelectAllCategory(category); $event.stopPropagation()">
                  {{ isCategoryAllSelected(category) ? ('user_management.actions.deselect_all' | translate) : ('user_management.actions.select_all' | translate) }}
                </button>
              </div>

              @if (isCategoryExpanded(category)) {
                <div class="permissions-grid">
                  @for (perm of getPermissionsByCategory(category); track perm.id) {
                    <label class="permission-item" [class.selected]="isPermissionSelected(perm.id)">
                      <input
                        type="checkbox"
                        [checked]="isPermissionSelected(perm.id)"
                        (change)="togglePermission(perm.id)"
                      />
                      <div class="permission-content">
                        <span class="permission-name">{{ perm.name }}</span>
                        <span class="permission-description">{{ perm.description }}</span>
                      </div>
                    </label>
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>

      <div class="dialog-footer">
        <div class="selected-count">
          {{ formData.permissions.length }} {{ 'user_management.permissions_selected' | translate }}
        </div>
        <div class="footer-actions">
          <app-custom-button
            variant="secondary"
            [label]="'common.cancel' | translate"
            (click)="cancel()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            [label]="(data.mode === 'create' ? 'user_management.actions.create_role' : 'common.save') | translate"
            [disabled]="!isValid()"
            (click)="save()"
          ></app-custom-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .role-dialog {
      min-width: 550px;
      max-width: 650px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;

        &:hover {
          background: var(--hover-bg);
        }
      }
    }

    .dialog-content {
      padding: 24px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .form-section {
      margin-bottom: 28px;

      &:last-child {
        margin-bottom: 0;
      }

      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .section-description {
        margin: -8px 0 16px 0;
        font-size: 13px;
        color: var(--text-secondary);
      }
    }

    .form-group {
      margin-bottom: 16px;

      label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
      }

      input[type="text"],
      textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-primary);
        background: var(--card-bg);
        box-sizing: border-box;
        font-family: inherit;

        &:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        &::placeholder {
          color: var(--text-secondary);
        }
      }

      textarea {
        resize: vertical;
        min-height: 80px;
      }

      .help-text {
        margin: 6px 0 0 0;
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;

      .quick-btn {
        padding: 6px 12px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--card-bg);
        color: var(--text-secondary);
        font-size: 12px;
        cursor: pointer;

        &:hover {
          background: var(--hover-bg);
          color: var(--text-primary);
        }
      }
    }

    .permission-category {
      margin-bottom: 8px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      overflow: hidden;

      .category-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: var(--surface-variant);
        cursor: pointer;
        user-select: none;

        &:hover {
          background: var(--hover-bg);
        }

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: var(--text-secondary);
        }

        .category-name {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }

        .category-count {
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--card-bg);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .select-category-btn {
          padding: 4px 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: var(--card-bg);
          color: var(--text-secondary);
          font-size: 11px;
          cursor: pointer;

          &:hover {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
          }
        }
      }

      .permissions-grid {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
    }

    .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: var(--hover-bg);
      }

      &.selected {
        border-color: var(--primary-color);
        background: rgba(59, 130, 246, 0.05);
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--primary-color);
        margin-top: 2px;
      }

      .permission-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .permission-name {
          font-weight: 500;
          font-size: 13px;
          color: var(--text-primary);
        }

        .permission-description {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }
    }

    .dialog-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);

      .selected-count {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .footer-actions {
        display: flex;
        gap: 12px;
      }
    }

    :host {
      --text-primary: #1a1a2e;
      --text-secondary: #6b7280;
      --card-bg: #ffffff;
      --surface-variant: #f8fafc;
      --border-color: #e5e7eb;
      --hover-bg: rgba(0, 0, 0, 0.04);
      --primary-color: #3b82f6;
    }

    :host-context(.dark-theme) {
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --card-bg: #1f2937;
      --surface-variant: #111827;
      --border-color: #374151;
      --hover-bg: rgba(255, 255, 255, 0.05);
      --primary-color: #60a5fa;
    }
  `]
})
export class RoleDialogComponent {
  expandedCategories = signal<Set<string>>(new Set(['agents', 'admin', 'tools', 'system']));

  formData: RoleDialogResult;

  permissionCategories = computed(() => {
    const categories = new Set<string>();
    this.data.permissions.forEach(p => categories.add(p.category));
    return Array.from(categories);
  });

  constructor(
    public dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoleDialogData,
    private translate: TranslateService
  ) {
    // Initialize form data
    if (data.mode === 'edit' && data.role) {
      this.formData = {
        name: data.role.name,
        description: data.role.description,
        permissions: [...data.role.permissions]
      };
    } else {
      this.formData = {
        name: '',
        description: '',
        permissions: []
      };
    }
  }

  isCategoryExpanded(category: string): boolean {
    return this.expandedCategories().has(category);
  }

  toggleCategory(category: string): void {
    const expanded = new Set(this.expandedCategories());
    if (expanded.has(category)) {
      expanded.delete(category);
    } else {
      expanded.add(category);
    }
    this.expandedCategories.set(expanded);
  }

  isPermissionSelected(permId: string): boolean {
    return this.formData.permissions.includes(permId);
  }

  togglePermission(permId: string): void {
    const index = this.formData.permissions.indexOf(permId);
    if (index === -1) {
      this.formData.permissions.push(permId);
    } else {
      this.formData.permissions.splice(index, 1);
    }
  }

  getPermissionsByCategory(category: string): Permission[] {
    return this.data.permissions.filter(p => p.category === category);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'agents': this.translate.instant('user_management.permission_categories.agents'),
      'admin': this.translate.instant('user_management.permission_categories.admin'),
      'tools': this.translate.instant('user_management.permission_categories.tools'),
      'system': this.translate.instant('user_management.permission_categories.system')
    };
    return labels[category] || category;
  }

  getSelectedCountByCategory(category: string): number {
    const categoryPerms = this.getPermissionsByCategory(category);
    return categoryPerms.filter(p => this.isPermissionSelected(p.id)).length;
  }

  isCategoryAllSelected(category: string): boolean {
    const categoryPerms = this.getPermissionsByCategory(category);
    return categoryPerms.every(p => this.isPermissionSelected(p.id));
  }

  toggleSelectAllCategory(category: string): void {
    const categoryPerms = this.getPermissionsByCategory(category);
    const allSelected = this.isCategoryAllSelected(category);

    if (allSelected) {
      // Deselect all in category
      categoryPerms.forEach(p => {
        const index = this.formData.permissions.indexOf(p.id);
        if (index !== -1) {
          this.formData.permissions.splice(index, 1);
        }
      });
    } else {
      // Select all in category
      categoryPerms.forEach(p => {
        if (!this.isPermissionSelected(p.id)) {
          this.formData.permissions.push(p.id);
        }
      });
    }
  }

  selectAll(): void {
    this.formData.permissions = this.data.permissions.map(p => p.id);
  }

  deselectAll(): void {
    this.formData.permissions = [];
  }

  isValid(): boolean {
    return !!this.formData.name.trim();
  }

  save(): void {
    if (this.isValid()) {
      this.dialogRef.close(this.formData);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
