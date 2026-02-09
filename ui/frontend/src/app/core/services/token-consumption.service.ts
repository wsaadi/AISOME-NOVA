import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  TokenConsumptionRecord,
  ProviderCostConfig,
  DEFAULT_PROVIDER_COSTS,
  ConsumptionStats,
  ConsumptionByPeriod,
  ConsumptionByEntity,
  ConsumptionFilter,
  AIProvider,
  GroupBy,
  ViewMode
} from '../models/token-consumption.model';

/**
 * Service de gestion de la consommation de tokens
 *
 * Responsabilités:
 * - Enregistrer les consommations de tokens
 * - Calculer les coûts associés
 * - Fournir des statistiques agrégées
 * - Gérer la configuration des coûts par provider
 */
@Injectable({
  providedIn: 'root'
})
export class TokenConsumptionService {
  private readonly STORAGE_KEY_RECORDS = 'token_consumption_records';
  private readonly STORAGE_KEY_COSTS = 'provider_costs_config';

  private recordsSubject = new BehaviorSubject<TokenConsumptionRecord[]>([]);
  public records$ = this.recordsSubject.asObservable();

  private costsSubject = new BehaviorSubject<ProviderCostConfig[]>([]);
  public costs$ = this.costsSubject.asObservable();

  constructor() {
    this.loadRecords();
    this.loadCosts();
  }

  // ==================== GESTION DES ENREGISTREMENTS ====================

