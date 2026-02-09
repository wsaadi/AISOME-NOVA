import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RoleService } from '../services/role.service';

/**
 * Guard d'authentification
 *
 * Vérifie que l'utilisateur est connecté et a les permissions/rôles requis
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const roleService = inject(RoleService);
  const router = inject(Router);

  // Vérifier si l'utilisateur est connecté
  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Vérifier les permissions si spécifiées dans les données de route
  const requiredPermissions = route.data['permissions'] as string[];
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = roleService.hasAnyPermission(requiredPermissions);
    if (!hasPermission) {
      router.navigate(['/unauthorized']);
      return false;
    }
  }

  // Vérifier les rôles si spécifiés dans les données de route
  const requiredRoles = route.data['roles'] as string[];
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = roleService.hasAnyRole(requiredRoles);
    if (!hasRole) {
      router.navigate(['/unauthorized']);
      return false;
    }
  }

  return true;
};
