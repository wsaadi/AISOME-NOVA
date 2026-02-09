import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  User,
  Role,
  Permission,
  CreateUserDto,
  UpdateUserDto,
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLES,
  ROUTE_PERMISSIONS
} from '../models/user.model';

/**
 * Service de gestion des utilisateurs
 *
 * Fonctionne en mode local (localStorage) pour le développement
 * et peut se connecter à un backend quand il est disponible.
 */
@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private readonly STORAGE_KEY_USERS = 'app_users';
  private readonly STORAGE_KEY_ROLES = 'app_roles';
  private readonly STORAGE_KEY_CURRENT_USER = 'current_user';

  private usersSubject = new BehaviorSubject<User[]>([]);
  private rolesSubject = new BehaviorSubject<Role[]>([]);

  users$ = this.usersSubject.asObservable();
  roles$ = this.rolesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.initializeData();
  }

  /**
   * Initialize data from localStorage or defaults
   */
  private initializeData(): void {
    // Load or initialize roles
    const storedRoles = localStorage.getItem(this.STORAGE_KEY_ROLES);
    if (storedRoles) {
      try {
        this.rolesSubject.next(JSON.parse(storedRoles));
      } catch {
        this.rolesSubject.next(DEFAULT_ROLES);
        this.saveRoles();
      }
    } else {
      this.rolesSubject.next(DEFAULT_ROLES);
      this.saveRoles();
    }

    // Load or initialize users
    const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
    if (storedUsers) {
      try {
        this.usersSubject.next(JSON.parse(storedUsers));
      } catch {
        this.initializeDefaultUsers();
      }
    } else {
      this.initializeDefaultUsers();
    }
  }

  /**
   * Initialize default admin user
   */
  private initializeDefaultUsers(): void {
    const defaultAdmin: User = {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'System',
      roles: ['admin'],
      permissions: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const defaultUser: User = {
      id: 'user-001',
      username: 'user',
      email: 'user@example.com',
      firstName: 'Standard',
      lastName: 'User',
      roles: ['user'],
      permissions: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.usersSubject.next([defaultAdmin, defaultUser]);
    this.saveUsers();
  }

  /**
   * Save users to localStorage
   */
  private saveUsers(): void {
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(this.usersSubject.value));
  }

  /**
   * Save roles to localStorage
   */
  private saveRoles(): void {
    localStorage.setItem(this.STORAGE_KEY_ROLES, JSON.stringify(this.rolesSubject.value));
  }

  // ==================== USER OPERATIONS ====================

  /**
   * Get all users
   */
  getUsers(): Observable<User[]> {
    return this.users$;
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): Observable<User | undefined> {
    return this.users$.pipe(
      map(users => users.find(u => u.id === id))
    );
  }

  /**
   * Create a new user
   */
  createUser(dto: CreateUserDto): Observable<User> {
    const newUser: User = {
      id: this.generateId('user'),
      username: dto.username,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: dto.roles,
      permissions: dto.permissions || [],
      isActive: dto.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store with password in localStorage (password not exposed in User interface)
    const storedUsers = JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS) || '[]');
    const userWithPassword = { ...newUser, password: dto.password || '' };
    storedUsers.push(userWithPassword);
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(storedUsers));

    // Update subject without password
    const users = [...this.usersSubject.value, newUser];
    this.usersSubject.next(users);

    return of(newUser);
  }

  /**
   * Update an existing user
   */
  updateUser(id: string, dto: UpdateUserDto): Observable<User | null> {
    const users = this.usersSubject.value;
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
      return of(null);
    }

    // Update in localStorage (including password if provided)
    const storedUsers = JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS) || '[]');
    const storedIndex = storedUsers.findIndex((u: any) => u.id === id);

    if (storedIndex !== -1) {
      const { password, ...dtoWithoutPassword } = dto;
      storedUsers[storedIndex] = {
        ...storedUsers[storedIndex],
        ...dtoWithoutPassword,
        updatedAt: new Date().toISOString()
      };

      // Update password only if provided and not empty
      if (password && password.trim()) {
        storedUsers[storedIndex].password = password;
      }

      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(storedUsers));
    }

    // Update user in subject (without password)
    const { password: _, ...dtoForSubject } = dto;
    const updatedUser: User = {
      ...users[index],
      ...dtoForSubject,
      updatedAt: new Date().toISOString()
    };

    users[index] = updatedUser;
    this.usersSubject.next([...users]);

    return of(updatedUser);
  }

  /**
   * Delete a user
   */
  deleteUser(id: string): Observable<boolean> {
    const users = this.usersSubject.value.filter(u => u.id !== id);
    this.usersSubject.next(users);
    this.saveUsers();
    return of(true);
  }

  /**
   * Toggle user active status
   */
  toggleUserActive(id: string): Observable<User | null> {
    const users = this.usersSubject.value;
    const user = users.find(u => u.id === id);

    if (!user) {
      return of(null);
    }

    return this.updateUser(id, { isActive: !user.isActive });
  }

  // ==================== ROLE OPERATIONS ====================

  /**
   * Get all roles
   */
  getRoles(): Observable<Role[]> {
    return this.roles$;
  }

  /**
   * Get role by ID
   */
  getRoleById(id: string): Observable<Role | undefined> {
    return this.roles$.pipe(
      map(roles => roles.find(r => r.id === id))
    );
  }

  /**
   * Create a new role
   */
  createRole(role: Omit<Role, 'id'>): Observable<Role> {
    const newRole: Role = {
      ...role,
      id: this.generateId('role')
    };

    const roles = [...this.rolesSubject.value, newRole];
    this.rolesSubject.next(roles);
    this.saveRoles();

    return of(newRole);
  }

  /**
   * Update an existing role
   */
  updateRole(id: string, updates: Partial<Role>): Observable<Role | null> {
    const roles = this.rolesSubject.value;
    const index = roles.findIndex(r => r.id === id);

    if (index === -1) {
      return of(null);
    }

    // Cannot update system roles name/id
    const role = roles[index];
    if (role.isSystem && (updates.id || updates.name)) {
      delete updates.id;
      delete updates.name;
    }

    const updatedRole: Role = {
      ...role,
      ...updates
    };

    roles[index] = updatedRole;
    this.rolesSubject.next([...roles]);
    this.saveRoles();

    return of(updatedRole);
  }

  /**
   * Delete a role (non-system roles only)
   */
  deleteRole(id: string): Observable<boolean> {
    const role = this.rolesSubject.value.find(r => r.id === id);

    if (!role || role.isSystem) {
      return of(false);
    }

    const roles = this.rolesSubject.value.filter(r => r.id !== id);
    this.rolesSubject.next(roles);
    this.saveRoles();
    return of(true);
  }

  // ==================== PERMISSION OPERATIONS ====================

  /**
   * Get all available permissions
   */
  getPermissions(): Observable<Permission[]> {
    return of(DEFAULT_PERMISSIONS);
  }

  /**
   * Get permissions grouped by category
   */
  getPermissionsByCategory(): Observable<Map<string, Permission[]>> {
    const grouped = new Map<string, Permission[]>();

    DEFAULT_PERMISSIONS.forEach(permission => {
      const existing = grouped.get(permission.category) || [];
      grouped.set(permission.category, [...existing, permission]);
    });

    return of(grouped);
  }

  /**
   * Get effective permissions for a user (roles + direct permissions)
   */
  getUserEffectivePermissions(userId: string): Observable<string[]> {
    return this.getUserById(userId).pipe(
      map(user => {
        if (!user) return [];

        const permissions = new Set<string>(user.permissions);

        // Add permissions from roles
        const roles = this.rolesSubject.value;
        user.roles.forEach(roleId => {
          const role = roles.find(r => r.id === roleId);
          if (role) {
            role.permissions.forEach(p => permissions.add(p));
          }
        });

        return Array.from(permissions);
      })
    );
  }

  /**
   * Check if a user has a specific permission
   */
  userHasPermission(userId: string, permissionId: string): Observable<boolean> {
    return this.getUserEffectivePermissions(userId).pipe(
      map(permissions => permissions.includes(permissionId))
    );
  }

  /**
   * Get route permissions mapping
   */
  getRoutePermissions(): typeof ROUTE_PERMISSIONS {
    return ROUTE_PERMISSIONS;
  }

  // ==================== CURRENT USER OPERATIONS ====================

  /**
   * Set the current logged-in user
   */
  setCurrentUser(userId: string): void {
    localStorage.setItem(this.STORAGE_KEY_CURRENT_USER, userId);

    // Update role service with user's roles
    const user = this.usersSubject.value.find(u => u.id === userId);
    if (user) {
      localStorage.setItem('user_roles', JSON.stringify(user.roles));
      localStorage.setItem('user_profile', JSON.stringify({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }));
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return localStorage.getItem(this.STORAGE_KEY_CURRENT_USER);
  }

  /**
   * Get current user
   */
  getCurrentUser(): Observable<User | undefined> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of(undefined);
    }
    return this.getUserById(userId);
  }

  /**
   * Check if current user has a permission
   */
  currentUserHasPermission(permissionId: string): Observable<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return of(false);
    }
    return this.userHasPermission(userId, permissionId);
  }

  // ==================== UTILITY ====================

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if username is available
   */
  isUsernameAvailable(username: string, excludeUserId?: string): boolean {
    return !this.usersSubject.value.some(
      u => u.username.toLowerCase() === username.toLowerCase() && u.id !== excludeUserId
    );
  }

  /**
   * Check if email is available
   */
  isEmailAvailable(email: string, excludeUserId?: string): boolean {
    return !this.usersSubject.value.some(
      u => u.email.toLowerCase() === email.toLowerCase() && u.id !== excludeUserId
    );
  }
}
