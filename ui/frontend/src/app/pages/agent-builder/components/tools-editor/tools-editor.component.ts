import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

import { AgentDefinition, AvailableTool, ToolConfiguration, ToolCategory } from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

@Component({
  selector: 'app-tools-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatExpansionModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatBadgeModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    DragDropModule,
    TranslateModule,
  ],
  templateUrl: './tools-editor.component.html',
  styleUrls: ['./tools-editor.component.scss'],
})
export class ToolsEditorComponent implements OnInit {
  @Input() agent!: AgentDefinition;

  availableTools: AvailableTool[] = [];
  filteredTools: AvailableTool[] = [];
  selectedCategory: ToolCategory | 'all' = 'all';
  searchQuery = '';

  categories: { id: ToolCategory | 'all'; name: string; icon: string }[] = [
    { id: 'all', name: 'All Tools', icon: 'fa fa-th' },
    { id: 'document_processing', name: 'Document Processing', icon: 'fa fa-file-alt' },
    { id: 'data_extraction', name: 'Data Extraction', icon: 'fa fa-file-import' },
    { id: 'search', name: 'Search', icon: 'fa fa-search' },
    { id: 'governance', name: 'Governance', icon: 'fa fa-shield-alt' },
    { id: 'integration', name: 'Integration', icon: 'fa fa-plug' },
  ];

  constructor(private agentBuilderService: AgentBuilderService) {}

  ngOnInit(): void {
    this.loadAvailableTools();
  }

  private loadAvailableTools(): void {
    this.agentBuilderService.getAvailableTools().subscribe({
      next: (tools) => {
        this.availableTools = tools;
        this.filterTools();
      },
      error: (error) => {
        console.error('Failed to load tools:', error);
      },
    });
  }

  filterTools(): void {
    let tools = [...this.availableTools];

    // Filter by category
    if (this.selectedCategory !== 'all') {
      tools = tools.filter((t) => t.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      tools = tools.filter(
        (t) => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)
      );
    }

    // Exclude already added tools
    const addedToolIds = new Set(this.agent.tools.map((t) => t.tool_id));
    this.filteredTools = tools.filter((t) => !addedToolIds.has(t.id));
  }

  selectCategory(categoryId: ToolCategory | 'all'): void {
    this.selectedCategory = categoryId;
    this.filterTools();
  }

  addTool(tool: AvailableTool): void {
    const toolConfig: ToolConfiguration = {
      id: this.agentBuilderService.generateUniqueId(),
      tool_id: tool.id,
      tool_name: tool.name,
      enabled: true,
      parameters: [],
      on_error: 'continue',
      retry_count: 0,
    };

    const newTools = [...this.agent.tools, toolConfig];
    this.agentBuilderService.updateCurrentAgentLocally({ tools: newTools });
    this.filterTools();
  }

  removeTool(toolConfig: ToolConfiguration): void {
    const newTools = this.agent.tools.filter((t) => t.id !== toolConfig.id);
    this.agentBuilderService.updateCurrentAgentLocally({ tools: newTools });
    this.filterTools();
  }

  toggleToolEnabled(toolConfig: ToolConfiguration): void {
    const newTools = this.agent.tools.map((t) =>
      t.id === toolConfig.id ? { ...t, enabled: !t.enabled } : t
    );
    this.agentBuilderService.updateCurrentAgentLocally({ tools: newTools });
  }

  getToolInfo(toolId: string): AvailableTool | undefined {
    return this.availableTools.find((t) => t.id === toolId);
  }

  onToolDrop(event: CdkDragDrop<ToolConfiguration[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      const newTools = [...this.agent.tools];
      moveItemInArray(newTools, event.previousIndex, event.currentIndex);
      this.agentBuilderService.updateCurrentAgentLocally({ tools: newTools });
    }
  }

  getCategoryIcon(category: ToolCategory): string {
    const icons: Record<ToolCategory, string> = {
      document_processing: 'fa fa-file-alt',
      content_generation: 'fa fa-pen',
      data_extraction: 'fa fa-file-import',
      search: 'fa fa-search',
      communication: 'fa fa-envelope',
      governance: 'fa fa-shield-alt',
      analytics: 'fa fa-chart-line',
      integration: 'fa fa-plug',
    };
    return icons[category] || 'fa fa-puzzle-piece';
  }

  getCategoryLabel(category: ToolCategory): string {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  get enabledToolsCount(): number {
    return this.agent.tools.filter((t) => t.enabled).length;
  }
}
