import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, catchError, tap, throwError, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Agent summary for listing
 */
export interface AgentSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  status: string;
  icon: string;
  tags: string[];
}

/**
 * Agent UI Component definition
 */
export interface UIComponent {
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
  help_text?: string;
  default_value?: any;
  required?: boolean;
  options?: Array<{ value: string; label: string; description?: string }>;
  accept?: string;
  multiple?: boolean;
  max_size_mb?: number;
  visible_when?: {
    field: string;
    operator: string;
    value: any;
  };
  style?: Record<string, string>;
  [key: string]: any;
}

/**
 * Agent UI Section definition
 */
export interface UISection {
  name: string;
  title: string;
  layout_type: string;
  gap?: string;
  grid_columns?: number;
  visible_when?: {
    field: string;
    operator: string;
    value: any;
  };
  components: UIComponent[];
}

/**
 * Agent UI Action button definition
 */
export interface UIAction {
  type: string;
  name: string;
  label: string;
  button_action: string;
  button_variant?: string;
  is_trigger_button?: boolean;
  custom_action?: string;
  visible_when?: {
    field: string;
    operator: string;
    value: any;
  };
}

/**
 * Agent UI Layout definition
 */
export interface AgentUILayout {
  show_header: boolean;
  header_title?: string;
  header_subtitle?: string;
  header_icon?: string;
  sections: UISection[];
  show_sidebar: boolean;
  sidebar_sections?: UISection[];
  show_footer: boolean;
  show_actions: boolean;
  actions: UIAction[];
  actions_position: string;
  theme: string;
  primary_color?: string;
}

/**
 * Complete agent definition from runtime
 */
export interface AgentDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  long_description?: string;
  category: string;
  status: string;
  icon: string;
  tags: string[];
  version: string;
  ui: AgentUILayout;
  business_logic: {
    system_prompt: string;
    user_prompt_template?: string;
    personality_traits?: Array<{ name: string; intensity: number }>;
    tone?: string;
    language?: string;
    llm_provider: string;
    llm_model: string;
    temperature?: number;
    max_tokens?: number;
    streaming_enabled?: boolean;
    instructions?: string[];
    constraints?: string[];
  };
  tools?: {
    tools: Array<{
      tool_id: string;
      name: string;
      enabled: boolean;
      description?: string;
    }>;
  };
  connectors?: {
    default_connector: string;
    connectors: Array<{
      id: string;
      provider: string;
      name: string;
      model: string;
    }>;
  };
  security?: {
    requires_auth: boolean;
    allowed_roles?: string[];
    rate_limit_enabled?: boolean;
  };
}

/**
 * Execution request
 */
export interface ExecutionRequest {
  inputs: Record<string, any>;
  workflow_name?: string;
  session_id?: string;
  streaming?: boolean;
}

/**
 * Execution response
 */
export interface ExecutionResponse {
  execution_id: string;
  agent_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  execution_time_ms?: number;
  session_id?: string;
  workflow_trace?: Array<{
    step_id: string;
    step_name: string;
    status: string;
    duration_ms?: number;
  }>;
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * Chat request
 */
export interface ChatRequest {
  message: string;
  session_id?: string;
  context?: Record<string, any>;
}

/**
 * Chat response
 */
export interface ChatResponse {
  session_id: string;
  message: ChatMessage;
  agent_id: string;
}

/**
 * Service for Agent Runtime operations.
 *
 * Provides:
 * - List available agents
 * - Get agent UI definitions
 * - Execute agents with inputs
 * - Chat functionality
 */
@Injectable({
  providedIn: 'root',
})
export class AgentRuntimeService {
  private readonly baseUrl = `${(environment as any).agentRuntimeUrl}/api/v1`;

  // State management
  private agentsSubject = new BehaviorSubject<AgentSummary[]>([]);
  public agents$ = this.agentsSubject.asObservable();

  private currentAgentSubject = new BehaviorSubject<AgentDefinition | null>(null);
  public currentAgent$ = this.currentAgentSubject.asObservable();

  private executingSubject = new BehaviorSubject<boolean>(false);
  public executing$ = this.executingSubject.asObservable();

  private lastExecutionSubject = new BehaviorSubject<ExecutionResponse | null>(null);
  public lastExecution$ = this.lastExecutionSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ============== AGENTS LISTING ==============

  /**
   * Get list of all available agents
   */
  getAgents(): Observable<AgentSummary[]> {
    return this.http.get<{ agents: AgentSummary[]; total: number } | AgentSummary[]>(`${this.baseUrl}/agents`).pipe(
      map((response) => {
        // Handle both array and object responses for backward compatibility
        if (Array.isArray(response)) {
          return response;
        }
        return response.agents || [];
      }),
      tap((agents) => this.agentsSubject.next(agents)),
      catchError(this.handleError)
    );
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: string): Observable<AgentSummary[]> {
    return this.agents$.pipe(
      map((agents) => agents.filter((a) => a.category === category))
    );
  }

  /**
   * Search agents by name or tags
   */
  searchAgents(query: string): Observable<AgentSummary[]> {
    const lowercaseQuery = query.toLowerCase();
    return this.agents$.pipe(
      map((agents) =>
        agents.filter(
          (a) =>
            a.name.toLowerCase().includes(lowercaseQuery) ||
            a.description.toLowerCase().includes(lowercaseQuery) ||
            a.tags.some((t) => t.toLowerCase().includes(lowercaseQuery))
        )
      )
    );
  }

