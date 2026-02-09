import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';

interface ContentRule {
  category: string;
  blocked: boolean;
  threshold: number;
}

interface NeMoGuardrailsConfig {
  enabled: boolean;
  topic_check_enabled: boolean;
  content_check_enabled: boolean;
  jailbreak_check_enabled: boolean;
  allowed_topics: string[];
  blocked_topics: string[];
  content_rules: ContentRule[];
  jailbreak_threshold: number;
  topic_model: string | null;
  content_model: string | null;
  jailbreak_model: string | null;
}

interface AgentGuardrailsConfig {
  agent_id: string;
  agent_name: string;
  enabled: boolean;
  config: NeMoGuardrailsConfig | null;
}

interface NeMoGuardrailsSettings {
  enabled: boolean;
  config: NeMoGuardrailsConfig;
  agent_configs: AgentGuardrailsConfig[];
}

interface SafetyModel {
  id: string;
  label: string;
  type: string;
}

interface EnumsResponse {
  content_categories: string[];
  default_topics_allowed: string[];
  default_topics_blocked: string[];
  safety_models: SafetyModel[];
}

interface GuardrailTestResult {
  approved: boolean;
  checks: { check_type: string; passed: boolean; score: number | null; details: string; matched_category: string | null }[];
  blocked_reason: string | null;
  risk_score: number;
  processing_time_ms: number | null;
}

@Component({
  selector: 'app-nemo-guardrails-settings',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    TranslateModule,
    CustomButtonComponent
  ],
  templateUrl: './nemo-guardrails-settings.component.html',
  styleUrls: ['./nemo-guardrails-settings.component.scss']
})
export class NeMoGuardrailsSettingsComponent implements OnInit {
  settings: NeMoGuardrailsSettings | null = null;
  enums: EnumsResponse | null = null;

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  activeTab: 'general' | 'topics' | 'content' | 'jailbreak' | 'models' | 'test' = 'general';

  // New topic inputs
  newAllowedTopic = '';
  newBlockedTopic = '';

  // New content rule
  newContentCategory = '';

  // Test
  testContent = '';
  testResult: GuardrailTestResult | null = null;
  isTesting = false;

  private apiUrl = environment.api.aiChat;

  constructor(
    private http: HttpClient,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadEnums();
  }

  async loadSettings(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.settings = await firstValueFrom(
        this.http.get<NeMoGuardrailsSettings>(`${this.apiUrl}/api/v1/nemo-guardrails/settings`)
      );
    } catch (error: any) {
      this.errorMessage = `Erreur de chargement: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isLoading = false;
    }
  }

  async loadEnums(): Promise<void> {
    try {
      this.enums = await firstValueFrom(
        this.http.get<EnumsResponse>(`${this.apiUrl}/api/v1/nemo-guardrails/settings/enums`)
      );
    } catch (error: any) {
      console.error('Error loading enums:', error);
    }
  }

  async saveSettings(): Promise<void> {
    if (!this.settings) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      this.settings = await firstValueFrom(
        this.http.post<NeMoGuardrailsSettings>(`${this.apiUrl}/api/v1/nemo-guardrails/settings`, this.settings)
      );
      this.successMessage = 'Parametres NeMo Guardrails sauvegardes avec succes';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = `Erreur de sauvegarde: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isSaving = false;
    }
  }

  async resetToDefaults(): Promise<void> {
    if (!confirm('Reinitialiser les parametres NeMo Guardrails ? Cette action est irreversible.')) return;
    this.isLoading = true;
    try {
      this.settings = await firstValueFrom(
        this.http.post<NeMoGuardrailsSettings>(`${this.apiUrl}/api/v1/nemo-guardrails/settings/reset`, {})
      );
      this.successMessage = 'Parametres reinitialises';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = `Erreur: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isLoading = false;
    }
  }

  // ===== Topics =====

  addAllowedTopic(): void {
    if (!this.settings || !this.newAllowedTopic.trim()) return;
    const topic = this.newAllowedTopic.trim().toLowerCase();
    if (!this.settings.config.allowed_topics.includes(topic)) {
      this.settings.config.allowed_topics.push(topic);
    }
    this.newAllowedTopic = '';
  }

  removeAllowedTopic(index: number): void {
    if (!this.settings) return;
    this.settings.config.allowed_topics.splice(index, 1);
  }

  addBlockedTopic(): void {
    if (!this.settings || !this.newBlockedTopic.trim()) return;
    const topic = this.newBlockedTopic.trim().toLowerCase();
    if (!this.settings.config.blocked_topics.includes(topic)) {
      this.settings.config.blocked_topics.push(topic);
    }
    this.newBlockedTopic = '';
  }

  removeBlockedTopic(index: number): void {
    if (!this.settings) return;
    this.settings.config.blocked_topics.splice(index, 1);
  }

  // ===== Content Rules =====

  addContentRule(): void {
    if (!this.settings || !this.newContentCategory.trim()) return;
    const existing = this.settings.config.content_rules.find(r => r.category === this.newContentCategory);
    if (!existing) {
      this.settings.config.content_rules.push({
        category: this.newContentCategory.trim(),
        blocked: true,
        threshold: 0.7
      });
    }
    this.newContentCategory = '';
  }

  removeContentRule(index: number): void {
    if (!this.settings) return;
    this.settings.config.content_rules.splice(index, 1);
  }

  getAvailableCategories(): string[] {
    if (!this.enums || !this.settings) return [];
    const usedCategories = this.settings.config.content_rules.map(r => r.category);
    return this.enums.content_categories.filter(c => !usedCategories.includes(c));
  }

  // ===== Test =====

  async testGuardrails(): Promise<void> {
    if (!this.testContent.trim()) return;
    this.isTesting = true;
    this.testResult = null;
    this.errorMessage = '';
    try {
      // Call the nemo-guardrails-tool directly via the runtime proxy
      this.testResult = await firstValueFrom(
        this.http.post<GuardrailTestResult>(
          `${this.apiUrl}/api/v1/nemo-guardrails/test`,
          {
            content: this.testContent,
            config: this.settings?.config
          }
        )
      );
    } catch (error: any) {
      // If the test endpoint doesn't exist, try direct guardrails tool
      this.errorMessage = `Test echoue: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isTesting = false;
    }
  }

  // ===== Navigation =====

  setActiveTab(tab: 'general' | 'topics' | 'content' | 'jailbreak' | 'models' | 'test'): void {
    this.activeTab = tab;
  }

  getSafetyModels(type: string): SafetyModel[] {
    if (!this.enums) return [];
    return this.enums.safety_models.filter(m => m.type === type);
  }

  formatThreshold(value: number): string {
    return (value * 100).toFixed(0) + '%';
  }
}
