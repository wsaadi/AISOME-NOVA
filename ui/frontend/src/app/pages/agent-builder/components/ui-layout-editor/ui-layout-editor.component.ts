import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem, copyArrayItem } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

import {
  AgentDefinition,
  UILayout,
  LayoutSection,
  UIComponent,
  ComponentType,
  ComponentTypeInfo,
  UITemplate,
} from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

@Component({
  selector: 'app-ui-layout-editor',
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
    MatExpansionModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatMenuModule,
    MatTabsModule,
    MatDialogModule,
    DragDropModule,
    TranslateModule,
  ],
  templateUrl: './ui-layout-editor.component.html',
  styleUrls: ['./ui-layout-editor.component.scss'],
})
export class UILayoutEditorComponent implements OnInit {
  @Input() agent!: AgentDefinition;

  componentTypes: ComponentTypeInfo[] = [];
  templates: Record<string, UITemplate> = {};
  selectedSection: LayoutSection | null = null;
  selectedComponent: UIComponent | null = null;

  // Component categories for the palette
  componentCategories = [
    { id: 'input', name: 'Input', icon: 'fa fa-keyboard' },
    { id: 'file', name: 'Files', icon: 'fa fa-file' },
    { id: 'display', name: 'Display', icon: 'fa fa-desktop' },
    { id: 'chart', name: 'Charts', icon: 'fa fa-chart-bar' },
    { id: 'layout', name: 'Layout', icon: 'fa fa-th-large' },
    { id: 'interactive', name: 'Interactive', icon: 'fa fa-hand-pointer' },
  ];

  selectedComponentCategory = 'input';

  constructor(
    private agentBuilderService: AgentBuilderService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadComponentTypes();
    this.loadTemplates();
  }

  private loadComponentTypes(): void {
    this.agentBuilderService.getComponentTypes().subscribe({
      next: (types) => {
        this.componentTypes = types;
      },
      error: (error) => {
        console.error('Failed to load component types:', error);
        // Fallback to default component types
        this.componentTypes = this.getDefaultComponentTypes();
      },
    });
  }