  // ============== AGENT DETAILS ==============

  /**
   * Get full agent definition including UI
   */
  getAgent(agentId: string): Observable<AgentDefinition> {
    return this.http.get<AgentDefinition>(`${this.baseUrl}/agents/${agentId}`).pipe(
      tap((agent) => this.currentAgentSubject.next(agent)),
      catchError(this.handleError)
    );
  }

  /**
   * Get agent by slug
   */
  getAgentBySlug(slug: string): Observable<AgentDefinition> {
    return this.http.get<AgentDefinition>(`${this.baseUrl}/agents/slug/${slug}`).pipe(
      tap((agent) => this.currentAgentSubject.next(agent)),
      catchError(this.handleError)
    );
  }

  /**
   * Get agent UI layout only
   */
  getAgentUI(agentId: string): Observable<AgentUILayout> {
    return this.http.get<AgentUILayout>(`${this.baseUrl}/agents/${agentId}/ui`).pipe(
      catchError(this.handleError)
    );
  }

  // ============== EXECUTION ==============

  /**
   * Execute an agent with given inputs
   */
  executeAgent(agentId: string, request: ExecutionRequest): Observable<ExecutionResponse> {
    this.executingSubject.next(true);

    return this.http.post<ExecutionResponse>(`${this.baseUrl}/agents/${agentId}/execute`, request).pipe(
      tap((response) => {
        this.lastExecutionSubject.next(response);
        this.executingSubject.next(false);
      }),
      catchError((error) => {
        this.executingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Execute agent with streaming response
   */
  executeAgentStream(agentId: string, request: ExecutionRequest): Observable<string> {
    return new Observable((observer) => {
      const eventSource = new EventSource(
        `${this.baseUrl}/agents/${agentId}/execute/stream?` +
          new URLSearchParams({
            inputs: JSON.stringify(request.inputs),
            workflow_name: request.workflow_name || '',
            session_id: request.session_id || '',
          })
      );

      eventSource.onmessage = (event) => {
        observer.next(event.data);
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        observer.error(error);
      };

      eventSource.addEventListener('done', () => {
        eventSource.close();
        observer.complete();
      });

      return () => {
        eventSource.close();
      };
    });
  }

  /**
   * Get execution status
   */
  getExecutionStatus(executionId: string): Observable<ExecutionResponse> {
    return this.http.get<ExecutionResponse>(`${this.baseUrl}/executions/${executionId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ============== CHAT ==============

  /**
   * Send a chat message to an agent
   */
  chat(agentId: string, request: ChatRequest): Observable<ChatResponse> {
    this.executingSubject.next(true);

    return this.http.post<ChatResponse>(`${this.baseUrl}/agents/${agentId}/chat`, request).pipe(
      tap(() => this.executingSubject.next(false)),
      catchError((error) => {
        this.executingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Send chat message with streaming response
   */
  chatStream(agentId: string, request: ChatRequest): Observable<string> {
    return new Observable((observer) => {
      const eventSource = new EventSource(
        `${this.baseUrl}/agents/${agentId}/chat/stream?` +
          new URLSearchParams({
            message: request.message,
            session_id: request.session_id || '',
            context: JSON.stringify(request.context || {}),
          })
      );

      eventSource.onmessage = (event) => {
        observer.next(event.data);
      };

      eventSource.onerror = (error) => {
        eventSource.close();
        observer.error(error);
      };

      eventSource.addEventListener('done', () => {
        eventSource.close();
        observer.complete();
      });

      return () => {
        eventSource.close();
      };
    });
  }

  // ============== SESSION MANAGEMENT ==============

  /**
   * Create a new session for an agent
   */
  createSession(agentId: string): Observable<{ session_id: string }> {
    return this.http.post<{ session_id: string }>(`${this.baseUrl}/agents/${agentId}/sessions`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.baseUrl}/sessions/${sessionId}/history`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Clear session history
   */
  clearSession(sessionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/sessions/${sessionId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ============== STATE MANAGEMENT ==============

  /**
   * Set current agent
   */
  setCurrentAgent(agent: AgentDefinition | null): void {
    this.currentAgentSubject.next(agent);
  }

  /**
   * Get current agent
   */
  getCurrentAgent(): AgentDefinition | null {
    return this.currentAgentSubject.getValue();
  }

  /**
   * Clear state
   */
  clearState(): void {
    this.currentAgentSubject.next(null);
    this.lastExecutionSubject.next(null);
    this.executingSubject.next(false);
  }

  // ============== HEALTH CHECK ==============

  /**
   * Check if the runtime is healthy
   */
  healthCheck(): Observable<{ status: string; agents_count: number }> {
    return this.http.get<{ status: string; agents_count: number }>(`${(environment as any).agentRuntimeUrl}/health`).pipe(
      catchError(this.handleError)
    );
  }

  // ============== ERROR HANDLING ==============

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      if (error.error?.detail) {
        errorMessage = error.error.detail;
      }
    }

    console.error('AgentRuntimeService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
