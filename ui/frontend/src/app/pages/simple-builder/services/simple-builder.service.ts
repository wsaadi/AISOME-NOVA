import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

// ============== MODELS ==============

export interface SimpleAgentMetadata {
  created_at: string;
  updated_at: string;
  created_by: string | null;
  version: string;
  tags: string[];
}

export interface SimpleAgent {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  icon: string;
  category: string;
  status: 'draft' | 'active' | 'disabled';
  metadata: SimpleAgentMetadata;
  system_prompt: string;
  user_prompt_template?: string;
  export_formats: ('excel' | 'word' | 'powerpoint' | 'pdf')[];
  temperature: number;
  max_tokens: number;
  requires_auth: boolean;
  allowed_roles: string[];
  is_public: boolean;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: any[];
}

export interface BuilderResponse {
  message: string;
  conversation_status: 'needs_more_info' | 'ready_to_create' | 'out_of_scope' | 'in_progress' | 'error';
  generated_agent?: SimpleAgent;
  out_of_scope_summary?: string;
  questions?: string[];
}

export interface Conversation {
  id: string;
  status: string;
  messages: ConversationMessage[];
  created_at: string;
  generated_agent?: SimpleAgent;
  out_of_scope_summary?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SimpleBuilderService {
  // Uses Angular proxy in dev, nginx proxy in prod
  private readonly baseUrl = '/api/v1/simple-builder';

  // State
  private currentConversationSubject = new BehaviorSubject<Conversation | null>(null);
  public currentConversation$ = this.currentConversationSubject.asObservable();

  private agentsSubject = new BehaviorSubject<SimpleAgent[]>([]);
  public agents$ = this.agentsSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const userId = localStorage.getItem('user_id') || 'anonymous';
    const userRole = localStorage.getItem('user_role') || 'user';
    return new HttpHeaders({
      'X-User-ID': userId,
      'X-User-Role': userRole,
    });
  }

  // ============== CONVERSATION ==============

  /**
   * Start a new conversation with the Builder IA
   */
  startConversation(): Observable<{ conversation_id: string; welcome_message: string }> {
    this.isLoadingSubject.next(true);
    return this.http.post<{ conversation_id: string; welcome_message: string }>(
      `${this.baseUrl}/conversations`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        // Initialize conversation state
        this.currentConversationSubject.next({
          id: response.conversation_id,
          status: 'in_progress',
          messages: [{
            role: 'assistant',
            content: response.welcome_message,
            timestamp: new Date().toISOString()
          }],
          created_at: new Date().toISOString()
        });
        this.isLoadingSubject.next(false);
      })
    );
  }

  /**
   * Send a message in the current conversation
   */
  sendMessage(conversationId: string, message: string, attachments?: any[]): Observable<BuilderResponse> {
    this.isLoadingSubject.next(true);

    // Add user message to local state immediately
    const current = this.currentConversationSubject.value;
    if (current) {
      current.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        attachments
      });
      this.currentConversationSubject.next({ ...current });
    }

    return this.http.post<BuilderResponse>(
      `${this.baseUrl}/conversations/${conversationId}/messages`,
      { message, attachments },
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        // Add assistant response to local state
        const conv = this.currentConversationSubject.value;
        if (conv) {
          conv.messages.push({
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString()
          });
          conv.status = response.conversation_status;
          if (response.generated_agent) {
            conv.generated_agent = response.generated_agent;
          }
          if (response.out_of_scope_summary) {
            conv.out_of_scope_summary = response.out_of_scope_summary;
          }
          this.currentConversationSubject.next({ ...conv });
        }
        this.isLoadingSubject.next(false);
      })
    );
  }

  /**
   * Recover a conversation by ID
   */
  getConversation(conversationId: string): Observable<Conversation> {
    return this.http.get<Conversation>(
      `${this.baseUrl}/conversations/${conversationId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(conversation => {
        this.currentConversationSubject.next(conversation);
      })
    );
  }

  /**
   * Confirm and create the agent from conversation
   */
  confirmAndCreateAgent(conversationId: string): Observable<{ success: boolean; agent?: SimpleAgent; message?: string }> {
    this.isLoadingSubject.next(true);
    return this.http.post<{ success: boolean; agent?: SimpleAgent; message?: string }>(
      `${this.baseUrl}/conversations/${conversationId}/confirm`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        if (response.success && response.agent) {
          // Update conversation state
          const conv = this.currentConversationSubject.value;
          if (conv) {
            conv.status = 'completed';
            this.currentConversationSubject.next({ ...conv });
          }
          // Refresh agents list
          this.listAgents().subscribe();
        }
        this.isLoadingSubject.next(false);
      })
    );
  }

  /**
   * Reset the current conversation
   */
  resetConversation(): void {
    this.currentConversationSubject.next(null);
  }

  // ============== AGENTS CRUD ==============

  /**
   * List all agents accessible to the user
   */
  listAgents(page = 1, pageSize = 20, filters?: {
    category?: string;
    status?: string;
    search?: string;
  }): Observable<{ agents: SimpleAgent[]; total: number; page: number; page_size: number }> {
    let params: any = { page, page_size: pageSize };
    if (filters?.category) params.category = filters.category;
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;

    return this.http.get<{ agents: SimpleAgent[]; total: number; page: number; page_size: number }>(
      `${this.baseUrl}/agents`,
      { headers: this.getHeaders(), params }
    ).pipe(
      tap(response => {
        this.agentsSubject.next(response.agents);
      })
    );
  }

  /**
   * Get a single agent by ID
   */
  getAgent(agentId: string): Observable<{ success: boolean; agent?: SimpleAgent }> {
    return this.http.get<{ success: boolean; agent?: SimpleAgent }>(
      `${this.baseUrl}/agents/${agentId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Update an agent
   */
  updateAgent(agentId: string, updates: Partial<SimpleAgent>): Observable<{ success: boolean; agent?: SimpleAgent }> {
    return this.http.put<{ success: boolean; agent?: SimpleAgent }>(
      `${this.baseUrl}/agents/${agentId}`,
      updates,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Refresh agents list
        this.listAgents().subscribe();
      })
    );
  }

  /**
   * Delete an agent
   */
  deleteAgent(agentId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.baseUrl}/agents/${agentId}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Remove from local state
        const current = this.agentsSubject.value;
        this.agentsSubject.next(current.filter(a => a.id !== agentId));
      })
    );
  }

  /**
   * Activate an agent
   */
  activateAgent(agentId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.baseUrl}/agents/${agentId}/activate`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        this.listAgents().subscribe();
      })
    );
  }

  /**
   * Deactivate an agent
   */
  deactivateAgent(agentId: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(
      `${this.baseUrl}/agents/${agentId}/deactivate`,
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        this.listAgents().subscribe();
      })
    );
  }

  // ============== GETTERS ==============

  get currentConversation(): Conversation | null {
    return this.currentConversationSubject.value;
  }

  get agents(): SimpleAgent[] {
    return this.agentsSubject.value;
  }

  get isLoading(): boolean {
    return this.isLoadingSubject.value;
  }
}
