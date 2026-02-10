import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  AgentDefinition,
  AgentListResponse,
  AgentResponse,
  CreateAgentRequest,
  UpdateAgentRequest,
  AvailableTool,
  ToolCategory,
  ComponentTypeInfo,
  UITemplate,
  PersonalityPreset,
  AgentCategory,
  ValidationResult,
  ToolConfiguration,
  UILayout,
  AIBehavior,
  Workflow,
  AgentStatus,
  AgentType,
} from '../models/agent.models';

@Injectable({
  providedIn: 'root',
})
export class AgentBuilderService {
  private readonly apiUrl = '/api/v1/agent-builder';

  // Current agent being edited
  private currentAgentSubject = new BehaviorSubject<AgentDefinition | null>(null);
  currentAgent$ = this.currentAgentSubject.asObservable();

  // Dirty state (unsaved changes)
  private isDirtySubject = new BehaviorSubject<boolean>(false);
  isDirty$ = this.isDirtySubject.asObservable();

  constructor(private http: HttpClient) {}

  // ============== AGENT CRUD ==============

  createAgent(request: CreateAgentRequest): Observable<AgentDefinition> {
    return this.http.post<AgentResponse>(`${this.apiUrl}/agents`, request).pipe(
      map((response) => response.agent!),
      tap((agent) => this.setCurrentAgent(agent))
    );
  }

  getAgent(agentId: string): Observable<AgentDefinition> {
    return this.http.get<AgentResponse>(`${this.apiUrl}/agents/${agentId}`).pipe(
      map((response) => response.agent!),
      tap((agent) => this.setCurrentAgent(agent))
    );
  }

  listAgents(params?: {
    category?: string;
    status?: AgentStatus;
    agent_type?: AgentType;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<AgentListResponse> {
    let httpParams = new HttpParams();
    if (params?.category) httpParams = httpParams.set('category', params.category);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.agent_type) httpParams = httpParams.set('agent_type', params.agent_type);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.pageSize) httpParams = httpParams.set('page_size', params.pageSize.toString());

    return this.http.get<AgentListResponse>(`${this.apiUrl}/agents`, { params: httpParams });
  }

  updateAgent(agentId: string, request: UpdateAgentRequest): Observable<AgentDefinition> {
    return this.http.put<AgentResponse>(`${this.apiUrl}/agents/${agentId}`, request).pipe(
      map((response) => response.agent!),
      tap((agent) => {
        this.setCurrentAgent(agent);
        this.setDirty(false);
      })
    );
  }

