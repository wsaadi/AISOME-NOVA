import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DragDropModule, CdkDragDrop, CdkDragMove, CdkDragEnd } from '@angular/cdk/drag-drop';
import { TranslateModule } from '@ngx-translate/core';

import {
  AgentDefinition,
  UIComponent,
  UILayout,
  ComponentType,
  ComponentTypeInfo,
  GridPosition,
  DashboardConfig,
} from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

interface GridCell {
  x: number;
  y: number;
  occupied: boolean;
  widgetId?: string;
}

@Component({
  selector: 'app-widget-grid-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatSliderModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    DragDropModule,
    TranslateModule,
  ],
  templateUrl: './widget-grid-editor.component.html',
  styleUrls: ['./widget-grid-editor.component.scss'],
})
export class WidgetGridEditorComponent implements OnInit, OnChanges {
  @Input() agent!: AgentDefinition;
  @Output() widgetSelected = new EventEmitter<UIComponent | null>();

  componentTypes: ComponentTypeInfo[] = [];
  selectedWidget: UIComponent | null = null;

  // Grid configuration
  gridConfig: DashboardConfig = {
    columns: 12,
    rowHeight: 80,
    gap: 12,
    compactType: 'vertical'
  };

  // Grid state
  gridRows = 8;
  gridCells: GridCell[][] = [];

  // Drag state
  isDragging = false;
  dragPreviewPosition: GridPosition | null = null;

  // Resize state
  isResizing = false;
  resizingWidget: UIComponent | null = null;
  resizeStartX = 0;
  resizeStartY = 0;
  resizeStartW = 0;
  resizeStartH = 0;

  // Drag (move) state
  draggingWidget: UIComponent | null = null;
  dragStartX = 0;
  dragStartY = 0;
  dragStartGridX = 0;
  dragStartGridY = 0;

  // Component categories for quick add
  widgetCategories = [
    {
      id: 'input',
      name: 'Entrées',
      icon: 'fa fa-keyboard',
      widgets: [
        { type: 'text_input', name: 'Texte', icon: 'fa fa-font', defaultSize: { w: 4, h: 1 } },
        { type: 'textarea', name: 'Zone de texte', icon: 'fa fa-align-left', defaultSize: { w: 6, h: 2 } },
        { type: 'select', name: 'Liste déroulante', icon: 'fa fa-list', defaultSize: { w: 3, h: 1 } },
        { type: 'date_picker', name: 'Date', icon: 'fa fa-calendar', defaultSize: { w: 3, h: 1 } },
        { type: 'number_input', name: 'Nombre', icon: 'fa fa-hashtag', defaultSize: { w: 2, h: 1 } },
        { type: 'checkbox', name: 'Case à cocher', icon: 'fa fa-check-square', defaultSize: { w: 2, h: 1 } },
      ]
    },
    {
      id: 'file',
      name: 'Fichiers',
      icon: 'fa fa-file',
      widgets: [
        { type: 'file_upload', name: 'Upload fichier', icon: 'fa fa-upload', defaultSize: { w: 4, h: 2 } },
        { type: 'document_repository', name: 'Dépôt documents', icon: 'fa fa-folder-open', defaultSize: { w: 6, h: 3 } },
      ]
    },
    {
      id: 'display',
      name: 'Affichage',
      icon: 'fa fa-desktop',
      widgets: [
        { type: 'markdown_viewer', name: 'Résultat IA', icon: 'fa fa-robot', defaultSize: { w: 8, h: 4 } },
        { type: 'text_display', name: 'Texte', icon: 'fa fa-text-width', defaultSize: { w: 4, h: 1 } },
        { type: 'code_viewer', name: 'Code', icon: 'fa fa-code', defaultSize: { w: 6, h: 3 } },
      ]
    },
    {
      id: 'chart',
      name: 'Graphiques',
      icon: 'fa fa-chart-bar',
      widgets: [
        { type: 'line_chart', name: 'Courbes (évolution)', icon: 'fa fa-chart-line', defaultSize: { w: 6, h: 3 }, description: 'Idéal pour montrer des tendances temporelles' },
        { type: 'bar_chart', name: 'Barres (comparaison)', icon: 'fa fa-chart-bar', defaultSize: { w: 6, h: 3 }, description: 'Idéal pour comparer des valeurs' },
        { type: 'pie_chart', name: 'Camembert (répartition)', icon: 'fa fa-chart-pie', defaultSize: { w: 4, h: 3 }, description: 'Idéal pour montrer des pourcentages' },
        { type: 'donut_chart', name: 'Donut (proportions)', icon: 'fa fa-circle-notch', defaultSize: { w: 4, h: 3 }, description: 'Similaire au camembert avec un trou central' },
      ]
    },
    {
      id: 'action',
      name: 'Actions',
      icon: 'fa fa-play',
      widgets: [
        { type: 'button', name: 'Bouton exécuter', icon: 'fa fa-play-circle', defaultSize: { w: 2, h: 1 }, isTrigger: true },
        { type: 'chat_interface', name: 'Chat', icon: 'fa fa-comments', defaultSize: { w: 12, h: 5 } },
      ]
    },
  ];

