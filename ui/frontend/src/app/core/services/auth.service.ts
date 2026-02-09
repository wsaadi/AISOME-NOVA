import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

/**
 * Service d'authentification
 *
 * Gère la connexion/déconnexion des utilisateurs
 * avec intégration au UserManagementService
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY_AUTH = 'auth_user';
  private readonly STORAGE_KEY_USERS = 'app_users';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router) {
    this.loadCurrentUser();
    this.ensureDefaultUsers();
  }

  /**
   * Charge l'utilisateur courant depuis le localStorage
   */
  private loadCurrentUser(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_AUTH);
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUserSubject.next(user);
        // Sync with role service
        localStorage.setItem('user_roles', JSON.stringify(user.roles));
        localStorage.setItem('user_profile', JSON.stringify({
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }));
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      this.currentUserSubject.next(null);
    }
  }

  /**
   * S'assure que les utilisateurs par défaut existent
   */
  private ensureDefaultUsers(): void {
    const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
    let users: any[] = [];

    if (storedUsers) {
      try {
        users = JSON.parse(storedUsers);
      } catch {
        users = [];
      }
    }

    // Vérifier si admin existe
    const adminExists = users.some((u: any) => u.username === 'admin');

    if (!adminExists) {
      const defaultAdmin = {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'System',
        password: 'admin', // En production, utiliser un hash
        roles: ['admin'],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const defaultUser = {
        id: 'user-001',
        username: 'user',
        email: 'user@example.com',
        firstName: 'Standard',
        lastName: 'User',
        password: 'user',
        roles: ['user'],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      users = [defaultAdmin, defaultUser, ...users.filter((u: any) => u.username !== 'admin' && u.username !== 'user')];
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    }
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Observable pour vérifier l'authentification
   */
  isAuthenticated(): Observable<boolean> {
    return new Observable(observer => {
      observer.next(this.isLoggedIn());
      observer.complete();
    });
  }

  /**
   * Connexion avec username et password
   */
  async login(username: string, password: string): Promise<boolean> {
    try {
      const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
      if (!storedUsers) {
        return false;
      }

      const users: any[] = JSON.parse(storedUsers);
      const user = users.find(
        (u: any) => u.username === username && u.password === password && u.isActive
      );

      if (!user) {
        return false;
      }

      // Créer l'objet utilisateur sans le mot de passe
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      };

      // Sauvegarder dans localStorage
      localStorage.setItem(this.STORAGE_KEY_AUTH, JSON.stringify(authUser));
      localStorage.setItem('user_roles', JSON.stringify(user.roles));
      localStorage.setItem('user_profile', JSON.stringify({
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      }));
      localStorage.setItem('current_user', user.id);

      // Mettre à jour le lastLogin
      user.lastLogin = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));

      // Émettre l'utilisateur
      this.currentUserSubject.next(authUser);

      return true;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return false;
    }
  }

  /**
   * Déconnexion
   */
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY_AUTH);
    localStorage.removeItem('user_roles');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('current_user');

    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  /**
   * Obtenir l'utilisateur courant
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Vérifier si l'utilisateur a un rôle
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles.includes(role) ?? false;
  }

  /**
   * Vérifier si l'utilisateur a un des rôles
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }
}
