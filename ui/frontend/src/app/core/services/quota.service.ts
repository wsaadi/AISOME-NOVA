import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  QuotaConfig,
  QuotaUsage,
  QuotaType,
  QuotaPeriod,
  AIProvider,
  ConsumptionFilter
} from '../models/token-consumption.model';
import { TokenConsumptionService } from './token-consumption.service';

/**
 * Service de gestion des quotas de consommation
 *
 * Responsabilités:
 * - Définir des quotas (global, par user, par role, par agent)
 * - Vérifier si un quota est dépassé
 * - Calculer l'utilisation actuelle des quotas
 * - Émettre des alertes quand un seuil est atteint
 */
@Injectable({
  providedIn: 'root'
})
export class QuotaService {
  private readonly STORAGE_KEY = 'quota_configs';

  private quotasSubject = new BehaviorSubject<QuotaConfig[]>([]);
  public quotas$ = this.quotasSubject.asObservable();

  private alertsSubject = new BehaviorSubject<QuotaUsage[]>([]);
  public alerts$ = this.alertsSubject.asObservable();

  constructor(private tokenConsumptionService: TokenConsumptionService) {
    this.loadQuotas();
  }

  // ==================== GESTION DES QUOTAS ====================

  /**
   * Charge les quotas depuis le localStorage
   */
  private loadQuotas(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const quotas = JSON.parse(stored) as QuotaConfig[];
        this.quotasSubject.next(quotas);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des quotas:', error);
      this.quotasSubject.next([]);
    }
  }

  /**
   * Sauvegarde les quotas dans le localStorage
   */
  private saveQuotas(quotas: QuotaConfig[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(quotas));
    this.quotasSubject.next(quotas);
  }

  /**
   * Obtient tous les quotas
   */
  getQuotas(): QuotaConfig[] {
    return this.quotasSubject.value;
  }

  /**
   * Obtient les quotas par type
   */
  getQuotasByType(type: QuotaType): QuotaConfig[] {
    return this.quotasSubject.value.filter(q => q.type === type);
  }

  /**
   * Obtient un quota par son ID
   */
  getQuotaById(id: string): QuotaConfig | undefined {
    return this.quotasSubject.value.find(q => q.id === id);
  }

  /**
   * Crée un nouveau quota
   */
  createQuota(data: {
    type: QuotaType;
    targetId?: string;
    targetName?: string;
    provider: AIProvider | 'all';
    period: QuotaPeriod;
    maxTokens: number;
    maxCost?: number;
    alertThreshold?: number;
  }, userId: string): QuotaConfig {
    const quota: QuotaConfig = {
      id: this.generateId(),
      type: data.type,
      targetId: data.targetId,
      targetName: data.targetName,
      provider: data.provider,
      period: data.period,
      maxTokens: data.maxTokens,
      maxCost: data.maxCost,
      isEnabled: true,
      alertThreshold: data.alertThreshold || 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId
    };

    const quotas = [...this.quotasSubject.value, quota];
    this.saveQuotas(quotas);

    return quota;
  }

  /**
   * Met à jour un quota existant
   */
  updateQuota(id: string, updates: Partial<QuotaConfig>): QuotaConfig | null {
    const quotas = this.quotasSubject.value;
    const index = quotas.findIndex(q => q.id === id);

    if (index < 0) {
      return null;
    }

    const updatedQuota: QuotaConfig = {
      ...quotas[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    quotas[index] = updatedQuota;
    this.saveQuotas(quotas);

    return updatedQuota;
  }

  /**
   * Supprime un quota
   */
  deleteQuota(id: string): boolean {
    const quotas = this.quotasSubject.value;
    const newQuotas = quotas.filter(q => q.id !== id);

    if (newQuotas.length === quotas.length) {
      return false;
    }

    this.saveQuotas(newQuotas);
    return true;
  }

  /**
   * Active/désactive un quota
   */
  toggleQuota(id: string): QuotaConfig | null {
    const quota = this.getQuotaById(id);
    if (!quota) return null;

    return this.updateQuota(id, { isEnabled: !quota.isEnabled });
  }

  // ==================== VÉRIFICATION DES QUOTAS ====================

  /**
   * Vérifie si une consommation est autorisée
   */
  checkQuota(
    userId: string,
    userRoles: string[],
    agentId: string,
    provider: AIProvider,
    tokensToUse: number
  ): { allowed: boolean; reason?: string; quota?: QuotaConfig; usage?: QuotaUsage } {
    const quotas = this.getActiveQuotasForRequest(userId, userRoles, agentId, provider);

    for (const quota of quotas) {
      const usage = this.getQuotaUsage(quota);

      if (usage.currentTokens + tokensToUse > quota.maxTokens) {
        return {
          allowed: false,
          reason: `Quota ${quota.type} dépassé (${usage.percentUsed.toFixed(1)}% utilisé)`,
          quota,
          usage
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Obtient les quotas actifs applicables pour une requête
   */
  private getActiveQuotasForRequest(
    userId: string,
    userRoles: string[],
    agentId: string,
    provider: AIProvider
  ): QuotaConfig[] {
    return this.quotasSubject.value.filter(quota => {
      if (!quota.isEnabled) return false;

      // Vérifier le provider
      if (quota.provider !== 'all' && quota.provider !== provider) {
        return false;
      }

      // Vérifier selon le type
      switch (quota.type) {
        case 'global':
          return true;
        case 'user':
          return quota.targetId === userId;
        case 'role':
          return userRoles.includes(quota.targetId || '');
        case 'agent':
          return quota.targetId === agentId;
        default:
          return false;
      }
    });
  }

  /**
   * Calcule l'utilisation actuelle d'un quota
   */
  getQuotaUsage(quota: QuotaConfig): QuotaUsage {
    const { start, end } = this.getPeriodBounds(quota.period);

    // Construire le filtre
    const filter: ConsumptionFilter = {
      startDate: start,
      endDate: end
    };

    // Filtrer selon le type de quota
    switch (quota.type) {
      case 'user':
        if (quota.targetId) filter.userIds = [quota.targetId];
        break;
      case 'agent':
        if (quota.targetId) filter.agentIds = [quota.targetId];
        break;
    }

    // Filtrer par provider si spécifié
    if (quota.provider !== 'all') {
      filter.providers = [quota.provider];
    }

    const stats = this.tokenConsumptionService.getGlobalStats(filter);

    const percentUsed = quota.maxTokens > 0
      ? (stats.totalTokens / quota.maxTokens) * 100
      : 0;

    return {
      quotaId: quota.id,
      currentTokens: stats.totalTokens,
      currentCost: stats.totalCost,
      percentUsed: Math.round(percentUsed * 10) / 10,
      periodStart: start,
      periodEnd: end,
      isExceeded: stats.totalTokens >= quota.maxTokens,
      isAlertTriggered: percentUsed >= quota.alertThreshold
    };
  }

  /**
   * Obtient les bornes de la période courante
   */
  private getPeriodBounds(period: QuotaPeriod): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start);
        end.setDate(end.getDate() + 1);
        break;

      case 'weekly':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Début de la semaine (dimanche)
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        break;

      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;

      case 'unlimited':
      default:
        start = new Date(0);
        end = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // +100 ans
        break;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // ==================== ALERTES ====================

  /**
   * Vérifie tous les quotas et met à jour les alertes
   */
  checkAllQuotaAlerts(): QuotaUsage[] {
    const alerts: QuotaUsage[] = [];

    this.quotasSubject.value.forEach(quota => {
      if (!quota.isEnabled) return;

      const usage = this.getQuotaUsage(quota);

      if (usage.isAlertTriggered || usage.isExceeded) {
        alerts.push(usage);
      }
    });

    this.alertsSubject.next(alerts);
    return alerts;
  }

  /**
   * Obtient l'utilisation de tous les quotas
   */
  getAllQuotaUsages(): { quota: QuotaConfig; usage: QuotaUsage }[] {
    return this.quotasSubject.value
      .filter(q => q.isEnabled)
      .map(quota => ({
        quota,
        usage: this.getQuotaUsage(quota)
      }));
  }

  // ==================== UTILITAIRES ====================

  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `quota_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formate une période pour l'affichage
   */
  formatPeriod(period: QuotaPeriod): string {
    const labels: Record<QuotaPeriod, string> = {
      daily: 'Journalier',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      unlimited: 'Illimité'
    };
    return labels[period] || period;
  }

  /**
   * Formate un type de quota pour l'affichage
   */
  formatQuotaType(type: QuotaType): string {
    const labels: Record<QuotaType, string> = {
      global: 'Global',
      user: 'Utilisateur',
      role: 'Rôle',
      agent: 'Agent'
    };
    return labels[type] || type;
  }

  /**
   * Obtient l'icône pour un type de quota
   */
  getQuotaTypeIcon(type: QuotaType): string {
    const icons: Record<QuotaType, string> = {
      global: 'public',
      user: 'person',
      role: 'groups',
      agent: 'smart_toy'
    };
    return icons[type] || 'help';
  }

  /**
   * Obtient la couleur de statut selon le pourcentage utilisé
   */
  getUsageColor(percentUsed: number, alertThreshold: number): string {
    if (percentUsed >= 100) return 'red';
    if (percentUsed >= alertThreshold) return 'orange';
    if (percentUsed >= 50) return 'yellow';
    return 'green';
  }
}
