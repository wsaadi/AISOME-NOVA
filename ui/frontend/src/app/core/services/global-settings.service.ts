import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Configuration LLM globale
 */
export interface LLMSettings {
  // Provider par défaut
  defaultProvider: 'mistral' | 'openai' | 'anthropic' | 'gemini' | 'perplexity' | 'nvidia-nim';

  // Clés API (stockées côté serveur, masquées côté client)
  apiKeys: {
    mistral?: string;
    openai?: string;
    anthropic?: string;
    gemini?: string;
    perplexity?: string;
    'nvidia-nim'?: string;
  };

  // Modèles par défaut par provider
  defaultModels: {
    mistral: string;
    openai: string;
    anthropic: string;
    gemini: string;
    perplexity: string;
    'nvidia-nim': string;
  };

  // Paramètres par défaut
  defaults: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };

  // Limites (pour les utilisateurs non-admin)
  limits: {
    maxTemperature: number;
    maxTokensLimit: number;
    allowProviderChange: boolean;
    allowModelChange: boolean;
  };
}

/**
 * Paramètres de modération globaux
 */
export interface ModerationSettings {
  enabled: boolean;
  name: string;
  version: string;

  domains: {
    allowed_domains: string[];
    blocked_domains: string[];
    strict_domain_matching: boolean;
  };

  content: {
    allow_documents: boolean;
    allow_images: boolean;
    allowed_document_types: string[];
    max_document_size_mb: number;
  };

  sensitive_data: {
    enabled: boolean;
    blocked_data_types: string[];
    warn_data_types: string[];
    allow_company_emails: boolean;
    company_email_domains: string[];
  };

  thresholds: {
    minimum_professional_score: number;
    strict_mode: boolean;
    block_on_uncertainty: boolean;
    minimum_confidence: number;
  };

  custom_rules: {
    blocked_keywords: string[];
    allowed_keywords: string[];
    blocked_phrases: string[];
    allowed_phrases: string[];
  };

  ai_analysis: {
    enabled: boolean;
    analysis_depth: string;
    use_vision_for_images: boolean;
    provider: string;
    model: string | null;
  };

  audit: {
    enabled: boolean;
    log_approved: boolean;
    log_blocked: boolean;
    include_content_snippet: boolean;
    max_snippet_length: number;
  };
}

/**
 * Configuration globale complète
 */
export interface GlobalSettings {
  llm: LLMSettings;
  moderation: ModerationSettings;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Service de gestion des paramètres globaux
 *
 * Ce service centralise les paramètres LLM et de modération pour tous les agents.
 * Seuls les administrateurs peuvent modifier ces paramètres.
 * Les utilisateurs héritent de ces paramètres par défaut.
 */
@Injectable({
  providedIn: 'root'
})
export class GlobalSettingsService {
  private readonly STORAGE_KEY = 'global_settings';
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8026';

  private settingsSubject = new BehaviorSubject<GlobalSettings | null>(null);
  public settings$ = this.settingsSubject.asObservable();

  private defaultLLMSettings: LLMSettings = {
    defaultProvider: 'mistral',
    apiKeys: {},
    defaultModels: {
      mistral: 'mistral-small-latest',
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022',
      gemini: 'gemini-2.0-flash-exp',
      perplexity: 'sonar',
      'nvidia-nim': 'meta/llama-3.1-8b-instruct'
    },
    defaults: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    },
    limits: {
      maxTemperature: 2.0,
      maxTokensLimit: 32000,
      allowProviderChange: false,
      allowModelChange: false
    }
  };

