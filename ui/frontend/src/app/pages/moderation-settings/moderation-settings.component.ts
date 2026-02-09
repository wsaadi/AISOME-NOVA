import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { AgentRuntimeService } from '../../core/services/agent-runtime.service';
import { UserManagementService } from '../../core/services/user-management.service';

interface ModerationRule {
  id: string;
  instruction: string;
  enabled: boolean;
}

interface AgentModerationConfig {
  agent_id: string;
  agent_name: string;
  enabled: boolean;
  rules: ModerationRule[];
}

interface UserModerationConfig {
  user_id: string;
  username: string;
  enabled: boolean;
  rules: ModerationRule[];
}

interface GlobalModerationConfig {
  enabled: boolean;
  rules: ModerationRule[];
}

interface ModerationSettings {
  global_config: GlobalModerationConfig;
  agent_configs: AgentModerationConfig[];
  user_configs: UserModerationConfig[];
}

interface AgentInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
}

interface TestResult {
  approved: boolean;
  reason: string;
  matched_rules: string[];
}

// NeMo Guardrails interfaces
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
  selector: 'app-moderation-settings',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    TranslateModule,
    CustomButtonComponent
  ],
  templateUrl: './moderation-settings.component.html',
  styleUrls: ['./moderation-settings.component.scss']
})
export class ModerationSettingsComponent implements OnInit, OnDestroy {
  settings: ModerationSettings | null = null;
  agents: AgentInfo[] = [];
  users: UserInfo[] = [];

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  activeTab: 'global' | 'agents' | 'users' | 'test' | 'guardrails' | 'gr-topics' | 'gr-content' | 'gr-jailbreak' | 'gr-models' | 'gr-test' = 'global';

  // New rule inputs
  newGlobalRule = '';
  newAgentRule: { [agentId: string]: string } = {};
  newUserRule: { [userId: string]: string } = {};

  // Add agent/user moderation
  selectedAgentId = '';
  selectedUserId = '';

  // Test
  testContent = '';
  testAgentId = '';
  testUserId = '';
  testResult: TestResult | null = null;
  isTesting = false;

  // ===== NeMo Guardrails =====
  grSettings: NeMoGuardrailsSettings | null = null;
  grEnums: EnumsResponse | null = null;
  grIsSaving = false;
  newAllowedTopic = '';
  newBlockedTopic = '';
  newContentCategory = '';
  grTestContent = '';
  grTestResult: GuardrailTestResult | null = null;
  grIsTesting = false;

