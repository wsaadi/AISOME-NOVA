/**
 * Permission interface for granular access control
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'agents' | 'admin' | 'tools' | 'system';
}

/**
 * Role interface with associated permissions
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // Permission IDs
  isSystem?: boolean; // System roles cannot be deleted
}

/**
 * User interface
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[]; // Role IDs
  permissions: string[]; // Direct permission IDs (in addition to role permissions)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  avatar?: string;
}

/**
 * User creation DTO
 */
export interface CreateUserDto {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  roles: string[];
  permissions?: string[];
  isActive?: boolean;
}

/**
 * User update DTO
 */
export interface UpdateUserDto {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  roles?: string[];
  permissions?: string[];
  isActive?: boolean;
}

/**
 * Default permissions available in the system
 */
export const DEFAULT_PERMISSIONS: Permission[] = [
  // Agents permissions
  { id: 'agent:ai-chat', name: 'AI Chat', description: 'Accès à l\'assistant IA', category: 'agents' },
  { id: 'agent:document-analyzer', name: 'Analyse de documents', description: 'Accès à l\'analyse de documents', category: 'agents' },
  { id: 'agent:appointment-scheduler', name: 'Préparateur de RDV', description: 'Accès au préparateur de rendez-vous', category: 'agents' },
  { id: 'agent:dolibarr-stats', name: 'Stats Dolibarr', description: 'Accès aux statistiques Dolibarr', category: 'agents' },
  { id: 'agent:web-monitoring', name: 'Veille Web', description: 'Accès à la veille technologique', category: 'agents' },
  { id: 'agent:contract-analysis', name: 'Analyse de contrats', description: 'Accès à l\'analyse de contrats', category: 'agents' },
  { id: 'agent:pod-analyzer', name: 'Analyseur POD', description: 'Accès à l\'analyseur POD', category: 'agents' },
  { id: 'agent:agent-builder', name: 'Agent Builder', description: 'Accès au constructeur d\'agents', category: 'agents' },
  { id: 'agent:manage-own', name: 'Gérer ses agents', description: 'Publier/masquer ses propres agents', category: 'agents' },

  // Admin permissions
  { id: 'admin:settings', name: 'Paramètres', description: 'Accès aux paramètres généraux', category: 'admin' },
  { id: 'admin:moderation', name: 'Modération', description: 'Accès aux paramètres de modération', category: 'admin' },
  { id: 'admin:llm-settings', name: 'Paramètres LLM', description: 'Accès aux paramètres des modèles IA', category: 'admin' },
  { id: 'admin:users', name: 'Gestion utilisateurs', description: 'Accès à la gestion des utilisateurs', category: 'admin' },
  { id: 'admin:roles', name: 'Gestion rôles', description: 'Accès à la gestion des rôles', category: 'admin' },
  { id: 'admin:catalog', name: 'Gestion catalogue', description: 'Gestion complète du catalogue d\'agents', category: 'admin' },
  { id: 'admin:token-consumption', name: 'Consommations tokens', description: 'Accès à la gestion des consommations et quotas', category: 'admin' },

  // Tools permissions
  { id: 'tool:file-upload', name: 'Upload fichiers', description: 'Peut uploader des fichiers', category: 'tools' },
  { id: 'tool:export', name: 'Export données', description: 'Peut exporter des données', category: 'tools' },

  // System permissions
  { id: 'system:view-logs', name: 'Voir les logs', description: 'Peut voir les logs système', category: 'system' },
  { id: 'system:api-access', name: 'Accès API', description: 'Peut utiliser l\'API directement', category: 'system' }
];

/**
 * Default roles available in the system
 */
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: DEFAULT_PERMISSIONS.map(p => p.id),
    isSystem: true
  },
  {
    id: 'user',
    name: 'Utilisateur',
    description: 'Accès aux agents et outils standards',
    permissions: [
      'agent:ai-chat',
      'agent:document-analyzer',
      'agent:appointment-scheduler',
      'agent:dolibarr-stats',
      'agent:web-monitoring',
      'agent:contract-analysis',
      'agent:pod-analyzer',
      'agent:agent-builder',
      'agent:manage-own',
      'tool:file-upload',
      'tool:export'
    ],
    isSystem: true
  },
  {
    id: 'viewer',
    name: 'Lecteur',
    description: 'Accès en lecture seule',
    permissions: [
      'agent:ai-chat',
      'agent:dolibarr-stats'
    ],
    isSystem: true
  }
];

/**
 * Feature access configuration for UI
 */
export interface FeatureAccess {
  route: string;
  permissionId: string;
  label: string;
  icon: string;
}

/**
 * Map routes to required permissions
 */
export const ROUTE_PERMISSIONS: FeatureAccess[] = [
  { route: '/ai-chat', permissionId: 'agent:ai-chat', label: 'AI Chat', icon: 'chat' },
  { route: '/document-analyzer', permissionId: 'agent:document-analyzer', label: 'Analyse de documents', icon: 'description' },
  { route: '/appointment-scheduler', permissionId: 'agent:appointment-scheduler', label: 'Préparateur RDV', icon: 'event' },
  { route: '/dolibarr-stats', permissionId: 'agent:dolibarr-stats', label: 'Stats Dolibarr', icon: 'bar_chart' },
  { route: '/web-monitoring', permissionId: 'agent:web-monitoring', label: 'Veille Web', icon: 'public' },
  { route: '/contract-analysis', permissionId: 'agent:contract-analysis', label: 'Analyse contrats', icon: 'gavel' },
  { route: '/pod-analyzer', permissionId: 'agent:pod-analyzer', label: 'Analyseur POD', icon: 'local_shipping' },
  { route: '/agent-builder', permissionId: 'agent:agent-builder', label: 'Agent Builder', icon: 'smart_toy' },
  { route: '/settings', permissionId: 'admin:settings', label: 'Paramètres', icon: 'settings' },
  { route: '/llm-settings', permissionId: 'admin:llm-settings', label: 'Paramètres LLM', icon: 'psychology' },
  { route: '/token-consumption', permissionId: 'admin:token-consumption', label: 'Consommations', icon: 'data_usage' },
  { route: '/moderation-settings', permissionId: 'admin:moderation', label: 'Modération', icon: 'security' },
  { route: '/user-management', permissionId: 'admin:users', label: 'Utilisateurs', icon: 'people' },
  { route: '/catalog-management', permissionId: 'agent:manage-own', label: 'Gestion catalogue', icon: 'inventory_2' }
];