  /**
   * Charge les enregistrements depuis le localStorage
   */
  private loadRecords(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_RECORDS);
      if (stored) {
        const records = JSON.parse(stored) as TokenConsumptionRecord[];
        this.recordsSubject.next(records);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des consommations:', error);
      this.recordsSubject.next([]);
    }
  }

  /**
   * Sauvegarde les enregistrements dans le localStorage
   */
  private saveRecords(records: TokenConsumptionRecord[]): void {
    localStorage.setItem(this.STORAGE_KEY_RECORDS, JSON.stringify(records));
    this.recordsSubject.next(records);
  }

  /**
   * Enregistre une nouvelle consommation de tokens
   */
  recordConsumption(data: {
    userId: string;
    username: string;
    agentId: string;
    agentName: string;
    provider: AIProvider;
    model: string;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
  }): TokenConsumptionRecord {
    const costs = this.calculateCost(data.provider, data.model, data.promptTokens, data.completionTokens);

    const record: TokenConsumptionRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId: data.userId,
      username: data.username,
      agentId: data.agentId,
      agentName: data.agentName,
      provider: data.provider,
      model: data.model,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.promptTokens + data.completionTokens,
      durationMs: data.durationMs,
      promptCost: costs.promptCost,
      completionCost: costs.completionCost,
      totalCost: costs.totalCost
    };

    const records = [...this.recordsSubject.value, record];
    this.saveRecords(records);

    return record;
  }

  /**
   * Obtient tous les enregistrements
   */
  getRecords(): TokenConsumptionRecord[] {
    return this.recordsSubject.value;
  }

  /**
   * Obtient les enregistrements filtrés
   */
  getFilteredRecords(filter: ConsumptionFilter): TokenConsumptionRecord[] {
    let records = this.recordsSubject.value;

    if (filter.startDate) {
      records = records.filter(r => r.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      records = records.filter(r => r.timestamp <= filter.endDate!);
    }

    if (filter.userIds && filter.userIds.length > 0) {
      records = records.filter(r => filter.userIds!.includes(r.userId));
    }

    if (filter.agentIds && filter.agentIds.length > 0) {
      records = records.filter(r => filter.agentIds!.includes(r.agentId));
    }

    if (filter.providers && filter.providers.length > 0) {
      records = records.filter(r => filter.providers!.includes(r.provider));
    }

    if (filter.models && filter.models.length > 0) {
      records = records.filter(r => filter.models!.includes(r.model));
    }

    return records;
  }

  /**
   * Supprime les enregistrements plus anciens qu'une date donnée
   */
  purgeOldRecords(beforeDate: string): number {
    const records = this.recordsSubject.value;
    const newRecords = records.filter(r => r.timestamp >= beforeDate);
    const deletedCount = records.length - newRecords.length;
    this.saveRecords(newRecords);
    return deletedCount;
  }

  // ==================== GESTION DES COÛTS ====================

  /**
   * Charge la configuration des coûts
   */
  private loadCosts(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_COSTS);
      if (stored) {
        const costs = JSON.parse(stored) as ProviderCostConfig[];
        this.costsSubject.next(costs);
      } else {
        // Initialiser avec les coûts par défaut
        this.saveCosts(DEFAULT_PROVIDER_COSTS);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des coûts:', error);
      this.costsSubject.next(DEFAULT_PROVIDER_COSTS);
    }
  }

  /**
   * Sauvegarde la configuration des coûts
   */
  private saveCosts(costs: ProviderCostConfig[]): void {
    localStorage.setItem(this.STORAGE_KEY_COSTS, JSON.stringify(costs));
    this.costsSubject.next(costs);
  }

  /**
   * Obtient la configuration des coûts
   */
  getCosts(): ProviderCostConfig[] {
    return this.costsSubject.value;
  }

  /**
   * Obtient le coût pour un provider/model spécifique
   */
  getCostConfig(provider: AIProvider, model: string): ProviderCostConfig | undefined {
    return this.costsSubject.value.find(c => c.provider === provider && c.model === model);
  }

  /**
   * Met à jour la configuration des coûts pour un provider/model
   */
  updateCostConfig(config: ProviderCostConfig, userId: string): void {
    const costs = this.costsSubject.value;
    const index = costs.findIndex(c => c.provider === config.provider && c.model === config.model);

    const updatedConfig: ProviderCostConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    if (index >= 0) {
      costs[index] = updatedConfig;
    } else {
      costs.push(updatedConfig);
    }

    this.saveCosts(costs);
  }

  /**
   * Réinitialise les coûts par défaut
   */
  resetCostsToDefault(): void {
    this.saveCosts(DEFAULT_PROVIDER_COSTS);
  }

  /**
   * Calcule le coût pour une consommation donnée
   */
  calculateCost(provider: AIProvider, model: string, promptTokens: number, completionTokens: number): {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  } {
    const config = this.getCostConfig(provider, model);

    if (!config) {
      return { promptCost: 0, completionCost: 0, totalCost: 0 };
    }

    const promptCost = (promptTokens / 1_000_000) * config.inputCostPer1M;
    const completionCost = (completionTokens / 1_000_000) * config.outputCostPer1M;

    return {
      promptCost: Math.round(promptCost * 100000) / 100000,
      completionCost: Math.round(completionCost * 100000) / 100000,
      totalCost: Math.round((promptCost + completionCost) * 100000) / 100000
    };
  }

  // ==================== STATISTIQUES ====================

  /**
   * Calcule les statistiques globales
   */
  getGlobalStats(filter?: ConsumptionFilter): ConsumptionStats {
    const records = filter ? this.getFilteredRecords(filter) : this.recordsSubject.value;
    return this.calculateStats(records);
  }

  /**
   * Obtient les statistiques par période
   */
  getStatsByPeriod(groupBy: 'day' | 'week' | 'month', filter?: ConsumptionFilter): ConsumptionByPeriod[] {
    const records = filter ? this.getFilteredRecords(filter) : this.recordsSubject.value;
    const grouped = new Map<string, TokenConsumptionRecord[]>();

    records.forEach(record => {
      const date = new Date(record.timestamp);
      let key: string;

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(record);
    });

    return Array.from(grouped.entries())
      .map(([period, recs]) => ({
        period,
        stats: this.calculateStats(recs)
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Obtient les statistiques par utilisateur
   */
  getStatsByUser(filter?: ConsumptionFilter): ConsumptionByEntity[] {
    const records = filter ? this.getFilteredRecords(filter) : this.recordsSubject.value;
    return this.groupByEntity(records, 'user', r => r.userId, r => r.username);
  }

  /**
   * Obtient les statistiques par agent
   */
  getStatsByAgent(filter?: ConsumptionFilter): ConsumptionByEntity[] {
    const records = filter ? this.getFilteredRecords(filter) : this.recordsSubject.value;
    return this.groupByEntity(records, 'agent', r => r.agentId, r => r.agentName);
  }

  /**
   * Obtient les statistiques par provider
   */
  getStatsByProvider(filter?: ConsumptionFilter): ConsumptionByEntity[] {
    const records = filter ? this.getFilteredRecords(filter) : this.recordsSubject.value;
    return this.groupByEntity(records, 'provider', r => r.provider, r => r.provider);
  }

  /**
   * Obtient les statistiques par modèle
   */
  getStatsByModel(filter?: ConsumptionFilter): ConsumptionByEntity[] {
    const records = filter ? this.getFilteredRecords(filter) : this.recordsSubject.value;
    return this.groupByEntity(records, 'provider', r => `${r.provider}:${r.model}`, r => `${r.provider} - ${r.model}`);
  }

  /**
   * Obtient le top N des consommateurs (users ou agents)
   */
  getTopConsumers(type: 'user' | 'agent', limit: number = 10, filter?: ConsumptionFilter): ConsumptionByEntity[] {
    const stats = type === 'user' ? this.getStatsByUser(filter) : this.getStatsByAgent(filter);
    return stats
      .sort((a, b) => b.stats.totalTokens - a.stats.totalTokens)
      .slice(0, limit);
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * Groupe les enregistrements par entité
   */
  private groupByEntity(
    records: TokenConsumptionRecord[],
    entityType: 'user' | 'agent' | 'provider',
    getKey: (r: TokenConsumptionRecord) => string,
    getName: (r: TokenConsumptionRecord) => string
  ): ConsumptionByEntity[] {
    const grouped = new Map<string, TokenConsumptionRecord[]>();
    const names = new Map<string, string>();

    records.forEach(record => {
      const key = getKey(record);
      const name = getName(record);

      if (!grouped.has(key)) {
        grouped.set(key, []);
        names.set(key, name);
      }
      grouped.get(key)!.push(record);
    });

    return Array.from(grouped.entries())
      .map(([entityId, recs]) => ({
        entityId,
        entityName: names.get(entityId) || entityId,
        entityType,
        stats: this.calculateStats(recs)
      }));
  }

  /**
   * Calcule les statistiques pour un ensemble d'enregistrements
   */
  private calculateStats(records: TokenConsumptionRecord[]): ConsumptionStats {
    if (records.length === 0) {
      return {
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCost: 0,
        requestCount: 0,
        avgTokensPerRequest: 0,
        avgCostPerRequest: 0,
        avgDurationMs: 0
      };
    }

    const totalPromptTokens = records.reduce((sum, r) => sum + r.promptTokens, 0);
    const totalCompletionTokens = records.reduce((sum, r) => sum + r.completionTokens, 0);
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const totalCost = records.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const totalDuration = records.reduce((sum, r) => sum + r.durationMs, 0);
    const requestCount = records.length;

    return {
      totalTokens,
      totalPromptTokens,
      totalCompletionTokens,
      totalCost: Math.round(totalCost * 100000) / 100000,
      requestCount,
      avgTokensPerRequest: Math.round(totalTokens / requestCount),
      avgCostPerRequest: Math.round((totalCost / requestCount) * 100000) / 100000,
      avgDurationMs: Math.round(totalDuration / requestCount)
    };
  }

  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `tc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtient les utilisateurs uniques dans les enregistrements
   */
  getUniqueUsers(): { id: string; name: string }[] {
    const users = new Map<string, string>();
    this.recordsSubject.value.forEach(r => {
      if (!users.has(r.userId)) {
        users.set(r.userId, r.username);
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
  }

  /**
   * Obtient les agents uniques dans les enregistrements
   */
  getUniqueAgents(): { id: string; name: string }[] {
    const agents = new Map<string, string>();
    this.recordsSubject.value.forEach(r => {
      if (!agents.has(r.agentId)) {
        agents.set(r.agentId, r.agentName);
      }
    });
    return Array.from(agents.entries()).map(([id, name]) => ({ id, name }));
  }

  /**
   * Obtient les providers uniques dans les enregistrements
   */
  getUniqueProviders(): AIProvider[] {
    const providers = new Set<AIProvider>();
    this.recordsSubject.value.forEach(r => providers.add(r.provider));
    return Array.from(providers);
  }

  /**
   * Obtient les modèles uniques dans les enregistrements
   */
  getUniqueModels(): string[] {
    const models = new Set<string>();
    this.recordsSubject.value.forEach(r => models.add(r.model));
    return Array.from(models);
  }

  /**
   * Formate un nombre de tokens pour l'affichage
   */
  formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(2)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
  }

  /**
   * Formate un coût pour l'affichage
   */
  formatCost(cost: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 5
    }).format(cost);
  }
}
