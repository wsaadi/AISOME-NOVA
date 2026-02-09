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

interface StoredUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string; // Format: "sha256$salt$hash"
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

interface SessionData {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
}

/**
 * Service d'authentification renforcé
 *
 * Gère la connexion/déconnexion des utilisateurs avec :
 * - Hachage SHA-256 des mots de passe (Web Crypto API)
 * - Jetons de session avec expiration (24h)
 * - Stockage de session dans sessionStorage
 * - Limitation du taux de tentatives de connexion
 * - Compatibilité avec RoleService
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY_SESSION = 'auth_session';
  private readonly STORAGE_KEY_USERS = 'app_users';
  private readonly STORAGE_KEY_ATTEMPTS = 'login_attempts';

  private readonly SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ATTEMPTS = 5;
  private readonly ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  private initialized = false;

  constructor(private router: Router) {
    this.init();
  }

  /**
   * Async initialization: hash default passwords and load session
   */
  private async init(): Promise<void> {
    this.loadCurrentSession();
    await this.ensureDefaultUsers();
    this.initialized = true;
  }

  // ─── Crypto helpers ───────────────────────────────────────────

  /**
   * Generate a random hex salt (32 bytes / 64 hex chars)
   */
  private generateSalt(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash a password with SHA-256 using the given salt.
   * Returns the hex digest.
   */
  private async sha256(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Produce a storable password string: "sha256$<salt>$<hash>"
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = this.generateSalt();
    const hash = await this.sha256(password, salt);
    return `sha256$${salt}$${hash}`;
  }

  /**
   * Verify a plain-text password against a stored "sha256$salt$hash" string.
   */
  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split('$');
    if (parts.length !== 3 || parts[0] !== 'sha256') {
      // Legacy plain-text fallback: compare directly, then upgrade
      return password === stored;
    }
    const salt = parts[1];
    const expectedHash = parts[2];
    const actualHash = await this.sha256(password, salt);
    return actualHash === expectedHash;
  }

  // ─── Session token helpers ────────────────────────────────────

  /**
   * Generate a cryptographically strong session token
   */
  private generateSessionToken(): string {
    const uuid = crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const extra = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${uuid}-${extra}`;
  }

  // ─── Session management ───────────────────────────────────────

  /**
   * Load the current session from sessionStorage (not localStorage)
   */
  private loadCurrentSession(): void {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY_SESSION);
      if (!raw) {
        this.currentUserSubject.next(null);
        return;
      }

      const session: SessionData = JSON.parse(raw);

      // Check expiry
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return;
      }

      const user = session.user;
      this.currentUserSubject.next(user);

      // Sync with RoleService expected localStorage keys
      this.syncRoleServiceStorage(user);
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession();
    }
  }

  /**
   * Persist session to sessionStorage and sync localStorage keys for RoleService
   */
  private saveSession(user: AuthUser, token: string): void {
    const session: SessionData = {
      user,
      token,
      expiresAt: Date.now() + this.SESSION_DURATION_MS
    };
    sessionStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(session));

    // Sync localStorage items that RoleService reads
    this.syncRoleServiceStorage(user);
  }

  /**
   * Keep localStorage keys that RoleService and other services depend on
   */
  private syncRoleServiceStorage(user: AuthUser): void {
    localStorage.setItem('user_roles', JSON.stringify(user.roles));
    localStorage.setItem('user_profile', JSON.stringify({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }));
    localStorage.setItem('current_user', user.id);
  }

  /**
   * Remove all session data
   */
  private clearSession(): void {
    sessionStorage.removeItem(this.STORAGE_KEY_SESSION);
    localStorage.removeItem('user_roles');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('current_user');
    this.currentUserSubject.next(null);
  }

  // ─── Rate limiting ────────────────────────────────────────────

  /**
   * Get remaining lockout time in milliseconds for a username.
   * Returns 0 if the user is not locked out.
   */
  getRemainingLockoutMs(username: string): number {
    const attempts = this.getAttempts();
    const entry = attempts[username];
    if (!entry) return 0;

    const elapsed = Date.now() - entry.firstAttemptAt;
    if (elapsed > this.ATTEMPT_WINDOW_MS) {
      // Window expired, reset
      delete attempts[username];
      this.saveAttempts(attempts);
      return 0;
    }

    if (entry.count >= this.MAX_ATTEMPTS) {
      return this.ATTEMPT_WINDOW_MS - elapsed;
    }

    return 0;
  }

  /**
   * Check whether a username is currently rate-limited.
   */
  private isRateLimited(username: string): boolean {
    return this.getRemainingLockoutMs(username) > 0;
  }

  /**
   * Record a failed login attempt.
   */
  private recordFailedAttempt(username: string): void {
    const attempts = this.getAttempts();
    const entry = attempts[username];

    if (!entry || (Date.now() - entry.firstAttemptAt) > this.ATTEMPT_WINDOW_MS) {
      attempts[username] = { count: 1, firstAttemptAt: Date.now() };
    } else {
      entry.count++;
    }

    this.saveAttempts(attempts);
  }

  /**
   * Clear attempts for a username after successful login.
   */
  private clearAttempts(username: string): void {
    const attempts = this.getAttempts();
    delete attempts[username];
    this.saveAttempts(attempts);
  }

  private getAttempts(): Record<string, LoginAttempt> {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY_ATTEMPTS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveAttempts(attempts: Record<string, LoginAttempt>): void {
    sessionStorage.setItem(this.STORAGE_KEY_ATTEMPTS, JSON.stringify(attempts));
  }

  // ─── Default users ────────────────────────────────────────────

  /**
   * Ensure default admin and user accounts exist with hashed passwords.
   * Migrates legacy plain-text passwords to hashed format.
   */
  private async ensureDefaultUsers(): Promise<void> {
    const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
    let users: StoredUser[] = [];

    if (storedUsers) {
      try {
        users = JSON.parse(storedUsers);
      } catch {
        users = [];
      }
    }

    const adminExists = users.some(u => u.username === 'admin');
    const userExists = users.some(u => u.username === 'user');

    if (!adminExists) {
      const hashedAdminPw = await this.hashPassword('Admin@2024!');
      users.push({
        id: 'admin-001',
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'System',
        password: hashedAdminPw,
        roles: ['admin'],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (!userExists) {
      const hashedUserPw = await this.hashPassword('User@2024!');
      users.push({
        id: 'user-001',
        username: 'user',
        email: 'user@example.com',
        firstName: 'Standard',
        lastName: 'User',
        password: hashedUserPw,
        roles: ['user'],
        permissions: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Migrate any legacy plain-text passwords to hashed format
    for (const u of users) {
      if (!u.password.startsWith('sha256$')) {
        u.password = await this.hashPassword(u.password);
        u.updatedAt = new Date().toISOString();
      }
    }

    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
  }

  // ─── Public API ───────────────────────────────────────────────

  /**
   * Vérifie si l'utilisateur est connecté (session valide et not expired)
   */
  isLoggedIn(): boolean {
    const raw = sessionStorage.getItem(this.STORAGE_KEY_SESSION);
    if (!raw) return false;

    try {
      const session: SessionData = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return false;
      }
      return this.currentUserSubject.value !== null;
    } catch {
      return false;
    }
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
   * Connexion avec username et password.
   *
   * Returns true on success, or throws an error string on rate-limit.
   */
  async login(username: string, password: string): Promise<boolean> {
    // Rate limiting check
    if (this.isRateLimited(username)) {
      const remainMs = this.getRemainingLockoutMs(username);
      const remainMin = Math.ceil(remainMs / 60000);
      throw new Error(`RATE_LIMITED:${remainMin}`);
    }

    try {
      const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
      if (!storedUsers) {
        this.recordFailedAttempt(username);
        return false;
      }

      const users: StoredUser[] = JSON.parse(storedUsers);
      const user = users.find(u => u.username === username && u.isActive);

      if (!user) {
        this.recordFailedAttempt(username);
        return false;
      }

      const passwordValid = await this.verifyPassword(password, user.password);
      if (!passwordValid) {
        this.recordFailedAttempt(username);
        return false;
      }

      // Successful login
      this.clearAttempts(username);

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles
      };

      const token = this.generateSessionToken();
      this.saveSession(authUser, token);

      // Update lastLogin
      user.lastLogin = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));

      // Emit user
      this.currentUserSubject.next(authUser);

      return true;
    } catch (error) {
      // Re-throw rate limit errors so the component can handle them
      if (error instanceof Error && error.message.startsWith('RATE_LIMITED:')) {
        throw error;
      }
      console.error('Login error:', error);
      return false;
    }
  }

  /**
   * Déconnexion
   */
  logout(): void {
    this.clearSession();
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

  /**
   * Change the password for the currently logged-in user.
   *
   * @param currentPassword - the user's current password (for verification)
   * @param newPassword - the new password to set
   * @returns true if the password was changed successfully
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) return false;

    try {
      const storedUsers = localStorage.getItem(this.STORAGE_KEY_USERS);
      if (!storedUsers) return false;

      const users: StoredUser[] = JSON.parse(storedUsers);
      const user = users.find(u => u.id === currentUser.id);
      if (!user) return false;

      // Verify current password
      const valid = await this.verifyPassword(currentPassword, user.password);
      if (!valid) return false;

      // Hash and store new password
      user.password = await this.hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();

      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }
}
