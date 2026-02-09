import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { DEFAULT_ROLES, DEFAULT_PERMISSIONS } from '../models/user.model';

/**
 * Service de gestion des rôles et permissions
 *
 * Synchronisé avec AuthService pour la gestion des utilisateurs
 */
@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private userRoles: string[] = [];
  private userPermissions: string[] = [];
  private userProfile: any = null;
  private readonly STORAGE_KEY_USERS = 'app_users';
  private readonly STORAGE_KEY_ROLES = 'app_roles';

  constructor(private authService: AuthService) {
    this.loadRolesFromStorage();

    // S'abonner aux changements d'utilisateur
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userRoles = user.roles;
        this.userProfile = {
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        };
        // Compute permissions from roles
        this.computeUserPermissions(user.id);
      } else {
        this.userRoles = [];
        this.userPermissions = [];
        this.userProfile = null;
      }
    });
  }

  /**
   * Compute user permissions from roles and direct permissions
   */
  private computeUserPermissions(userId: string): void {
    const permissions = new Set<string>();

    // Get roles configuration
    const storedRoles = localStorage.getItem(this.STORAGE_KEY_ROLES);
    const roles = storedRoles ? JSON.parse(storedRoles) : DEFAULT_ROLES;

    // Get user's direct permissions
    const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
    const users = storedUsers ? JSON.parse(storedUsers) : [];
    const user = users.find((u: any) => u.id === userId);

    // Special case: Admin role gets ALL permissions from DEFAULT_PERMISSIONS
    // This ensures admins always have access to new features without clearing localStorage
    if (this.userRoles.includes('admin')) {
      DEFAULT_PERMISSIONS.forEach(p => permissions.add(p.id));
    } else {
      // Add permissions from each role
      for (const roleId of this.userRoles) {
        const role = roles.find((r: any) => r.id === roleId);
        if (role && role.permissions) {
          role.permissions.forEach((p: string) => permissions.add(p));
        }
      }
    }

    // Add user's direct permissions
    if (user && user.permissions) {
      user.permissions.forEach((p: string) => permissions.add(p));
    }

    this.userPermissions = Array.from(permissions);
    localStorage.setItem('user_permissions', JSON.stringify(this.userPermissions));
  }

  private loadRolesFromStorage(): void {
    try {
      const storedRoles = localStorage.getItem('user_roles');
      if (storedRoles) {
        this.userRoles = JSON.parse(storedRoles);
      }

      const storedPermissions = localStorage.getItem('user_permissions');
      if (storedPermissions) {
        this.userPermissions = JSON.parse(storedPermissions);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      this.userRoles = [];
      this.userPermissions = [];
    }
  }

  setUserRoles(roles: string[]): void {
    this.userRoles = roles;
    localStorage.setItem('user_roles', JSON.stringify(this.userRoles));
  }

  hasRole(role: string): boolean {
    return this.userRoles.includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  hasAllRoles(roles: string[]): boolean {
    return roles.every(role => this.hasRole(role));
  }

  getUserRoles(): string[] {
    return [...this.userRoles];
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string): boolean {
    return this.userPermissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  /**
   * Get user's computed permissions
   */
  getUserPermissions(): string[] {
    return [...this.userPermissions];
  }

  async getUserProfile(): Promise<any> {
    if (this.userProfile) {
      return this.userProfile;
    }

    // Essayer de charger depuis localStorage
    const stored = localStorage.getItem('user_profile');
    if (stored) {
      try {
        this.userProfile = JSON.parse(stored);
        return this.userProfile;
      } catch {
        return null;
      }
    }

    return null;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.userRoles = [];
    this.userPermissions = [];
    this.userProfile = null;
    localStorage.removeItem('user_permissions');
    this.authService.logout();
  }
}