  deleteAgent(agentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/agents/${agentId}`).pipe(
      tap(() => {
        if (this.currentAgentSubject.value?.id === agentId) {
          this.currentAgentSubject.next(null);
        }
      })
    );
  }

  duplicateAgent(agentId: string, newName: string): Observable<AgentDefinition> {
    return this.http
      .post<AgentResponse>(`${this.apiUrl}/agents/${agentId}/duplicate`, { new_name: newName })
      .pipe(map((response) => response.agent!));
  }

  // ============== AGENT LIFECYCLE ==============

  validateAgent(agentId: string): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.apiUrl}/agents/${agentId}/validate`, {});
  }

  activateAgent(agentId: string): Observable<AgentDefinition> {
    return this.http
      .post<AgentResponse>(`${this.apiUrl}/agents/${agentId}/activate`, {})
      .pipe(map((response) => response.agent!));
  }

  deactivateAgent(agentId: string): Observable<AgentDefinition> {
    return this.http
      .post<AgentResponse>(`${this.apiUrl}/agents/${agentId}/deactivate`, {})
      .pipe(map((response) => response.agent!));
  }

  // ============== CONFIGURATION UPDATES ==============

  updateTools(agentId: string, tools: ToolConfiguration[]): Observable<AgentDefinition> {
    return this.http
      .put<AgentResponse>(`${this.apiUrl}/agents/${agentId}/tools`, tools)
      .pipe(map((response) => response.agent!));
  }

  updateUILayout(agentId: string, uiLayout: UILayout): Observable<AgentDefinition> {
    return this.http
      .put<AgentResponse>(`${this.apiUrl}/agents/${agentId}/ui-layout`, uiLayout)
      .pipe(map((response) => response.agent!));
  }

  updateAIBehavior(agentId: string, aiBehavior: AIBehavior): Observable<AgentDefinition> {
    return this.http
      .put<AgentResponse>(`${this.apiUrl}/agents/${agentId}/ai-behavior`, aiBehavior)
      .pipe(map((response) => response.agent!));
  }

  updateWorkflows(agentId: string, workflows: Workflow[]): Observable<AgentDefinition> {
    return this.http
      .put<AgentResponse>(`${this.apiUrl}/agents/${agentId}/workflows`, workflows)
      .pipe(map((response) => response.agent!));
  }

  // ============== IMPORT/EXPORT ==============

  exportAgent(agentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/agents/${agentId}/export`);
  }

  importAgent(data: any): Observable<AgentDefinition> {
    return this.http
      .post<AgentResponse>(`${this.apiUrl}/agents/import`, data)
      .pipe(map((response) => response.agent!));
  }

  /**
   * Export an agent as a ZIP archive containing everything needed to recreate it.
   */
  exportAgentArchive(agentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/agents/${agentId}/export-archive`, {
      responseType: 'blob'
    });
  }

  /**
   * Import an agent from a ZIP archive.
   */
  importAgentArchive(file: File): Observable<AgentDefinition> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<AgentResponse>(`${this.apiUrl}/agents/import-archive`, formData)
      .pipe(map((response) => response.agent!));
  }

  // ============== TOOLS REGISTRY ==============

  getAvailableTools(category?: ToolCategory): Observable<AvailableTool[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);

    return this.http
      .get<{ tools: AvailableTool[] }>(`${this.apiUrl}/tools`, { params })
      .pipe(map((response) => response.tools));
  }

  getTool(toolId: string): Observable<AvailableTool> {
    return this.http.get<AvailableTool>(`${this.apiUrl}/tools/${toolId}`);
  }

  // ============== UI COMPONENTS ==============

  getComponentTypes(): Observable<ComponentTypeInfo[]> {
    return this.http
      .get<{ components: ComponentTypeInfo[] }>(`${this.apiUrl}/components`)
      .pipe(map((response) => response.components));
  }

  // ============== TEMPLATES & PRESETS ==============

  getUITemplates(): Observable<Record<string, UITemplate>> {
    return this.http
      .get<{ templates: Record<string, UITemplate> }>(`${this.apiUrl}/templates/ui`)
      .pipe(map((response) => response.templates));
  }

  getPersonalityPresets(): Observable<Record<string, PersonalityPreset>> {
    return this.http
      .get<{ presets: Record<string, PersonalityPreset> }>(`${this.apiUrl}/templates/personality`)
      .pipe(map((response) => response.presets));
  }

  // ============== CATEGORIES ==============

  getCategories(): Observable<AgentCategory[]> {
    return this.http
      .get<{ categories: AgentCategory[] }>(`${this.apiUrl}/categories`)
      .pipe(map((response) => response.categories));
  }

  // ============== STATE MANAGEMENT ==============

  setCurrentAgent(agent: AgentDefinition): void {
    this.currentAgentSubject.next(agent);
    this.isDirtySubject.next(false);
  }

  getCurrentAgent(): AgentDefinition | null {
    return this.currentAgentSubject.value;
  }

  setDirty(isDirty: boolean): void {
    this.isDirtySubject.next(isDirty);
  }

  updateCurrentAgentLocally(updates: Partial<AgentDefinition>): void {
    const current = this.currentAgentSubject.value;
    if (current) {
      this.currentAgentSubject.next({ ...current, ...updates });
      this.isDirtySubject.next(true);
    }
  }

  clearCurrentAgent(): void {
    this.currentAgentSubject.next(null);
    this.isDirtySubject.next(false);
  }

  // ============== HELPER METHODS ==============

  generateUniqueId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  createDefaultComponent(type: string): any {
    return {
      id: this.generateUniqueId(),
      type,
      name: `${type}_${Date.now()}`,
      label: this.formatComponentLabel(type),
      required: false,
      validation_rules: [],
      options: [],
      style: {},
      children: [],
    };
  }

  createDefaultSection(): any {
    return {
      id: this.generateUniqueId(),
      name: `section_${Date.now()}`,
      title: 'New Section',
      layout_type: 'column',
      gap: '16px',
      components: [],
      style: {},
    };
  }

  private formatComponentLabel(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