  private apiUrl = environment.api.aiChat;
  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
    private agentRuntimeService: AgentRuntimeService,
    private userManagementService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadAgents();
    this.loadUsers();
    this.loadGrSettings();
    this.loadGrEnums();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadSettings(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.settings = await firstValueFrom(
        this.http.get<ModerationSettings>(`${this.apiUrl}/api/v1/moderation/settings`)
      );
    } catch (error: any) {
      this.errorMessage = `Erreur de chargement: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isLoading = false;
    }
  }

  loadAgents(): void {
    this.agentRuntimeService.getAgents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (agentList) => {
          this.agents = (agentList || []).map(a => ({
            id: a.id || a.slug,
            name: a.name || a.slug,
            slug: a.slug || a.id,
            description: a.description || '',
            status: a.status || 'active'
          }));
        },
        error: (err) => console.error('Error loading agents:', err)
      });
  }

  loadUsers(): void {
    this.userManagementService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userList) => {
          this.users = (userList || []).map(u => ({
            id: u.id,
            username: u.username || u.email || u.id,
            email: u.email || ''
          }));
        },
        error: (err) => console.error('Error loading users:', err)
      });
  }

  async saveSettings(): Promise<void> {
    if (!this.settings) return;
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      this.settings = await firstValueFrom(
        this.http.post<ModerationSettings>(`${this.apiUrl}/api/v1/moderation/settings`, this.settings)
      );
      this.successMessage = 'Paramètres sauvegardés avec succès';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = `Erreur de sauvegarde: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isSaving = false;
    }
  }

  async resetToDefaults(): Promise<void> {
    if (!confirm('Réinitialiser tous les paramètres de modération ? Cette action est irréversible.')) return;
    this.isLoading = true;
    try {
      this.settings = await firstValueFrom(
        this.http.post<ModerationSettings>(`${this.apiUrl}/api/v1/moderation/settings/reset`, {})
      );
      this.successMessage = 'Paramètres réinitialisés';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = `Erreur: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isLoading = false;
    }
  }

  // ===== Global rules =====

  addGlobalRule(): void {
    if (!this.settings || !this.newGlobalRule.trim()) return;
    this.settings.global_config.rules.push({
      id: `rule-${Date.now()}`,
      instruction: this.newGlobalRule.trim(),
      enabled: true
    });
    this.newGlobalRule = '';
  }

  removeGlobalRule(index: number): void {
    if (!this.settings) return;
    this.settings.global_config.rules.splice(index, 1);
  }

  toggleGlobalRule(index: number): void {
    if (!this.settings) return;
    this.settings.global_config.rules[index].enabled = !this.settings.global_config.rules[index].enabled;
  }

  // ===== Agent configs =====

  addAgentConfig(): void {
    if (!this.settings || !this.selectedAgentId) return;
    if (this.settings.agent_configs.find(c => c.agent_id === this.selectedAgentId)) return;
    const agent = this.agents.find(a => a.id === this.selectedAgentId);
    this.settings.agent_configs.push({
      agent_id: this.selectedAgentId,
      agent_name: agent?.name || this.selectedAgentId,
      enabled: true,
      rules: []
    });
    this.selectedAgentId = '';
  }

  removeAgentConfig(index: number): void {
    if (!this.settings) return;
    this.settings.agent_configs.splice(index, 1);
  }

  addAgentRule(agentId: string): void {
    if (!this.settings || !this.newAgentRule[agentId]?.trim()) return;
    const config = this.settings.agent_configs.find(c => c.agent_id === agentId);
    if (!config) return;
    config.rules.push({
      id: `rule-${Date.now()}`,
      instruction: this.newAgentRule[agentId].trim(),
      enabled: true
    });
    this.newAgentRule[agentId] = '';
  }

  removeAgentRule(agentId: string, ruleIndex: number): void {
    if (!this.settings) return;
    const config = this.settings.agent_configs.find(c => c.agent_id === agentId);
    if (config) config.rules.splice(ruleIndex, 1);
  }

  toggleAgentRule(agentId: string, ruleIndex: number): void {
    if (!this.settings) return;
    const config = this.settings.agent_configs.find(c => c.agent_id === agentId);
    if (config) config.rules[ruleIndex].enabled = !config.rules[ruleIndex].enabled;
  }

  getAvailableAgents(): AgentInfo[] {
    if (!this.settings) return this.agents;
    const usedIds = this.settings.agent_configs.map(c => c.agent_id);
    return this.agents.filter(a => !usedIds.includes(a.id));
  }

  // ===== User configs =====

  addUserConfig(): void {
    if (!this.settings || !this.selectedUserId) return;
    if (this.settings.user_configs.find(c => c.user_id === this.selectedUserId)) return;
    const user = this.users.find(u => u.id === this.selectedUserId);
    this.settings.user_configs.push({
      user_id: this.selectedUserId,
      username: user?.username || this.selectedUserId,
      enabled: true,
      rules: []
    });
    this.selectedUserId = '';
  }

  removeUserConfig(index: number): void {
    if (!this.settings) return;
    this.settings.user_configs.splice(index, 1);
  }

  addUserRule(userId: string): void {
    if (!this.settings || !this.newUserRule[userId]?.trim()) return;
    const config = this.settings.user_configs.find(c => c.user_id === userId);
    if (!config) return;
    config.rules.push({
      id: `rule-${Date.now()}`,
      instruction: this.newUserRule[userId].trim(),
      enabled: true
    });
    this.newUserRule[userId] = '';
  }

  removeUserRule(userId: string, ruleIndex: number): void {
    if (!this.settings) return;
    const config = this.settings.user_configs.find(c => c.user_id === userId);
    if (config) config.rules.splice(ruleIndex, 1);
  }

  toggleUserRule(userId: string, ruleIndex: number): void {
    if (!this.settings) return;
    const config = this.settings.user_configs.find(c => c.user_id === userId);
    if (config) config.rules[ruleIndex].enabled = !config.rules[ruleIndex].enabled;
  }

  getAvailableUsers(): UserInfo[] {
    if (!this.settings) return this.users;
    const usedIds = this.settings.user_configs.map(c => c.user_id);
    return this.users.filter(u => !usedIds.includes(u.id));
  }

  // ===== Test =====

  async testModeration(): Promise<void> {
    if (!this.testContent.trim()) return;
    this.isTesting = true;
    this.testResult = null;
    this.errorMessage = '';
    try {
      this.testResult = await firstValueFrom(
        this.http.post<TestResult>(`${this.apiUrl}/api/v1/moderate/check`, {
          content: this.testContent,
          rules: this.getTestRules(),
          agent_id: this.testAgentId || null,
          user_id: this.testUserId || null
        })
      );
    } catch (error: any) {
      this.errorMessage = `Test échoué: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.isTesting = false;
    }
  }

  private getTestRules(): string[] {
    if (!this.settings) return [];
    const rules: string[] = [];
    if (this.settings.global_config.enabled) {
      for (const rule of this.settings.global_config.rules) {
        if (rule.enabled) rules.push(rule.instruction);
      }
    }
    if (this.testAgentId) {
      const agentConfig = this.settings.agent_configs.find(c => c.agent_id === this.testAgentId);
      if (agentConfig?.enabled) {
        for (const rule of agentConfig.rules) {
          if (rule.enabled) rules.push(rule.instruction);
        }
      }
    }
    if (this.testUserId) {
      const userConfig = this.settings.user_configs.find(c => c.user_id === this.testUserId);
      if (userConfig?.enabled) {
        for (const rule of userConfig.rules) {
          if (rule.enabled) rules.push(rule.instruction);
        }
      }
    }
    return rules;
  }

  setActiveTab(tab: 'global' | 'agents' | 'users' | 'test' | 'guardrails' | 'gr-topics' | 'gr-content' | 'gr-jailbreak' | 'gr-models' | 'gr-test'): void {
    this.activeTab = tab;
  }

  // ===== NeMo Guardrails Methods =====

  async loadGrSettings(): Promise<void> {
    try {
      this.grSettings = await firstValueFrom(
        this.http.get<NeMoGuardrailsSettings>(`${this.apiUrl}/api/v1/nemo-guardrails/settings`)
      );
    } catch (error: any) {
      console.error('Error loading guardrails settings:', error);
    }
  }

  async loadGrEnums(): Promise<void> {
    try {
      this.grEnums = await firstValueFrom(
        this.http.get<EnumsResponse>(`${this.apiUrl}/api/v1/nemo-guardrails/settings/enums`)
      );
    } catch (error: any) {
      console.error('Error loading guardrails enums:', error);
    }
  }

  async saveGrSettings(): Promise<void> {
    if (!this.grSettings) return;
    this.grIsSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      this.grSettings = await firstValueFrom(
        this.http.post<NeMoGuardrailsSettings>(`${this.apiUrl}/api/v1/nemo-guardrails/settings`, this.grSettings)
      );
      this.successMessage = 'Paramètres NeMo Guardrails sauvegardés';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = `Erreur de sauvegarde: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.grIsSaving = false;
    }
  }

  async resetGrToDefaults(): Promise<void> {
    if (!confirm('Réinitialiser les paramètres NeMo Guardrails ?')) return;
    try {
      this.grSettings = await firstValueFrom(
        this.http.post<NeMoGuardrailsSettings>(`${this.apiUrl}/api/v1/nemo-guardrails/settings/reset`, {})
      );
      this.successMessage = 'Paramètres guardrails réinitialisés';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = `Erreur: ${error.message || 'Erreur inconnue'}`;
    }
  }

  addAllowedTopic(): void {
    if (!this.grSettings || !this.newAllowedTopic.trim()) return;
    const topic = this.newAllowedTopic.trim().toLowerCase();
    if (!this.grSettings.config.allowed_topics.includes(topic)) {
      this.grSettings.config.allowed_topics.push(topic);
    }
    this.newAllowedTopic = '';
  }

  removeAllowedTopic(index: number): void {
    if (!this.grSettings) return;
    this.grSettings.config.allowed_topics.splice(index, 1);
  }

  addBlockedTopic(): void {
    if (!this.grSettings || !this.newBlockedTopic.trim()) return;
    const topic = this.newBlockedTopic.trim().toLowerCase();
    if (!this.grSettings.config.blocked_topics.includes(topic)) {
      this.grSettings.config.blocked_topics.push(topic);
    }
    this.newBlockedTopic = '';
  }

  removeBlockedTopic(index: number): void {
    if (!this.grSettings) return;
    this.grSettings.config.blocked_topics.splice(index, 1);
  }

  addContentRule(): void {
    if (!this.grSettings || !this.newContentCategory.trim()) return;
    const existing = this.grSettings.config.content_rules.find(r => r.category === this.newContentCategory);
    if (!existing) {
      this.grSettings.config.content_rules.push({
        category: this.newContentCategory.trim(),
        blocked: true,
        threshold: 0.7
      });
    }
    this.newContentCategory = '';
  }

  removeContentRule(index: number): void {
    if (!this.grSettings) return;
    this.grSettings.config.content_rules.splice(index, 1);
  }

  getAvailableCategories(): string[] {
    if (!this.grEnums || !this.grSettings) return [];
    const usedCategories = this.grSettings.config.content_rules.map(r => r.category);
    return this.grEnums.content_categories.filter(c => !usedCategories.includes(c));
  }

  async testGuardrails(): Promise<void> {
    if (!this.grTestContent.trim()) return;
    this.grIsTesting = true;
    this.grTestResult = null;
    this.errorMessage = '';
    try {
      this.grTestResult = await firstValueFrom(
        this.http.post<GuardrailTestResult>(
          `${this.apiUrl}/api/v1/nemo-guardrails/test`,
          { content: this.grTestContent, config: this.grSettings?.config }
        )
      );
    } catch (error: any) {
      this.errorMessage = `Test échoué: ${error.message || 'Erreur inconnue'}`;
    } finally {
      this.grIsTesting = false;
    }
  }

  getSafetyModels(type: string): SafetyModel[] {
    if (!this.grEnums) return [];
    return this.grEnums.safety_models.filter(m => m.type === type);
  }

  formatThreshold(value: number): string {
    return (value * 100).toFixed(0) + '%';
  }
}
