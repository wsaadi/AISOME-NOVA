import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  AgentDSL,
  DSLParseRequest,
  DSLParseResponse,
  DSLExportResponse,
  DSLTemplateInfo,
  DSLSchemaResponse,
  ValidationResult,
  createEmptyAgentDSL,
} from '../models/agent-dsl.models';

/**
 * Service for Agent Descriptor Language (ADL) operations.
 *
 * Provides:
 * - DSL parsing and validation
 * - Import/Export in YAML and JSON formats
 * - Template management
 * - Format conversion
 */
@Injectable({
  providedIn: 'root',
})
export class AgentDSLService {
  private readonly baseUrl = `${environment.agentBuilderUrl}/api/v1/dsl`;

  // State management
  private currentDSLSubject = new BehaviorSubject<AgentDSL | null>(null);
  public currentDSL$ = this.currentDSLSubject.asObservable();

  private validationResultSubject = new BehaviorSubject<ValidationResult | null>(null);
  public validationResult$ = this.validationResultSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ============== PARSING ==============

  /**
   * Parse DSL content (YAML or JSON)
   */
  parseDSL(content: string, format: 'yaml' | 'json'): Observable<DSLParseResponse> {
    const request: DSLParseRequest = { content, format };

    this.loadingSubject.next(true);

    return this.http.post<DSLParseResponse>(`${this.baseUrl}/parse`, request).pipe(
      tap((response) => {
        if (response.agent) {
          this.currentDSLSubject.next(response.agent);
        }
        this.validationResultSubject.next(response.validation);
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Validate DSL content without importing
   */
  validateDSL(content: string, format: 'yaml' | 'json'): Observable<ValidationResult> {
    const request: DSLParseRequest = { content, format };

    return this.http.post<ValidationResult>(`${this.baseUrl}/validate`, request).pipe(
      tap((result) => {
        this.validationResultSubject.next(result);
      })
    );
  }

  // ============== IMPORT ==============

  /**
   * Import agent from YAML content
   */
  importFromYAML(content: string): Observable<{ success: boolean; agent_id: string; agent_name: string }> {
    const headers = new HttpHeaders({ 'Content-Type': 'text/yaml' });

    this.loadingSubject.next(true);

    return this.http
      .post<{ success: boolean; agent_id: string; agent_name: string }>(
        `${this.baseUrl}/import/yaml`,
        content,
        { headers }
      )
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((error) => {
          this.loadingSubject.next(false);
          throw error;
        })
      );
  }

  /**
   * Import agent from JSON content
   */
  importFromJSON(data: Record<string, any>): Observable<{ success: boolean; agent_id: string; agent_name: string }> {
    this.loadingSubject.next(true);

    return this.http
      .post<{ success: boolean; agent_id: string; agent_name: string }>(
        `${this.baseUrl}/import/json`,
        data
      )
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((error) => {
          this.loadingSubject.next(false);
          throw error;
        })
      );
  }

  /**
   * Import agent from file
   */
  importFromFile(file: File): Observable<{ success: boolean; agent_id: string; agent_name: string }> {
    const formData = new FormData();
    formData.append('file', file);

    this.loadingSubject.next(true);

    return this.http
      .post<{ success: boolean; agent_id: string; agent_name: string }>(
        `${this.baseUrl}/import/file`,
        formData
      )
      .pipe(
        tap(() => this.loadingSubject.next(false)),
        catchError((error) => {
          this.loadingSubject.next(false);
          throw error;
        })
      );
  }

  // ============== EXPORT ==============

  /**
   * Export agent to YAML format
   */
  exportToYAML(agentId: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/export/${agentId}/yaml`, {
      responseType: 'text',
    });
  }

  /**
   * Export agent to JSON format
   */
  exportToJSON(agentId: string, pretty = true): Observable<string> {
    return this.http.get(`${this.baseUrl}/export/${agentId}/json`, {
      responseType: 'text',
      params: { pretty: pretty.toString() },
    });
  }

  /**
   * Get export data with metadata
   */
  getExportData(agentId: string, format: 'yaml' | 'json'): Observable<DSLExportResponse> {
    return this.http.get<DSLExportResponse>(`${this.baseUrl}/export/${agentId}`, {
      params: { format },
    });
  }

  /**
   * Download agent as file
   */
  downloadAgent(agentId: string, format: 'yaml' | 'json'): void {
    const observable = format === 'yaml' ? this.exportToYAML(agentId) : this.exportToJSON(agentId);

    observable.subscribe({
      next: (content) => {
        const blob = new Blob([content], { type: format === 'yaml' ? 'text/yaml' : 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `agent-${agentId}.${format === 'yaml' ? 'yaml' : 'json'}`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download failed:', error);
      },
    });
  }

  // ============== TEMPLATES ==============

  /**
   * Get list of available templates
   */
  getTemplates(): Observable<DSLTemplateInfo[]> {
    return this.http.get<DSLTemplateInfo[]>(`${this.baseUrl}/templates`);
  }

  /**
   * Get a specific template
   */
  getTemplate(templateId: string, format: 'yaml' | 'json' = 'yaml'): Observable<string> {
    return this.http.get(`${this.baseUrl}/templates/${templateId}`, {
      responseType: 'text',
      params: { format },
    });
  }

  /**
   * Create agent from template
   */
  createFromTemplate(
    templateId: string,
    name: string,
    description?: string
  ): Observable<{ success: boolean; agent_id: string; agent_name: string }> {
    return this.http.post<{ success: boolean; agent_id: string; agent_name: string }>(
      `${this.baseUrl}/templates/${templateId}/create`,
      { name, description }
    );
  }

  // ============== SCHEMA ==============

  /**
   * Get the DSL JSON schema
   */
  getSchema(): Observable<DSLSchemaResponse> {
    return this.http.get<DSLSchemaResponse>(`${this.baseUrl}/schema`);
  }

  /**
   * Get schema documentation (markdown)
   */
  getSchemaDocumentation(): Observable<string> {
    return this.http.get(`${this.baseUrl}/schema/documentation`, {
      responseType: 'text',
    });
  }

  // ============== CONVERSION ==============

  /**
   * Convert existing agent to DSL format
   */
  convertToDSL(agentId: string, format: 'yaml' | 'json' = 'yaml'): Observable<{ content: string }> {
    return this.http.post<{ content: string }>(
      `${this.baseUrl}/convert/legacy-to-dsl/${agentId}`,
      {},
      { params: { format } }
    );
  }

  /**
   * Convert DSL content to legacy format (for compatibility)
   */
  convertToLegacy(content: string, format: 'yaml' | 'json'): Observable<Record<string, any>> {
    const request: DSLParseRequest = { content, format };
    return this.http.post<Record<string, any>>(`${this.baseUrl}/convert/dsl-to-legacy`, request);
  }

  // ============== BULK OPERATIONS ==============

  /**
   * Export multiple agents
   */
  exportBulk(
    agentIds: string[],
    format: 'yaml' | 'json' = 'yaml'
  ): Observable<{ results: Array<{ agent_id: string; content?: string; success: boolean }> }> {
    return this.http.post<{ results: Array<{ agent_id: string; content?: string; success: boolean }> }>(
      `${this.baseUrl}/export/bulk`,
      agentIds,
      { params: { format } }
    );
  }

  /**
   * Import multiple agents
   */
  importBulk(
    agents: Array<Record<string, any>>,
    format: 'yaml' | 'json' = 'json'
  ): Observable<{ results: Array<{ index: number; success: boolean; agent_id?: string }> }> {
    return this.http.post<{ results: Array<{ index: number; success: boolean; agent_id?: string }> }>(
      `${this.baseUrl}/import/bulk`,
      agents,
      { params: { format } }
    );
  }

  // ============== VERSION INFO ==============

  /**
   * Get DSL version information
   */
  getVersion(): Observable<{ version: string; features: string[] }> {
    return this.http.get<{ version: string; features: string[] }>(`${this.baseUrl}/version`);
  }

  // ============== STATE MANAGEMENT ==============

  /**
   * Set current DSL in state
   */
  setCurrentDSL(dsl: AgentDSL | null): void {
    this.currentDSLSubject.next(dsl);
  }

  /**
   * Get current DSL from state
   */
  getCurrentDSL(): AgentDSL | null {
    return this.currentDSLSubject.getValue();
  }

  /**
   * Create a new empty DSL
   */
  createNew(): void {
    this.currentDSLSubject.next(createEmptyAgentDSL());
    this.validationResultSubject.next(null);
  }

  /**
   * Clear current state
   */
  clear(): void {
    this.currentDSLSubject.next(null);
    this.validationResultSubject.next(null);
  }

  // ============== UTILITIES ==============

  /**
   * Parse YAML string to object
   */
  parseYAMLLocally(yamlContent: string): Record<string, any> | null {
    try {
      // Using a simple YAML parser approach
      // In production, consider using a library like js-yaml
      return JSON.parse(this.yamlToJson(yamlContent));
    } catch {
      return null;
    }
  }

  /**
   * Basic YAML to JSON conversion (simplified)
   * For production, use a proper YAML library
   */
  private yamlToJson(yaml: string): string {
    // This is a placeholder - in production, use js-yaml or similar
    // For now, we rely on server-side parsing
    throw new Error('Local YAML parsing not implemented. Use server-side parsing.');
  }

  /**
   * Generate a file download from content
   */
  downloadContent(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
