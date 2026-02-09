import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { AgentDefinition, AIBehavior, LLMProvider, PersonalityPreset } from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

@Component({
  selector: 'app-ai-behavior-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './ai-behavior-editor.component.html',
  styleUrls: ['./ai-behavior-editor.component.scss'],
})
export class AIBehaviorEditorComponent implements OnInit {
  @Input() agent!: AgentDefinition;

  personalityPresets: Record<string, PersonalityPreset> = {};
  selectedPreset: string | null = null;

  providers: { id: LLMProvider; name: string; icon: string; models: string[] }[] = [
    {
      id: 'mistral',
      name: 'Mistral AI',
      icon: 'fa fa-bolt',
      models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
    },
    {
      id: 'openai',
      name: 'OpenAI',
      icon: 'fa fa-robot',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      icon: 'fa fa-brain',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      icon: 'fa fa-gem',
      models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      icon: 'fa fa-search',
      models: ['sonar', 'sonar-pro', 'sonar-reasoning-pro', 'sonar-deep-research'],
    },
    {
      id: 'nvidia-nim',
      name: 'NVIDIA NIM',
      icon: 'fa fa-microchip',
      models: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct', 'meta/llama-3.1-405b-instruct'],
    },
  ];

  tones = [
    { id: 'professional', name: 'Professional', icon: 'fa fa-briefcase' },
    { id: 'friendly', name: 'Friendly', icon: 'fa fa-smile' },
    { id: 'technical', name: 'Technical', icon: 'fa fa-cog' },
    { id: 'creative', name: 'Creative', icon: 'fa fa-palette' },
    { id: 'formal', name: 'Formal', icon: 'fa fa-user-tie' },
    { id: 'casual', name: 'Casual', icon: 'fa fa-coffee' },
  ];

  constructor(private agentBuilderService: AgentBuilderService) {}

  ngOnInit(): void {
    this.loadPersonalityPresets();
  }

  private loadPersonalityPresets(): void {
    this.agentBuilderService.getPersonalityPresets().subscribe({
      next: (presets) => {
        this.personalityPresets = presets;
      },
      error: (error) => {
        console.error('Failed to load personality presets:', error);
        // Default presets
        this.personalityPresets = {
          professional: {
            system_prompt:
              'You are a professional business assistant. Provide clear, concise, and actionable responses.',
            tone: 'professional',
            traits: [{ trait: 'professional', intensity: 1.5 }],
          },
          friendly: {
            system_prompt: 'You are a friendly and helpful assistant. Be warm and approachable.',
            tone: 'friendly',
            traits: [{ trait: 'friendly', intensity: 1.5 }],
          },
          technical: {
            system_prompt: 'You are a technical expert. Provide detailed and accurate information.',
            tone: 'technical',
            traits: [{ trait: 'technical', intensity: 1.5 }],
          },
        };
      },
    });
  }

  get behavior(): AIBehavior {
    return this.agent.ai_behavior;
  }

  updateBehavior(updates: Partial<AIBehavior>): void {
    const newBehavior: AIBehavior = {
      ...this.behavior,
      ...updates,
    };
    this.agentBuilderService.updateCurrentAgentLocally({ ai_behavior: newBehavior });
  }

  applyPreset(presetKey: string): void {
    const preset = this.personalityPresets[presetKey];
    if (preset) {
      this.updateBehavior({
        system_prompt: preset.system_prompt,
        tone: preset.tone,
        personality_traits: preset.traits,
      });
      this.selectedPreset = presetKey;
    }
  }

  getAvailableModels(): string[] {
    const provider = this.providers.find((p) => p.id === this.behavior.default_provider);
    return provider?.models || [];
  }

  getProviderIcon(providerId: LLMProvider): string {
    const provider = this.providers.find((p) => p.id === providerId);
    return provider?.icon || 'fa fa-robot';
  }

  formatTemperature(value: number): string {
    return value.toFixed(1);
  }

  formatTokens(value: number): string {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  }
}