  private defaultModerationSettings: ModerationSettings = {
    enabled: true,
    name: 'default',
    version: '1.0.0',
    domains: {
      allowed_domains: [],
      blocked_domains: [],
      strict_domain_matching: false
    },
    content: {
      allow_documents: true,
      allow_images: true,
      allowed_document_types: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv'],
      max_document_size_mb: 50
    },
    sensitive_data: {
      enabled: true,
      blocked_data_types: ['credit_card', 'ssn'],
      warn_data_types: ['phone', 'address'],
      allow_company_emails: true,
      company_email_domains: []
    },
    thresholds: {
      minimum_professional_score: 0.5,
      strict_mode: false,
      block_on_uncertainty: false,
      minimum_confidence: 0.7
    },
    custom_rules: {
      blocked_keywords: [],
      allowed_keywords: [],
      blocked_phrases: [],
      allowed_phrases: []
    },
    ai_analysis: {
      enabled: true,
      analysis_depth: 'standard',
      use_vision_for_images: true,
      provider: 'mistral',
      model: null
    },
    audit: {
      enabled: true,
      log_approved: false,
      log_blocked: true,
      include_content_snippet: true,
      max_snippet_length: 200
    }
  };

  constructor(private http: HttpClient) {
    this.loadSettings();
  }

