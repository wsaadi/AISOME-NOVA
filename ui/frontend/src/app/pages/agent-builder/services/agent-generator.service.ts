import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

/**
 * Missing component information
 */
export interface MissingComponent {
  type: 'tool' | 'connector' | 'ui_component';
  name: string;
  description: string;
  suggestion?: string;
}

/**
 * Generation status enum
 */
export type GenerationStatus = 'success' | 'partial' | 'failed' | 'missing_components';

/**
 * Response from agent generation
 */
export interface GenerationResponse {
  success: boolean;
  status: GenerationStatus;
  yaml_content?: string;
  warnings: string[];
  errors: string[];
  missing_components: MissingComponent[];
  suggestions: string[];
  message: string;
}

/**
 * Available capabilities in the platform
 */
export interface PlatformCapabilities {
  tools: Record<string, { name: string; description: string; category: string }>;
  ui_components: string[];
  llm_providers: string[];
  categories: string[];
  triggers: string[];
  workflow_steps: string[];
}

/**
 * Example prompt for generation
 */
export interface GenerationExample {
  title: string;
  prompt: string;
  description: string;
}

/**
 * Request to generate an agent
 */
export interface GenerateAgentRequest {
  prompt: string;
  provider?: string;
  model?: string;
  temperature?: number;
}

/**
 * Request to refine an agent
 */
export interface RefineAgentRequest {
  current_yaml: string;
  refinement_prompt: string;
  provider?: string;
  model?: string;
}

/**
 * Service for AI-powered agent generation from natural language prompts.
 *
 * Provides:
 * - Generate agent YAML from description
 * - Refine existing agent definitions
 * - Get platform capabilities
 * - Get example prompts
 */
@Injectable({
  providedIn: 'root',
})
export class AgentGeneratorService {
  private readonly baseUrl = `${environment.agentBuilderUrl}/api/v1/agent-builder/generator`;

  // State management
  private generatedYamlSubject = new BehaviorSubject<string | null>(null);
  public generatedYaml$ = this.generatedYamlSubject.asObservable();

  private generatingSubject = new BehaviorSubject<boolean>(false);
  public generating$ = this.generatingSubject.asObservable();

  private lastResultSubject = new BehaviorSubject<GenerationResponse | null>(null);
  public lastResult$ = this.lastResultSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ============== GENERATION ==============

  /**
   * Generate an agent YAML from a natural language prompt
   */
  generateAgent(request: GenerateAgentRequest): Observable<GenerationResponse> {
    this.generatingSubject.next(true);

    return this.http.post<GenerationResponse>(`${this.baseUrl}/generate`, {
      prompt: request.prompt,
      provider: request.provider || 'mistral',
      model: request.model || 'mistral-large-latest',
      temperature: request.temperature || 0.3,
    }).pipe(
      tap((response) => {
        this.generatingSubject.next(false);
        this.lastResultSubject.next(response);
        if (response.yaml_content) {
          this.generatedYamlSubject.next(response.yaml_content);
        }
      })
    );
  }

  /**
   * Refine an existing agent YAML based on user feedback
   */
  refineAgent(request: RefineAgentRequest): Observable<GenerationResponse> {
    this.generatingSubject.next(true);

    return this.http.post<GenerationResponse>(`${this.baseUrl}/refine`, {
      current_yaml: request.current_yaml,
      refinement_prompt: request.refinement_prompt,
      provider: request.provider || 'mistral',
      model: request.model || 'mistral-large-latest',
    }).pipe(
      tap((response) => {
        this.generatingSubject.next(false);
        this.lastResultSubject.next(response);
        if (response.yaml_content) {
          this.generatedYamlSubject.next(response.yaml_content);
        }
      })
    );
  }

  // ============== CAPABILITIES ==============

  /**
   * Get available platform capabilities
   */
  getCapabilities(): Observable<PlatformCapabilities> {
    return this.http.get<PlatformCapabilities>(`${this.baseUrl}/capabilities`);
  }

  /**
   * Get example prompts for generation
   */
  getExamples(): Observable<GenerationExample[]> {
    return this.http.get<{ examples: GenerationExample[] }>(`${this.baseUrl}/examples`).pipe(
      map((response) => response.examples)
    );
  }

  // ============== CREATION ==============

  /**
   * Create an agent from the generated YAML
   */
  createAgentFromYaml(yamlContent: string): Observable<{ success: boolean; agent_id: string; agent_name: string; message: string }> {
    return this.http.post<{ success: boolean; agent_id: string; agent_name: string; message: string }>(
      `${this.baseUrl}/create-from-yaml`,
      { yaml_content: yamlContent }
    );
  }

  /**
   * Validate YAML without creating the agent
   */
  validateYaml(yamlContent: string): Observable<{
    valid: boolean;
    errors: Array<{ path: string; message: string }>;
    warnings: Array<{ path: string; message: string }>;
    missing_components: MissingComponent[];
  }> {
    return this.http.post<any>(`${this.baseUrl}/validate-yaml`, yamlContent, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  // ============== STATE MANAGEMENT ==============

  /**
   * Set the generated YAML content
   */
  setGeneratedYaml(yaml: string | null): void {
    this.generatedYamlSubject.next(yaml);
  }

  /**
   * Get the current generated YAML
   */
  getGeneratedYaml(): string | null {
    return this.generatedYamlSubject.getValue();
  }

  /**
   * Clear the generation state
   */
  clear(): void {
    this.generatedYamlSubject.next(null);
    this.lastResultSubject.next(null);
  }

  /**
   * Check if there are missing components in the last result
   */
  hasMissingComponents(): boolean {
    const result = this.lastResultSubject.getValue();
    return !!(result?.missing_components && result.missing_components.length > 0);
  }

  /**
   * Get missing components from the last result
   */
  getMissingComponents(): MissingComponent[] {
    return this.lastResultSubject.getValue()?.missing_components || [];
  }
}
