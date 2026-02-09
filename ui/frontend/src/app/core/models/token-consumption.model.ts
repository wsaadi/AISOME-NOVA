/**
 * Types de providers IA disponibles
 */
export type AIProvider = 'mistral' | 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'nvidia-nim';

/**
 * Liste des providers disponibles
 */
export const AI_PROVIDERS: { id: AIProvider; name: string; icon: string }[] = [
  { id: 'mistral', name: 'Mistral AI', icon: 'auto_awesome' },
  { id: 'openai', name: 'OpenAI', icon: 'psychology' },
  { id: 'anthropic', name: 'Anthropic (Claude)', icon: 'smart_toy' },
  { id: 'gemini', name: 'Google Gemini', icon: 'hub' },
  { id: 'perplexity', name: 'Perplexity', icon: 'search' },
  { id: 'nvidia-nim', name: 'NVIDIA NIM', icon: 'memory' }
];

/**
 * Enregistrement d'une consommation de tokens
 */
export interface TokenConsumptionRecord {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  agentId: string;
  agentName: string;
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  // Coûts calculés (si les coûts sont configurés)
  promptCost?: number;
  completionCost?: number;
  totalCost?: number;
}

/**
 * Configuration des coûts par provider
 * Les coûts sont exprimés en € pour 1 million de tokens
 */
export interface ProviderCostConfig {
  provider: AIProvider;
  model: string;
  inputCostPer1M: number;   // Coût pour 1M tokens d'entrée
  outputCostPer1M: number;  // Coût pour 1M tokens de sortie
  currency: string;         // Devise (par défaut EUR)
  updatedAt: string;
  updatedBy: string;
}

/**
 * Configuration par défaut des coûts (estimations basées sur les prix publics)
 */
export const DEFAULT_PROVIDER_COSTS: ProviderCostConfig[] = [
  // Mistral AI
  { provider: 'mistral', model: 'mistral-small-latest', inputCostPer1M: 0.90, outputCostPer1M: 2.70, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'mistral', model: 'mistral-medium-latest', inputCostPer1M: 2.50, outputCostPer1M: 7.50, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'mistral', model: 'mistral-large-latest', inputCostPer1M: 3.00, outputCostPer1M: 9.00, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'mistral', model: 'codestral-latest', inputCostPer1M: 0.90, outputCostPer1M: 2.70, currency: 'EUR', updatedAt: '', updatedBy: 'system' },

  // OpenAI
  { provider: 'openai', model: 'gpt-4o-mini', inputCostPer1M: 0.14, outputCostPer1M: 0.55, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'openai', model: 'gpt-4o', inputCostPer1M: 2.30, outputCostPer1M: 9.20, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'openai', model: 'gpt-4-turbo', inputCostPer1M: 9.20, outputCostPer1M: 27.60, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'openai', model: 'gpt-3.5-turbo', inputCostPer1M: 0.45, outputCostPer1M: 1.40, currency: 'EUR', updatedAt: '', updatedBy: 'system' },

  // Anthropic
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', inputCostPer1M: 2.75, outputCostPer1M: 13.80, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'anthropic', model: 'claude-3-opus-20240229', inputCostPer1M: 13.80, outputCostPer1M: 69.00, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', inputCostPer1M: 0.23, outputCostPer1M: 1.15, currency: 'EUR', updatedAt: '', updatedBy: 'system' },

  // Gemini
  { provider: 'gemini', model: 'gemini-2.0-flash-exp', inputCostPer1M: 0.07, outputCostPer1M: 0.28, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'gemini', model: 'gemini-1.5-pro', inputCostPer1M: 1.15, outputCostPer1M: 4.60, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'gemini', model: 'gemini-1.5-flash', inputCostPer1M: 0.07, outputCostPer1M: 0.28, currency: 'EUR', updatedAt: '', updatedBy: 'system' },

  // Perplexity
  { provider: 'perplexity', model: 'sonar', inputCostPer1M: 1.00, outputCostPer1M: 1.00, currency: 'USD', updatedAt: '', updatedBy: 'system' },
  { provider: 'perplexity', model: 'sonar-pro', inputCostPer1M: 3.00, outputCostPer1M: 15.00, currency: 'USD', updatedAt: '', updatedBy: 'system' },
  { provider: 'perplexity', model: 'sonar-reasoning-pro', inputCostPer1M: 2.00, outputCostPer1M: 8.00, currency: 'USD', updatedAt: '', updatedBy: 'system' },
  { provider: 'perplexity', model: 'sonar-deep-research', inputCostPer1M: 2.00, outputCostPer1M: 8.00, currency: 'USD', updatedAt: '', updatedBy: 'system' },

  // NVIDIA NIM
  { provider: 'nvidia-nim', model: 'meta/llama-3.1-8b-instruct', inputCostPer1M: 0.30, outputCostPer1M: 0.30, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'nvidia-nim', model: 'meta/llama-3.1-70b-instruct', inputCostPer1M: 2.40, outputCostPer1M: 2.40, currency: 'EUR', updatedAt: '', updatedBy: 'system' },
  { provider: 'nvidia-nim', model: 'meta/llama-3.1-405b-instruct', inputCostPer1M: 8.00, outputCostPer1M: 8.00, currency: 'EUR', updatedAt: '', updatedBy: 'system' }
];

/**
 * Type de quota
 */
export type QuotaType = 'global' | 'user' | 'role' | 'agent';

/**
 * Période de quota
 */
export type QuotaPeriod = 'daily' | 'weekly' | 'monthly' | 'unlimited';

/**
 * Configuration d'un quota
 */
export interface QuotaConfig {
  id: string;
  type: QuotaType;
  targetId?: string;        // userId, roleId, ou agentId selon le type
  targetName?: string;      // Nom pour l'affichage
  provider: AIProvider | 'all';  // Peut s'appliquer à tous les providers ou un spécifique
  period: QuotaPeriod;
  maxTokens: number;        // Limite de tokens
  maxCost?: number;         // Limite de coût (optionnel)
  isEnabled: boolean;
  alertThreshold: number;   // Pourcentage pour alerte (ex: 80 = alerte à 80%)
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * État d'utilisation d'un quota
 */
export interface QuotaUsage {
  quotaId: string;
  currentTokens: number;
  currentCost: number;
  percentUsed: number;
  periodStart: string;
  periodEnd: string;
  isExceeded: boolean;
  isAlertTriggered: boolean;
}

/**
 * Statistiques agrégées de consommation
 */
export interface ConsumptionStats {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  requestCount: number;
  avgTokensPerRequest: number;
  avgCostPerRequest: number;
  avgDurationMs: number;
}

/**
 * Consommation par période
 */
export interface ConsumptionByPeriod {
  period: string;  // Format dépend de la granularité (jour, semaine, mois)
  stats: ConsumptionStats;
}

/**
 * Consommation par entité (user, agent, provider)
 */
export interface ConsumptionByEntity {
  entityId: string;
  entityName: string;
  entityType: 'user' | 'agent' | 'provider';
  stats: ConsumptionStats;
}

/**
 * Filtre pour les requêtes de consommation
 */
export interface ConsumptionFilter {
  startDate?: string;
  endDate?: string;
  userIds?: string[];
  agentIds?: string[];
  providers?: AIProvider[];
  models?: string[];
}

/**
 * Options de visualisation
 */
export type ViewMode = 'tokens' | 'cost';
export type GroupBy = 'day' | 'week' | 'month' | 'user' | 'agent' | 'provider' | 'model';
