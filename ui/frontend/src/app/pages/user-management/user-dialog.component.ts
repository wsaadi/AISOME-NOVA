import { Component, Inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { User, Role, Permission } from '../../core/models/user.model';

export interface UserDialogData {
  mode: 'create' | 'edit';
  user?: User;
  roles: Role[];
  permissions: Permission[];
}

export interface UserDialogResult {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule,
    CustomButtonComponent
  ],
  template: `
    <div class="user-dialog">
      <div class="dialog-header">
        <h2>{{ (data.mode === 'create' ? 'user_management.dialog.create_user' : 'user_management.dialog.edit_user') | translate }}</h2>
        <button class="close-btn" (click)="cancel()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <!-- Tabs -->
        <div class="dialog-tabs">
          <button [class.active]="activeTab() === 'info'" (click)="activeTab.set('info')">
            {{ 'user_management.dialog.tab_info' | translate }}
          </button>
          <button [class.active]="activeTab() === 'roles'" (click)="activeTab.set('roles')">
            {{ 'user_management.dialog.tab_roles' | translate }}
          </button>
          <button [class.active]="activeTab() === 'permissions'" (click)="activeTab.set('permissions')">
            {{ 'user_management.dialog.tab_permissions' | translate }}
          </button>
        </div>

        <!-- Info Tab -->
        @if (activeTab() === 'info') {
          <div class="tab-panel">
            <div class="form-row">
              <div class="form-group">
                <label for="username">{{ 'user_management.form.username' | translate }} *</label>
                <input
                  type="text"
                  id="username"
                  [(ngModel)]="formData.username"
                  [placeholder]="'user_management.form.username_placeholder' | translate"
                  required
                />
              </div>
              <div class="form-group">
                <label for="email">{{ 'user_management.form.email' | translate }} *</label>
                <input
                  type="email"
                  id="email"
                  [(ngModel)]="formData.email"
                  [placeholder]="'user_management.form.email_placeholder' | translate"
                  required
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="firstName">{{ 'user_management.form.first_name' | translate }} *</label>
                <input
                  type="text"
                  id="firstName"
                  [(ngModel)]="formData.firstName"
                  [placeholder]="'user_management.form.first_name_placeholder' | translate"
                  required
                />
              </div>
              <div class="form-group">
                <label for="lastName">{{ 'user_management.form.last_name' | translate }} *</label>
                <input
                  type="text"
                  id="lastName"
                  [(ngModel)]="formData.lastName"
                  [placeholder]="'user_management.form.last_name_placeholder' | translate"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label for="password">
                {{ 'user_management.form.password' | translate }}
                @if (data.mode === 'create') { * }
              </label>
              <div class="password-wrapper">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="formData.password"
                  [placeholder]="(data.mode === 'edit' ? 'user_management.form.password_placeholder_edit' : 'user_management.form.password_placeholder') | translate"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-password" (click)="togglePasswordVisibility()">
                  <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
              @if (data.mode === 'edit') {
                <p class="help-text">{{ 'user_management.form.password_help_edit' | translate }}</p>
              }
            </div>

            <div class="form-group">
              <label class="toggle-label">
                <input type="checkbox" [(ngModel)]="formData.isActive" />
                <span class="toggle-text">{{ 'user_management.form.is_active' | translate }}</span>
              </label>
              <p class="help-text">{{ 'user_management.form.is_active_help' | translate }}</p>
            </div>
          </div>
        }

        <!-- Roles Tab -->
        @if (activeTab() === 'roles') {
          <div class="tab-panel">
            <p class="panel-description">{{ 'user_management.dialog.roles_description' | translate }}</p>

            <div class="roles-list">
              @for (role of data.roles; track role.id) {
                <label class="role-item" [class.selected]="isRoleSelected(role.id)">
                  <input
                    type="checkbox"
                    [checked]="isRoleSelected(role.id)"
                    (change)="toggleRole(role.id)"
                  />
                  <div class="role-content">
                    <div class="role-header">
                      <span class="role-name">{{ role.name }}</span>
                      @if (role.isSystem) {
                        <span class="system-badge">{{ 'user_management.system_role' | translate }}</span>
                      }
                    </div>
                    <p class="role-description">{{ role.description }}</p>
                    <span class="role-permissions-count">
                      {{ role.permissions.length }} {{ 'user_management.permissions' | translate }}
                    </span>
                  </div>
                </label>
              }
            </div>
          </div>
        }

        <!-- Permissions Tab -->
        @if (activeTab() === 'permissions') {
          <div class="tab-panel">
            <p class="panel-description">{{ 'user_management.dialog.permissions_description' | translate }}</p>

            @for (category of permissionCategories(); track category) {
              <div class="permission-category">
                <h4>{{ getCategoryLabel(category) }}</h4>
                <div class="permissions-grid">
                  @for (perm of getPermissionsByCategory(category); track perm.id) {
                    <label class="permission-item" [class.selected]="isPermissionSelected(perm.id)" [class.inherited]="isPermissionInherited(perm.id)">
                      <input
                        type="checkbox"
                        [checked]="isPermissionSelected(perm.id) || isPermissionInherited(perm.id)"
                        [disabled]="isPermissionInherited(perm.id)"
                        (change)="togglePermission(perm.id)"
                      />
                      <div class="permission-content">
                        <span class="permission-name">{{ perm.name }}</span>
                        <span class="permission-description">{{ perm.description }}</span>
                        @if (isPermissionInherited(perm.id)) {
                          <span class="inherited-badge">{{ 'user_management.inherited_from_role' | translate }}</span>
                        }
                      </div>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <div class="dialog-footer">
        <app-custom-button
          variant="secondary"
          [label]="'common.cancel' | translate"
          (click)="cancel()"
        ></app-custom-button>
        <app-custom-button
          variant="primary"
          [label]="(data.mode === 'create' ? 'user_management.actions.create_user' : 'common.save') | translate"
          [disabled]="!isValid()"
          (click)="save()"
        ></app-custom-button>
      </div>
    </div>
  `,
  styles: [`
    .user-dialog {
      min-width: 500px;
      max-width: 600px;
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
      padding: 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    .dialog-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-color);
      padding: 0 24px;

      button {
        padding: 12px 16px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;

        &:hover {
          color: var(--text-primary);
        }

        &.active {
          color: var(--primary-color);
          border-bottom-color: var(--primary-color);
        }
      }
    }

    .tab-panel {
      padding: 24px;
    }

    .panel-description {
      margin: 0 0 20px 0;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      margin-bottom: 20px;

      label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
      }

      input[type="text"],
      input[type="email"],
      input[type="password"] {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-primary);
        background: var(--card-bg);
        box-sizing: border-box;

        &:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        &::placeholder {
          color: var(--text-secondary);
        }
      }

      .password-wrapper {
        position: relative;
        display: flex;
        align-items: center;

        input {
          padding-right: 44px;
        }

        .toggle-password {
          position: absolute;
          right: 8px;
          background: transparent;
          border: none;
          padding: 6px;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;

          &:hover {
            background: var(--hover-bg);
            color: var(--primary-color);
          }

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
          }
        }
      }

      .help-text {
        margin: 6px 0 0 0;
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color);
      }

      .toggle-text {
        font-weight: 500;
      }
    }

    .roles-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .role-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
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
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color);
        margin-top: 2px;
      }

      .role-content {
        flex: 1;

        .role-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;

          .role-name {
            font-weight: 600;
            color: var(--text-primary);
          }

          .system-badge {
            padding: 2px 6px;
            background: var(--primary-color);
            color: white;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
        }

        .role-description {
          margin: 0 0 6px 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .role-permissions-count {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }
    }

    .permission-category {
      margin-bottom: 24px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .permissions-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(.inherited) {
        background: var(--hover-bg);
      }

      &.selected {
        border-color: var(--primary-color);
        background: rgba(59, 130, 246, 0.05);
      }

      &.inherited {
        opacity: 0.7;
        cursor: not-allowed;
        background: var(--surface-variant);
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

        .inherited-badge {
          display: inline-block;
          margin-top: 4px;
          padding: 2px 6px;
          background: var(--surface-variant);
          border-radius: 4px;
          font-size: 10px;
          color: var(--text-secondary);
        }
      }
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
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
export class UserDialogComponent {
  activeTab = signal<'info' | 'roles' | 'permissions'>('info');
  showPassword = signal(false);

  formData: UserDialogResult;

  permissionCategories = computed(() => {
    const categories = new Set<string>();
    this.data.permissions.forEach(p => categories.add(p.category));
    return Array.from(categories);
  });

  constructor(
    public dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
    private translate: TranslateService
  ) {
    // Initialize form data
    if (data.mode === 'edit' && data.user) {
      this.formData = {
        username: data.user.username,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        password: '',
        roles: [...data.user.roles],
        permissions: [...data.user.permissions],
        isActive: data.user.isActive
      };
    } else {
      this.formData = {
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        roles: ['user'],
        permissions: [],
        isActive: true
      };
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  isRoleSelected(roleId: string): boolean {
    return this.formData.roles.includes(roleId);
  }

  toggleRole(roleId: string): void {
    const index = this.formData.roles.indexOf(roleId);
    if (index === -1) {
      this.formData.roles.push(roleId);
    } else {
      this.formData.roles.splice(index, 1);
    }
  }

  isPermissionSelected(permId: string): boolean {
    return this.formData.permissions.includes(permId);
  }

  isPermissionInherited(permId: string): boolean {
    return this.formData.roles.some(roleId => {
      const role = this.data.roles.find(r => r.id === roleId);
      return role?.permissions.includes(permId) || false;
    });
  }

  togglePermission(permId: string): void {
    if (this.isPermissionInherited(permId)) return;

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

  isValid(): boolean {
    const baseValid = !!(
      this.formData.username.trim() &&
      this.formData.email.trim() &&
      this.formData.firstName.trim() &&
      this.formData.lastName.trim()
    );

    // Password required only for new users
    if (this.data.mode === 'create') {
      return baseValid && !!(this.formData.password && this.formData.password.trim());
    }

    return baseValid;
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
