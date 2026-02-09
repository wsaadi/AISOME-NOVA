import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { UserManagementService } from '../../core/services/user-management.service';
import {
  User,
  Role,
  Permission,
  CreateUserDto,
  UpdateUserDto,
  DEFAULT_PERMISSIONS
} from '../../core/models/user.model';
import { UserDialogComponent, UserDialogData, UserDialogResult } from './user-dialog.component';
import { RoleDialogComponent, RoleDialogData, RoleDialogResult } from './role-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatMenuModule,
    CustomButtonComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Tab state
  activeTab = signal<'users' | 'roles'>('users');

  // Data
  users = signal<User[]>([]);
  roles = signal<Role[]>([]);
  permissions = signal<Permission[]>(DEFAULT_PERMISSIONS);

  // Search/filter
  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  roleFilter = signal<string>('all');

  // Computed filtered users
  filteredUsers = computed(() => {
    let result = this.users();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const roleF = this.roleFilter();

    if (query) {
      result = result.filter(u =>
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query)
      );
    }

    if (status !== 'all') {
      result = result.filter(u => status === 'active' ? u.isActive : !u.isActive);
    }

    if (roleF !== 'all') {
      result = result.filter(u => u.roles.includes(roleF));
    }

    return result;
  });

  // Loading state
  isLoading = signal(false);

  constructor(
    private userService: UserManagementService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    this.isLoading.set(true);

    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.users.set(users);
        this.isLoading.set(false);
      });

    this.userService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.roles.set(roles);
      });
  }

  setActiveTab(tab: 'users' | 'roles'): void {
    this.activeTab.set(tab);
  }

  // ==================== USER ACTIONS ====================

  openCreateUserDialog(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '600px',
      data: {
        mode: 'create',
        roles: this.roles(),
        permissions: this.permissions()
      } as UserDialogData
    });

    dialogRef.afterClosed().subscribe((result: UserDialogResult | undefined) => {
      if (result) {
        this.createUser(result);
      }
    });
  }

  openEditUserDialog(user: User): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        user,
        roles: this.roles(),
        permissions: this.permissions()
      } as UserDialogData
    });

    dialogRef.afterClosed().subscribe((result: UserDialogResult | undefined) => {
      if (result) {
        this.updateUser(user.id, result);
      }
    });
  }

  createUser(data: UserDialogResult): void {
    const dto: CreateUserDto = {
      username: data.username,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      roles: data.roles,
      permissions: data.permissions,
      isActive: data.isActive
    };

    this.userService.createUser(dto).subscribe({
      next: () => {
        this.showSuccess('user_management.messages.user_created');
      },
      error: () => {
        this.showError('user_management.messages.create_error');
      }
    });
  }

  updateUser(id: string, data: UserDialogResult): void {
    const dto: UpdateUserDto = {
      username: data.username,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      password: data.password,
      roles: data.roles,
      permissions: data.permissions,
      isActive: data.isActive
    };

    this.userService.updateUser(id, dto).subscribe({
      next: () => {
        this.showSuccess('user_management.messages.user_updated');
      },
      error: () => {
        this.showError('user_management.messages.update_error');
      }
    });
  }

  toggleUserStatus(user: User): void {
    this.userService.toggleUserActive(user.id).subscribe({
      next: () => {
        const msgKey = user.isActive
          ? 'user_management.messages.user_deactivated'
          : 'user_management.messages.user_activated';
        this.showSuccess(msgKey);
      },
      error: () => {
        this.showError('user_management.messages.update_error');
      }
    });
  }

  deleteUser(user: User): void {
    const confirmMsg = this.translate.instant('user_management.confirm.delete_user', { username: user.username });
    if (!confirm(confirmMsg)) {
      return;
    }

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.showSuccess('user_management.messages.user_deleted');
      },
      error: () => {
        this.showError('user_management.messages.delete_error');
      }
    });
  }

  // ==================== ROLE ACTIONS ====================

  openCreateRoleDialog(): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '600px',
      data: {
        mode: 'create',
        permissions: this.permissions()
      } as RoleDialogData
    });

    dialogRef.afterClosed().subscribe((result: RoleDialogResult | undefined) => {
      if (result) {
        this.createRole(result);
      }
    });
  }

  openEditRoleDialog(role: Role): void {
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      width: '600px',
      data: {
        mode: 'edit',
        role,
        permissions: this.permissions()
      } as RoleDialogData
    });

    dialogRef.afterClosed().subscribe((result: RoleDialogResult | undefined) => {
      if (result) {
        this.updateRole(role.id, result);
      }
    });
  }

  createRole(data: RoleDialogResult): void {
    this.userService.createRole({
      name: data.name,
      description: data.description,
      permissions: data.permissions
    }).subscribe({
      next: () => {
        this.showSuccess('user_management.messages.role_created');
      },
      error: () => {
        this.showError('user_management.messages.create_error');
      }
    });
  }

  updateRole(id: string, data: RoleDialogResult): void {
    this.userService.updateRole(id, {
      name: data.name,
      description: data.description,
      permissions: data.permissions
    }).subscribe({
      next: () => {
        this.showSuccess('user_management.messages.role_updated');
      },
      error: () => {
        this.showError('user_management.messages.update_error');
      }
    });
  }

  deleteRole(role: Role): void {
    if (role.isSystem) {
      this.showError('user_management.messages.cannot_delete_system_role');
      return;
    }

    const confirmMsg = this.translate.instant('user_management.confirm.delete_role', { name: role.name });
    if (!confirm(confirmMsg)) {
      return;
    }

    this.userService.deleteRole(role.id).subscribe({
      next: (success) => {
        if (success) {
          this.showSuccess('user_management.messages.role_deleted');
        } else {
          this.showError('user_management.messages.delete_error');
        }
      },
      error: () => {
        this.showError('user_management.messages.delete_error');
      }
    });
  }

  // ==================== HELPERS ====================

  getRoleName(roleId: string): string {
    const role = this.roles().find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  getUserRolesDisplay(user: User): string {
    return user.roles.map(r => this.getRoleName(r)).join(', ');
  }

  getPermissionCount(role: Role): number {
    return role.permissions.length;
  }

  getUsersWithRole(roleId: string): number {
    return this.users().filter(u => u.roles.includes(roleId)).length;
  }

  private showSuccess(key: string): void {
    const message = this.translate.instant(key);
    this.snackBar.open(message, this.translate.instant('common.close'), {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(key: string): void {
    const message = this.translate.instant(key);
    this.snackBar.open(message, this.translate.instant('common.close'), {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