  selectedCategory = 'input';

  constructor(private agentBuilderService: AgentBuilderService) {}

  ngOnInit(): void {
    this.initializeGrid();
    this.loadWidgets();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agent']) {
      this.loadWidgets();
    }
  }

  private initializeGrid(): void {
    // Initialize dashboard config from agent or use defaults
    if (this.agent?.ui_layout?.dashboard_config) {
      this.gridConfig = { ...this.gridConfig, ...this.agent.ui_layout.dashboard_config };
    }
    this.buildGridCells();
  }

  private buildGridCells(): void {
    this.gridCells = [];
    for (let y = 0; y < this.gridRows; y++) {
      const row: GridCell[] = [];
      for (let x = 0; x < this.gridConfig.columns; x++) {
        row.push({ x, y, occupied: false });
      }
      this.gridCells.push(row);
    }
    this.updateOccupiedCells();
  }

  private updateOccupiedCells(): void {
    // Reset all cells
    for (const row of this.gridCells) {
      for (const cell of row) {
        cell.occupied = false;
        cell.widgetId = undefined;
      }
    }

    // Mark occupied cells
    const widgets = this.getWidgets();
    for (const widget of widgets) {
      if (widget.gridPosition) {
        const pos = widget.gridPosition;
        for (let y = pos.y; y < pos.y + pos.h && y < this.gridRows; y++) {
          for (let x = pos.x; x < pos.x + pos.w && x < this.gridConfig.columns; x++) {
            if (this.gridCells[y] && this.gridCells[y][x]) {
              this.gridCells[y][x].occupied = true;
              this.gridCells[y][x].widgetId = widget.id;
            }
          }
        }
      }
    }
  }

  private loadWidgets(): void {
    // Ensure dashboard mode and widgets array exists
    if (!this.agent.ui_layout.layout_mode) {
      this.agent.ui_layout.layout_mode = 'dashboard';
    }
    if (!this.agent.ui_layout.widgets) {
      this.agent.ui_layout.widgets = [];
      // Migrate existing sections to widgets if any
      this.migrateFromSections();
    }
    this.updateOccupiedCells();
  }

  private migrateFromSections(): void {
    // Migrate existing section-based components to dashboard widgets
    if (this.agent.ui_layout.sections && this.agent.ui_layout.sections.length > 0) {
      let currentY = 0;
      for (const section of this.agent.ui_layout.sections) {
        for (const comp of section.components) {
          const defaultSize = this.getDefaultSizeForType(comp.type);
          const widget: UIComponent = {
            ...comp,
            gridPosition: {
              x: 0,
              y: currentY,
              w: defaultSize.w,
              h: defaultSize.h
            }
          };
          this.agent.ui_layout.widgets!.push(widget);
          currentY += defaultSize.h;
        }
      }
      this.adjustGridRows();
    }
  }

  getWidgets(): UIComponent[] {
    return this.agent.ui_layout.widgets || [];
  }

  getWidgetStyle(widget: UIComponent): Record<string, string> {
    const pos = widget.gridPosition;
    if (!pos) return {};

    const cellWidth = `calc((100% - ${(this.gridConfig.columns - 1) * this.gridConfig.gap}px) / ${this.gridConfig.columns})`;

    return {
      'grid-column': `${pos.x + 1} / span ${pos.w}`,
      'grid-row': `${pos.y + 1} / span ${pos.h}`,
      'min-height': `${pos.h * this.gridConfig.rowHeight}px`,
    };
  }

  getGridContainerStyle(): Record<string, string> {
    return {
      'display': 'grid',
      'grid-template-columns': `repeat(${this.gridConfig.columns}, 1fr)`,
      'grid-template-rows': `repeat(${this.gridRows}, ${this.gridConfig.rowHeight}px)`,
      'gap': `${this.gridConfig.gap}px`,
      'min-height': `${this.gridRows * (this.gridConfig.rowHeight + this.gridConfig.gap)}px`,
    };
  }

  // ============== WIDGET MANAGEMENT ==============

  addWidget(widgetInfo: any): void {
    const position = this.findFirstAvailablePosition(widgetInfo.defaultSize.w, widgetInfo.defaultSize.h);

    const newWidget: UIComponent = {
      id: this.generateId(),
      type: widgetInfo.type as ComponentType,
      name: this.generateUniqueName(widgetInfo.type),
      label: widgetInfo.name,
      gridPosition: position,
      auto_bind_output: this.isOutputComponent(widgetInfo.type),
      is_trigger_button: widgetInfo.isTrigger || false,
      button_action: widgetInfo.isTrigger ? 'trigger_agent' : undefined,
      button_variant: widgetInfo.isTrigger ? 'primary' : undefined,
    };

    // Set chart-specific config
    if (this.isChartType(widgetInfo.type)) {
      newWidget.chart_config = {
        chart_type: this.getChartTypeFromComponent(widgetInfo.type),
        show_legend: true,
        animate: true,
      };
    }

    const widgets = [...this.getWidgets(), newWidget];
    this.updateLayout({ widgets });
    this.adjustGridRows();
    this.selectWidget(newWidget);
  }

  removeWidget(widget: UIComponent): void {
    const widgets = this.getWidgets().filter(w => w.id !== widget.id);
    this.updateLayout({ widgets });
    this.updateOccupiedCells();
    if (this.selectedWidget?.id === widget.id) {
      this.selectedWidget = null;
      this.widgetSelected.emit(null);
    }
  }

  selectWidget(widget: UIComponent): void {
    this.selectedWidget = widget;
    this.widgetSelected.emit(widget);
  }

  updateWidgetProperty(widget: UIComponent, property: string, value: any): void {
    const widgets = this.getWidgets().map(w =>
      w.id === widget.id ? { ...w, [property]: value } : w
    );
    this.updateLayout({ widgets });

    // Update selected widget reference
    if (this.selectedWidget?.id === widget.id) {
      this.selectedWidget = widgets.find(w => w.id === widget.id) || null;
    }
  }

  resizeWidget(widget: UIComponent, newWidth: number, newHeight: number): void {
    if (!widget.gridPosition) return;

    const newPosition: GridPosition = {
      ...widget.gridPosition,
      w: Math.max(1, Math.min(newWidth, this.gridConfig.columns - widget.gridPosition.x)),
      h: Math.max(1, newHeight),
    };

    this.updateWidgetProperty(widget, 'gridPosition', newPosition);
    this.adjustGridRows();
    this.updateOccupiedCells();
  }

  moveWidget(widget: UIComponent, newX: number, newY: number): void {
    if (!widget.gridPosition) return;

    const newPosition: GridPosition = {
      ...widget.gridPosition,
      x: Math.max(0, Math.min(newX, this.gridConfig.columns - widget.gridPosition.w)),
      y: Math.max(0, newY),
    };

    this.updateWidgetProperty(widget, 'gridPosition', newPosition);
    this.adjustGridRows();
    this.updateOccupiedCells();
  }

  // ============== GRID HELPERS ==============

  private findFirstAvailablePosition(width: number, height: number): GridPosition {
    for (let y = 0; y < this.gridRows + 10; y++) {
      for (let x = 0; x <= this.gridConfig.columns - width; x++) {
        if (this.isPositionAvailable(x, y, width, height)) {
          return { x, y, w: width, h: height };
        }
      }
    }
    // If no space found, add at the bottom
    return { x: 0, y: this.gridRows, w: width, h: height };
  }

  private isPositionAvailable(x: number, y: number, w: number, h: number): boolean {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (this.gridCells[row] && this.gridCells[row][col] && this.gridCells[row][col].occupied) {
          return false;
        }
      }
    }
    return true;
  }

  private adjustGridRows(): void {
    const widgets = this.getWidgets();
    let maxY = 4; // Minimum 4 rows
    for (const widget of widgets) {
      if (widget.gridPosition) {
        maxY = Math.max(maxY, widget.gridPosition.y + widget.gridPosition.h);
      }
    }
    this.gridRows = maxY + 2; // Add 2 empty rows at bottom
    this.buildGridCells();
  }

  private updateLayout(changes: Partial<UILayout>): void {
    const newLayout: UILayout = {
      ...this.agent.ui_layout,
      layout_mode: 'dashboard',
      dashboard_config: this.gridConfig,
      ...changes,
    };
    this.agentBuilderService.updateCurrentAgentLocally({ ui_layout: newLayout });
  }

  // ============== UTILITIES ==============

  private generateId(): string {
    return 'widget_' + Math.random().toString(36).substring(2, 11);
  }

  private generateUniqueName(type: string): string {
    const widgets = this.getWidgets();
    const baseName = type.replace(/_/g, '_');
    let counter = 1;
    let name = baseName;
    while (widgets.some(w => w.name === name)) {
      name = `${baseName}_${counter}`;
      counter++;
    }
    return name;
  }

  private getDefaultSizeForType(type: ComponentType): { w: number; h: number } {
    const sizes: Record<string, { w: number; h: number }> = {
      text_input: { w: 4, h: 1 },
      textarea: { w: 6, h: 2 },
      select: { w: 3, h: 1 },
      file_upload: { w: 4, h: 2 },
      markdown_viewer: { w: 8, h: 4 },
      line_chart: { w: 6, h: 3 },
      bar_chart: { w: 6, h: 3 },
      pie_chart: { w: 4, h: 3 },
      donut_chart: { w: 4, h: 3 },
      button: { w: 2, h: 1 },
      chat_interface: { w: 12, h: 5 },
    };
    return sizes[type] || { w: 4, h: 2 };
  }

  private isOutputComponent(type: string): boolean {
    return ['markdown_viewer', 'text_display', 'line_chart', 'bar_chart', 'pie_chart', 'donut_chart', 'code_viewer'].includes(type);
  }

  isChartType(type: string): boolean {
    return ['line_chart', 'bar_chart', 'pie_chart', 'donut_chart'].includes(type);
  }

  updateChartConfigProperty(widget: UIComponent, property: string, value: any): void {
    const currentConfig = widget.chart_config || {};
    const newConfig = { ...currentConfig, [property]: value };
    this.updateWidgetProperty(widget, 'chart_config', newConfig);
  }

  getWidgetDescription(widget: any): string {
    return widget.description || '';
  }

  private getChartTypeFromComponent(type: string): 'line' | 'bar' | 'pie' | 'donut' {
    const mapping: Record<string, 'line' | 'bar' | 'pie' | 'donut'> = {
      line_chart: 'line',
      bar_chart: 'bar',
      pie_chart: 'pie',
      donut_chart: 'donut',
    };
    return mapping[type] || 'line';
  }

  getComponentIcon(type: ComponentType): string {
    for (const category of this.widgetCategories) {
      const widget = category.widgets.find(w => w.type === type);
      if (widget) return widget.icon;
    }
    return 'fa fa-puzzle-piece';
  }

  getComponentLabel(type: ComponentType): string {
    for (const category of this.widgetCategories) {
      const widget = category.widgets.find(w => w.type === type);
      if (widget) return widget.name;
    }
    return type;
  }

  get filteredWidgets() {
    const category = this.widgetCategories.find(c => c.id === this.selectedCategory);
    return category ? category.widgets : [];
  }

  // ============== INTERACTIVE RESIZE ==============

  onResizeStart(event: MouseEvent, widget: UIComponent): void {
    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.resizingWidget = widget;
    this.resizeStartX = event.clientX;
    this.resizeStartY = event.clientY;
    this.resizeStartW = widget.gridPosition?.w || 4;
    this.resizeStartH = widget.gridPosition?.h || 2;
  }

  // ============== INTERACTIVE DRAG (MOVE) ==============

  onDragStart(event: MouseEvent, widget: UIComponent): void {
    // Don't start drag if we're clicking on the resize handle or menu button
    const target = event.target as HTMLElement;
    if (target.closest('.resize-handle') || target.closest('.widget-menu-btn') || target.closest('button')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.isDragging = true;
    this.draggingWidget = widget;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartGridX = widget.gridPosition?.x || 0;
    this.dragStartGridY = widget.gridPosition?.y || 0;
    this.selectWidget(widget);
  }

  // ============== MOUSE MOVE HANDLER (Resize + Drag) ==============

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    // Handle resize
    if (this.isResizing && this.resizingWidget) {
      this.handleResizeMove(event);
      return;
    }

    // Handle drag
    if (this.isDragging && this.draggingWidget) {
      this.handleDragMove(event);
      return;
    }
  }

  private handleResizeMove(event: MouseEvent): void {
    const gridContainer = document.querySelector('.grid-container') as HTMLElement;
    if (!gridContainer || !this.resizingWidget) return;

    const containerWidth = gridContainer.clientWidth;
    const cellWidth = containerWidth / this.gridConfig.columns;
    const cellHeight = this.gridConfig.rowHeight;

    const deltaX = event.clientX - this.resizeStartX;
    const deltaY = event.clientY - this.resizeStartY;

    const deltaColumns = Math.round(deltaX / cellWidth);
    const deltaRows = Math.round(deltaY / cellHeight);

    const newW = Math.max(1, Math.min(this.resizeStartW + deltaColumns, this.gridConfig.columns - (this.resizingWidget.gridPosition?.x || 0)));
    const newH = Math.max(1, this.resizeStartH + deltaRows);

    // Only update if size changed
    if (newW !== this.resizingWidget.gridPosition?.w || newH !== this.resizingWidget.gridPosition?.h) {
      this.updateWidgetProperty(this.resizingWidget, 'gridPosition', {
        ...this.resizingWidget.gridPosition,
        w: newW,
        h: newH
      });
    }
  }

  private handleDragMove(event: MouseEvent): void {
    const gridContainer = document.querySelector('.grid-container') as HTMLElement;
    if (!gridContainer || !this.draggingWidget) return;

    const containerRect = gridContainer.getBoundingClientRect();
    const cellWidth = containerRect.width / this.gridConfig.columns;
    const cellHeight = this.gridConfig.rowHeight + this.gridConfig.gap;

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    const deltaColumns = Math.round(deltaX / cellWidth);
    const deltaRows = Math.round(deltaY / cellHeight);

    const widgetW = this.draggingWidget.gridPosition?.w || 4;
    const newX = Math.max(0, Math.min(this.dragStartGridX + deltaColumns, this.gridConfig.columns - widgetW));
    const newY = Math.max(0, this.dragStartGridY + deltaRows);

    // Only update if position changed
    if (newX !== this.draggingWidget.gridPosition?.x || newY !== this.draggingWidget.gridPosition?.y) {
      this.updateWidgetProperty(this.draggingWidget, 'gridPosition', {
        ...this.draggingWidget.gridPosition,
        x: newX,
        y: newY
      });
    }
  }

  // ============== MOUSE UP HANDLER (Resize + Drag) ==============

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    // Handle resize end
    if (this.isResizing) {
      this.isResizing = false;
      if (this.resizingWidget) {
        this.adjustGridRows();
        this.updateOccupiedCells();
      }
      this.resizingWidget = null;
    }

    // Handle drag end
    if (this.isDragging) {
      this.isDragging = false;
      if (this.draggingWidget) {
        this.adjustGridRows();
        this.updateOccupiedCells();
      }
      this.draggingWidget = null;
    }
  }
}
