import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';

import { AgentDefinition, UIComponent, LayoutSection, ComponentType, DashboardConfig } from '../../models/agent.models';

@Component({
  selector: 'app-agent-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSliderModule,
    MatChipsModule,
    MatProgressBarModule,
    TranslateModule,
  ],
  templateUrl: './agent-preview.component.html',
  styleUrls: ['./agent-preview.component.scss'],
})
export class AgentPreviewComponent {
  @Input() agent!: AgentDefinition;

  previewData: Record<string, any> = {};
  chatMessages: { role: string; content: string }[] = [];
  chatInput = '';

  isInputComponent(type: ComponentType): boolean {
    const inputTypes: ComponentType[] = [
      'text_input',
      'textarea',
      'number_input',
      'email_input',
      'password_input',
      'date_picker',
      'time_picker',
      'datetime_picker',
      'select',
      'multi_select',
      'checkbox',
      'radio_group',
      'slider',
      'toggle',
    ];
    return inputTypes.includes(type);
  }

  isFileComponent(type: ComponentType): boolean {
    const fileTypes: ComponentType[] = ['file_upload', 'image_upload', 'document_upload', 'document_repository'];
    return fileTypes.includes(type);
  }

  isDisplayComponent(type: ComponentType): boolean {
    const displayTypes: ComponentType[] = [
      'text_display',
      'markdown_viewer',
      'pdf_viewer',
      'image_viewer',
      'code_viewer',
    ];
    return displayTypes.includes(type);
  }

  isChartComponent(type: ComponentType): boolean {
    const chartTypes: ComponentType[] = ['bar_chart', 'line_chart', 'pie_chart', 'donut_chart'];
    return chartTypes.includes(type);
  }

  isInteractiveComponent(type: ComponentType): boolean {
    const interactiveTypes: ComponentType[] = [
      'chat_interface',
      'button',
      'button_group',
      'progress_bar',
      'data_table',
      'list',
      'tree_view',
    ];
    return interactiveTypes.includes(type);
  }

  getInputType(type: ComponentType): string {
    const typeMap: Record<string, string> = {
      text_input: 'text',
      number_input: 'number',
      email_input: 'email',
      password_input: 'password',
      date_picker: 'date',
      time_picker: 'time',
      datetime_picker: 'datetime-local',
    };
    return typeMap[type] || 'text';
  }

  sendChatMessage(): void {
    if (!this.chatInput.trim()) return;

    this.chatMessages.push({
      role: 'user',
      content: this.chatInput,
    });

    // Simulate AI response
    setTimeout(() => {
      this.chatMessages.push({
        role: 'assistant',
        content: `This is a preview response. In the real agent, I would respond based on the configured AI behavior.`,
      });
    }, 500);

    this.chatInput = '';
  }

  getSectionStyle(section: LayoutSection): Record<string, string> {
    const style: Record<string, string> = {};

    if (section.layout_type === 'grid') {
      style['display'] = 'grid';
      style['grid-template-columns'] = `repeat(${section.grid_columns || 2}, 1fr)`;
    } else if (section.layout_type === 'row') {
      style['display'] = 'flex';
      style['flex-direction'] = 'row';
      style['flex-wrap'] = 'wrap';
    } else {
      style['display'] = 'flex';
      style['flex-direction'] = 'column';
    }

    style['gap'] = section.gap || '16px';

    return style;
  }

  // ============== DASHBOARD GRID MODE ==============

  isDashboardMode(): boolean {
    return this.agent?.ui_layout?.layout_mode === 'dashboard' &&
           (this.agent?.ui_layout?.widgets?.length ?? 0) > 0;
  }

  getWidgets(): UIComponent[] {
    return this.agent?.ui_layout?.widgets || [];
  }

  getDashboardGridStyle(): Record<string, string> {
    const config: DashboardConfig = this.agent?.ui_layout?.dashboard_config || {
      columns: 12,
      rowHeight: 60,
      gap: 10
    };
    const widgets = this.getWidgets();
    const maxRow = widgets.reduce((max, w) =>
      Math.max(max, (w.gridPosition?.y || 0) + (w.gridPosition?.h || 2)), 4);

    return {
      'display': 'grid',
      'grid-template-columns': `repeat(${config.columns}, 1fr)`,
      'grid-template-rows': `repeat(${maxRow}, ${config.rowHeight}px)`,
      'gap': `${config.gap}px`,
      'min-height': `${maxRow * (config.rowHeight + config.gap)}px`
    };
  }

  getWidgetGridStyle(widget: UIComponent): Record<string, string> {
    const pos = widget.gridPosition || { x: 0, y: 0, w: 4, h: 2 };
    return {
      'grid-column': `${pos.x + 1} / span ${pos.w}`,
      'grid-row': `${pos.y + 1} / span ${pos.h}`,
      'min-height': '0'
    };
  }
}