  private loadTemplates(): void {
    this.agentBuilderService.getUITemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
      },
      error: (error) => {
        console.error('Failed to load templates:', error);
      },
    });
  }

  private getDefaultComponentTypes(): ComponentTypeInfo[] {
    return [
      { type: 'text_input', name: 'Text Input', category: 'input', icon: 'fa fa-font', description: 'Single line text input' },
      { type: 'textarea', name: 'Text Area', category: 'input', icon: 'fa fa-align-left', description: 'Multi-line text input' },
      { type: 'number_input', name: 'Number', category: 'input', icon: 'fa fa-hashtag', description: 'Numeric input' },
      { type: 'email_input', name: 'Email', category: 'input', icon: 'fa fa-envelope', description: 'Email input' },
      { type: 'date_picker', name: 'Date Picker', category: 'input', icon: 'fa fa-calendar', description: 'Date selection' },
      { type: 'select', name: 'Select', category: 'input', icon: 'fa fa-list', description: 'Dropdown selection' },
      { type: 'checkbox', name: 'Checkbox', category: 'input', icon: 'fa fa-check-square', description: 'Boolean checkbox' },
      { type: 'radio_group', name: 'Radio Group', category: 'input', icon: 'fa fa-dot-circle', description: 'Single choice selection' },
      { type: 'slider', name: 'Slider', category: 'input', icon: 'fa fa-sliders-h', description: 'Range slider' },
      { type: 'toggle', name: 'Toggle', category: 'input', icon: 'fa fa-toggle-on', description: 'On/off toggle' },
      { type: 'file_upload', name: 'File Upload', category: 'file', icon: 'fa fa-upload', description: 'File upload' },
      { type: 'image_upload', name: 'Image Upload', category: 'file', icon: 'fa fa-image', description: 'Image upload' },
      { type: 'document_upload', name: 'Document Upload', category: 'file', icon: 'fa fa-file-upload', description: 'Document upload' },
      { type: 'document_repository', name: 'Document Repository', category: 'file', icon: 'fa fa-folder-open', description: 'Repository for PDF, Word, Excel, PowerPoint, PNG, JPG files' },
      { type: 'text_display', name: 'Text Display', category: 'display', icon: 'fa fa-text-width', description: 'Display text' },
      { type: 'markdown_viewer', name: 'Markdown', category: 'display', icon: 'fa fa-markdown', description: 'Render markdown' },
      { type: 'pdf_viewer', name: 'PDF Viewer', category: 'display', icon: 'fa fa-file-pdf', description: 'Display PDF' },
      { type: 'code_viewer', name: 'Code Viewer', category: 'display', icon: 'fa fa-code', description: 'Display code' },
      { type: 'bar_chart', name: 'Bar Chart', category: 'chart', icon: 'fa fa-chart-bar', description: 'Bar chart' },
      { type: 'line_chart', name: 'Line Chart', category: 'chart', icon: 'fa fa-chart-line', description: 'Line chart' },
      { type: 'pie_chart', name: 'Pie Chart', category: 'chart', icon: 'fa fa-chart-pie', description: 'Pie chart' },
      { type: 'donut_chart', name: 'Donut Chart', category: 'chart', icon: 'fa fa-circle-notch', description: 'Donut chart' },
      { type: 'card', name: 'Card', category: 'layout', icon: 'fa fa-square', description: 'Container card' },
      { type: 'tabs', name: 'Tabs', category: 'layout', icon: 'fa fa-folder', description: 'Tabbed content' },
      { type: 'divider', name: 'Divider', category: 'layout', icon: 'fa fa-minus', description: 'Visual separator' },
      { type: 'spacer', name: 'Spacer', category: 'layout', icon: 'fa fa-arrows-alt-v', description: 'Empty space' },
      { type: 'grid', name: 'Grid', category: 'layout', icon: 'fa fa-th', description: 'Grid layout' },
      { type: 'chat_interface', name: 'Chat', category: 'interactive', icon: 'fa fa-comments', description: 'Chat interface' },
      { type: 'button', name: 'Button', category: 'interactive', icon: 'fa fa-square', description: 'Action button' },
      { type: 'progress_bar', name: 'Progress Bar', category: 'interactive', icon: 'fa fa-tasks', description: 'Progress indicator' },
      { type: 'data_table', name: 'Data Table', category: 'interactive', icon: 'fa fa-table', description: 'Data table' },
    ];
  }

  get filteredComponents(): ComponentTypeInfo[] {
    return this.componentTypes.filter((c) => c.category === this.selectedComponentCategory);
  }

  // ============== SECTIONS ==============

  addSection(): void {
    const newSection = this.agentBuilderService.createDefaultSection();
    newSection.title = `Section ${this.agent.ui_layout.sections.length + 1}`;

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: [...this.agent.ui_layout.sections, newSection],
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
    this.selectSection(newSection);
  }

  removeSection(section: LayoutSection): void {
    const newSections = this.agent.ui_layout.sections.filter((s) => s.id !== section.id);
    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: newSections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });

    if (this.selectedSection?.id === section.id) {
      this.selectedSection = null;
      this.selectedComponent = null;
    }
  }

  selectSection(section: LayoutSection): void {
    this.selectedSection = section;
    this.selectedComponent = null;
  }

  updateSectionProperty(section: LayoutSection, property: string, value: any): void {
    const newSections = this.agent.ui_layout.sections.map((s) =>
      s.id === section.id ? { ...s, [property]: value } : s
    );

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: newSections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  onSectionDrop(event: CdkDragDrop<LayoutSection[]>): void {
    const newSections = [...this.agent.ui_layout.sections];
    moveItemInArray(newSections, event.previousIndex, event.currentIndex);

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: newSections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  // ============== COMPONENTS ==============

  addComponentToSection(section: LayoutSection, componentType: ComponentTypeInfo): void {
    const newComponent = this.agentBuilderService.createDefaultComponent(componentType.type);

    const newSections = this.agent.ui_layout.sections.map((s) =>
      s.id === section.id
        ? { ...s, components: [...s.components, newComponent] }
        : s
    );

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: newSections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  removeComponent(section: LayoutSection, component: UIComponent): void {
    const newComponents = section.components.filter((c) => c.id !== component.id);
    const newSections = this.agent.ui_layout.sections.map((s) =>
      s.id === section.id ? { ...s, components: newComponents } : s
    );

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: newSections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });

    if (this.selectedComponent?.id === component.id) {
      this.selectedComponent = null;
    }
  }

  selectComponent(component: UIComponent): void {
    this.selectedComponent = component;
  }

  updateComponentProperty(component: UIComponent, property: string, value: any): void {
    const newSections = this.agent.ui_layout.sections.map((section) => ({
      ...section,
      components: section.components.map((c) =>
        c.id === component.id ? { ...c, [property]: value } : c
      ),
    }));

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections: newSections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  onComponentDrop(event: CdkDragDrop<UIComponent[]>, targetSection: LayoutSection): void {
    if (event.previousContainer === event.container) {
      // Reorder within same section
      const section = this.agent.ui_layout.sections.find((s) => s.id === targetSection.id);
      if (section) {
        const newComponents = [...section.components];
        moveItemInArray(newComponents, event.previousIndex, event.currentIndex);

        const newSections = this.agent.ui_layout.sections.map((s) =>
          s.id === targetSection.id ? { ...s, components: newComponents } : s
        );

        const newLayout: UILayout = {
          ...this.agent.ui_layout,
          sections: newSections,
        };

        this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
      }
    } else if (event.previousContainer.id === 'component-palette') {
      // Add from palette
      const componentType = this.componentTypes.find(
        (c) => c.type === (event.item.data as ComponentTypeInfo).type
      );
      if (componentType) {
        this.addComponentToSection(targetSection, componentType);
      }
    } else {
      // Move between sections
      const sourceSectionId = event.previousContainer.id.replace('section-', '');
      const sourceSection = this.agent.ui_layout.sections.find((s) => s.id === sourceSectionId);

      if (sourceSection) {
        const movedComponent = sourceSection.components[event.previousIndex];

        const newSections = this.agent.ui_layout.sections.map((s) => {
          if (s.id === sourceSectionId) {
            return {
              ...s,
              components: s.components.filter((_, i) => i !== event.previousIndex),
            };
          }
          if (s.id === targetSection.id) {
            const newComponents = [...s.components];
            newComponents.splice(event.currentIndex, 0, movedComponent);
            return { ...s, components: newComponents };
          }
          return s;
        });

        const newLayout: UILayout = {
          ...this.agent.ui_layout,
          sections: newSections,
        };

        this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
      }
    }
  }

  // ============== HEADER/LAYOUT SETTINGS ==============

  updateLayoutSetting(property: string, value: any): void {
    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      [property]: value,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  // ============== TEMPLATES ==============

  applyTemplate(templateKey: string): void {
    const template = this.templates[templateKey];
    if (!template) return;

    const sections: LayoutSection[] = template.sections.map((s, index) => ({
      id: this.agentBuilderService.generateUniqueId(),
      name: s.name || `section_${index}`,
      title: s.title,
      description: s.description,
      layout_type: s.layout_type || 'column',
      grid_columns: s.grid_columns,
      gap: s.gap || '16px',
      components: (s.components || []).map((c) => ({
        ...this.agentBuilderService.createDefaultComponent(c.type as string),
        ...c,
        id: this.agentBuilderService.generateUniqueId(),
      })),
      style: s.style || {},
    }));

    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      sections,
    };

    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  getComponentIcon(type: ComponentType): string {
    const comp = this.componentTypes.find((c) => c.type === type);
    return comp?.icon || 'fa fa-puzzle-piece';
  }

  getComponentName(type: ComponentType): string {
    const comp = this.componentTypes.find((c) => c.type === type);
    return comp?.name || type;
  }

  isChartComponent(type: ComponentType): boolean {
    const chartTypes: ComponentType[] = ['bar_chart', 'line_chart', 'pie_chart', 'donut_chart'];
    return chartTypes.includes(type);
  }

  getDropListIds(): string[] {
    return this.agent.ui_layout.sections.map((s) => `section-${s.id}`);
  }
}
