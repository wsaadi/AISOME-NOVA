/**
 * Token Tracking Interceptor
 *
 * Intercepts HTTP responses from AI-related endpoints and automatically
 * records token consumption when usage data is present in the response.
 */

import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { TokenConsumptionService } from '../services/token-consumption.service';
import { RoleService } from '../services/role.service';
import { AIProvider } from '../models/token-consumption.model';

/**
 * Patterns for AI-related API endpoints that may return token usage
 */
const AI_ENDPOINT_PATTERNS = [
  '/api/v1/chat/completions',
  '/api/v1/mistral/',
  '/api/v1/openai/',
  '/api/v1/anthropic/',
  '/api/v1/gemini/',
  '/api/v1/perplexity/',
  '/api/v1/analyze/',
  '/api/v1/monitoring/',
  '/api/v1/contract/',
  '/api/v1/pod/',
  '/api/v1/appointment/',
];

/**
 * Extract provider from URL or response
 */
function extractProvider(url: string, response: any): AIProvider {
  // Check URL first
  if (url.includes('mistral')) return 'mistral';
  if (url.includes('openai')) return 'openai';
  if (url.includes('anthropic')) return 'anthropic';
  if (url.includes('gemini')) return 'gemini';
  if (url.includes('perplexity')) return 'perplexity';

  // Check response
  if (response?.provider) return response.provider as AIProvider;
  if (response?.model) {
    const model = response.model.toLowerCase();
    if (model.includes('mistral')) return 'mistral';
    if (model.includes('gpt') || model.includes('openai')) return 'openai';
    if (model.includes('claude') || model.includes('anthropic')) return 'anthropic';
    if (model.includes('gemini')) return 'gemini';
    if (model.includes('llama') || model.includes('sonar')) return 'perplexity';
  }

  return 'mistral'; // Default
}

/**
 * Extract agent info from URL
 */
function extractAgentInfo(url: string): { agentId: string; agentName: string } {
  if (url.includes('/chat/completions')) {
    return { agentId: 'chat', agentName: 'Chat IA' };
  }
  if (url.includes('/analyze/')) {
    return { agentId: 'document-analyzer', agentName: 'Analyseur de Documents' };
  }
  if (url.includes('/monitoring/')) {
    return { agentId: 'web-monitoring', agentName: 'Veille Technologique' };
  }
  if (url.includes('/contract/')) {
    return { agentId: 'contract-analysis', agentName: 'Analyse de Contrats' };
  }
  if (url.includes('/pod/')) {
    return { agentId: 'pod-analyzer', agentName: 'Analyseur POD' };
  }
  if (url.includes('/appointment/')) {
    return { agentId: 'appointment-scheduler', agentName: 'Planificateur RDV' };
  }

  return { agentId: 'unknown', agentName: 'Agent IA' };
}

@Injectable()
export class TokenTrackingInterceptor implements HttpInterceptor {
  private tokenConsumptionService = inject(TokenConsumptionService);
  private roleService = inject(RoleService);

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if this is an AI-related endpoint
    const isAiEndpoint = AI_ENDPOINT_PATTERNS.some(pattern =>
      request.url.includes(pattern)
    );

    if (!isAiEndpoint) {
      return next.handle(request);
    }

    const startTime = Date.now();

    return next.handle(request).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse && event.body) {
            this.processResponse(request.url, event.body, startTime);
          }
        }
      })
    );
  }

  private async processResponse(url: string, response: any, startTime: number): Promise<void> {
    // Check if response contains usage data
    const usage = response?.usage;
    if (!usage) {
      // No usage data - try to extract from nested fields
      const nestedUsage = response?.result?.usage || response?.data?.usage;
      if (!nestedUsage) {
        console.log('📊 No token usage data in response for:', url);
        return;
      }
    }

    const usageData = response?.usage || response?.result?.usage || response?.data?.usage;

    // Extract token counts
    const promptTokens = usageData?.prompt_tokens || usageData?.input_tokens || 0;
    const completionTokens = usageData?.completion_tokens || usageData?.output_tokens || 0;

    if (promptTokens === 0 && completionTokens === 0) {
      console.log('📊 Zero tokens in response for:', url);
      return;
    }

    // Get user profile
    try {
      const profile = await this.roleService.getUserProfile();
      const userId = profile?.id || 'anonymous';
      const username = profile?.username || profile?.email || 'Utilisateur';

      // Extract provider and agent info
      const provider = extractProvider(url, response);
      const { agentId, agentName } = extractAgentInfo(url);
      const model = response?.model || 'unknown';
      const durationMs = Date.now() - startTime;

      // Record consumption
      this.tokenConsumptionService.recordConsumption({
        userId,
        username,
        agentId,
        agentName,
        provider,
        model,
        promptTokens,
        completionTokens,
        durationMs
      });

      console.log('📊 Token consumption auto-tracked:', {
        url,
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        agentId
      });
    } catch (error) {
      console.error('Error recording token consumption:', error);
    }
  }
}

/**
 * Provider for the interceptor
 */
export const tokenTrackingInterceptorProvider = {
  provide: HTTP_INTERCEPTORS,
  useClass: TokenTrackingInterceptor,
  multi: true
};