  /**
   * Charge les paramètres depuis le backend ou localStorage
   */
  loadSettings(): void {
    // D'abord essayer de charger depuis le backend
    this.http.get<GlobalSettings>(`${this.apiUrl}/api/v1/settings/global`).pipe(
      catchError(() => {
        // Si le backend n'est pas disponible, charger depuis localStorage
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          return of(JSON.parse(stored) as GlobalSettings);
        }
        // Sinon retourner les paramètres par défaut
        return of(this.getDefaultSettings());
      })
    ).subscribe(settings => {
      this.settingsSubject.next(settings);
      // Sauvegarder en local pour le cache
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    });
  }

  /**
   * Retourne les paramètres par défaut
   */
  getDefaultSettings(): GlobalSettings {
    return {
      llm: this.defaultLLMSettings,
      moderation: this.defaultModerationSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    };
  }

  /**
   * Obtient les paramètres actuels
   */
  getSettings(): GlobalSettings {
    return this.settingsSubject.value || this.getDefaultSettings();
  }

  /**
   * Obtient les paramètres LLM
   */
  getLLMSettings(): LLMSettings {
    const settings = this.getSettings();
    // S'assurer que les settings LLM existent et ont des valeurs par défaut
    if (!settings?.llm || !settings.llm.defaults) {
      return this.defaultLLMSettings;
    }
    // Fusionner avec les valeurs par défaut pour s'assurer que toutes les propriétés existent
    return {
      ...this.defaultLLMSettings,
      ...settings.llm,
      defaults: {
        ...this.defaultLLMSettings.defaults,
        ...(settings.llm.defaults || {})
      },
      limits: {
        ...this.defaultLLMSettings.limits,
        ...(settings.llm.limits || {})
      },
      apiKeys: {
        ...this.defaultLLMSettings.apiKeys,
        ...(settings.llm.apiKeys || {})
      },
      defaultModels: {
        ...this.defaultLLMSettings.defaultModels,
        ...(settings.llm.defaultModels || {})
      }
    };
  }

  /**
   * Obtient les paramètres de modération
   */
  getModerationSettings(): ModerationSettings {
    const settings = this.getSettings();
    // S'assurer que les settings de modération existent
    if (!settings?.moderation) {
      return this.defaultModerationSettings;
    }
    // Fusionner avec les valeurs par défaut
    return {
      ...this.defaultModerationSettings,
      ...settings.moderation
    };
  }

  /**
   * Sauvegarde les paramètres LLM (admin uniquement)
   */
  saveLLMSettings(settings: LLMSettings, userId: string): Observable<LLMSettings> {
    const currentSettings = this.getSettings();
    const updatedSettings: GlobalSettings = {
      ...currentSettings,
      llm: settings,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    return this.http.post<GlobalSettings>(`${this.apiUrl}/api/v1/settings/global/llm`, settings).pipe(
      tap(response => {
        this.settingsSubject.next(updatedSettings);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings));
      }),
      map(() => settings),
      catchError(() => {
        // Fallback: sauvegarder en local
        this.settingsSubject.next(updatedSettings);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings));
        return of(settings);
      })
    );
  }

  /**
   * Sauvegarde les paramètres de modération (admin uniquement)
   */
  saveModerationSettings(settings: ModerationSettings, userId: string): Observable<ModerationSettings> {
    const currentSettings = this.getSettings();
    const updatedSettings: GlobalSettings = {
      ...currentSettings,
      moderation: settings,
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };

    return this.http.post<GlobalSettings>(`${this.apiUrl}/api/v1/settings/global/moderation`, settings).pipe(
      tap(response => {
        this.settingsSubject.next(updatedSettings);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings));
      }),
      map(() => settings),
      catchError(() => {
        // Fallback: sauvegarder en local
        this.settingsSubject.next(updatedSettings);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSettings));
        return of(settings);
      })
    );
  }

  /**
   * Obtient les paramètres effectifs pour un agent
   * Fusionne les paramètres globaux avec les paramètres spécifiques de l'agent
   */
  getEffectiveSettingsForAgent(agentId: string): Observable<{ llm: LLMSettings; moderation: ModerationSettings }> {
    const globalSettings = this.getSettings();

    // Charger les paramètres spécifiques de l'agent (s'ils existent)
    const agentSettingsKey = `agent-settings-${agentId}`;
    const agentSettingsStr = localStorage.getItem(agentSettingsKey);

    if (agentSettingsStr) {
      try {
        const agentSettings = JSON.parse(agentSettingsStr);
        // Fusionner avec les paramètres globaux (l'agent peut surcharger certains paramètres)
        return of({
          llm: { ...globalSettings.llm, ...agentSettings.llm },
          moderation: { ...globalSettings.moderation, ...agentSettings.moderation }
        });
      } catch {
        // En cas d'erreur, retourner les paramètres globaux
      }
    }

    return of({
      llm: globalSettings.llm,
      moderation: globalSettings.moderation
    });
  }

  /**
   * Sauvegarde les paramètres spécifiques d'un agent
   * Note: Les utilisateurs ne peuvent modifier que certains paramètres si autorisés
   */
  saveAgentSettings(
    agentId: string,
    settings: Partial<{ llm: Partial<LLMSettings>; moderation: Partial<ModerationSettings> }>,
    isAdmin: boolean
  ): Observable<boolean> {
    const globalSettings = this.getSettings();

    // Si l'utilisateur n'est pas admin, vérifier les limites
    if (!isAdmin) {
      if (settings.llm) {
        // Vérifier si les changements sont autorisés
        if (!globalSettings.llm.limits.allowProviderChange && settings.llm.defaultProvider) {
          delete settings.llm.defaultProvider;
        }
        if (!globalSettings.llm.limits.allowModelChange && settings.llm.defaultModels) {
          delete settings.llm.defaultModels;
        }
        // Appliquer les limites de température
        if (settings.llm.defaults?.temperature !== undefined) {
          settings.llm.defaults.temperature = Math.min(
            settings.llm.defaults.temperature,
            globalSettings.llm.limits.maxTemperature
          );
        }
        // Appliquer les limites de tokens
        if (settings.llm.defaults?.maxTokens !== undefined) {
          settings.llm.defaults.maxTokens = Math.min(
            settings.llm.defaults.maxTokens,
            globalSettings.llm.limits.maxTokensLimit
          );
        }
      }
      // Les utilisateurs non-admin ne peuvent pas modifier les paramètres de modération
      delete settings.moderation;
    }

    const agentSettingsKey = `agent-settings-${agentId}`;
    localStorage.setItem(agentSettingsKey, JSON.stringify(settings));

    return of(true);
  }

  /**
   * Vérifie si une clé API est configurée pour un provider
   */
  hasApiKey(provider: string): boolean {
    const settings = this.getLLMSettings();
    return !!(settings.apiKeys as any)[provider];
  }

  /**
   * Obtient la liste des providers disponibles (avec clé API configurée)
   */
  getAvailableProviders(): string[] {
    const settings = this.getLLMSettings();
    if (!settings?.apiKeys) {
      return [];
    }
    return Object.entries(settings.apiKeys)
      .filter(([_, key]) => !!key)
      .map(([provider]) => provider);
  }
}
