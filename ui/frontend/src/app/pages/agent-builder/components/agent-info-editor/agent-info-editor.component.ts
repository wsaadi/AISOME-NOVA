import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

import { AgentDefinition, AgentCategory } from '../../models/agent.models';
import { AgentBuilderService } from '../../services/agent-builder.service';

@Component({
  selector: 'app-agent-info-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCardModule,
    TranslateModule,
  ],
  templateUrl: './agent-info-editor.component.html',
  styleUrls: ['./agent-info-editor.component.scss'],
})
export class AgentInfoEditorComponent implements OnInit {
  @Input() agent!: AgentDefinition;

  form!: FormGroup;
  categories: AgentCategory[] = [];
  newTag = '';

  // Available icons
  icons = [
    'fa fa-robot',
    'fa fa-brain',
    'fa fa-comments',
    'fa fa-file-alt',
    'fa fa-chart-line',
    'fa fa-search',
    'fa fa-cogs',
    'fa fa-database',
    'fa fa-envelope',
    'fa fa-calendar',
    'fa fa-users',
    'fa fa-shopping-cart',
    'fa fa-truck',
    'fa fa-shield-alt',
    'fa fa-code',
    'fa fa-magic',
    'fa fa-lightbulb',
    'fa fa-graduation-cap',
    'fa fa-stethoscope',
    'fa fa-balance-scale',
  ];

  constructor(
    private fb: FormBuilder,
    private agentBuilderService: AgentBuilderService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: [this.agent.name, [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      description: [this.agent.description, [Validators.required, Validators.minLength(1), Validators.maxLength(500)]],
      long_description: [this.agent.long_description || '', [Validators.maxLength(2000)]],
      icon: [this.agent.icon],
      category: [this.agent.category],
    });

    // Listen for changes
    this.form.valueChanges.subscribe((values) => {
      this.agentBuilderService.updateCurrentAgentLocally({
        name: values.name,
        description: values.description,
        long_description: values.long_description,
        icon: values.icon,
        category: values.category,
      });
    });
  }

  private loadCategories(): void {
    this.agentBuilderService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        // Default categories
        this.categories = [
          { id: 'custom', name: 'Custom Agents', icon: 'fa fa-robot' },
          { id: 'document_analysis', name: 'Document Analysis', icon: 'fa fa-file-alt' },
          { id: 'data_processing', name: 'Data Processing', icon: 'fa fa-database' },
          { id: 'communication', name: 'Communication', icon: 'fa fa-comments' },
          { id: 'analytics', name: 'Analytics', icon: 'fa fa-chart-line' },
        ];
      },
    });
  }

  selectIcon(icon: string): void {
    this.form.patchValue({ icon });
  }

  addTag(): void {
    if (this.newTag.trim() && !this.agent.metadata.tags.includes(this.newTag.trim())) {
      const newTags = [...this.agent.metadata.tags, this.newTag.trim()];
      this.agentBuilderService.updateCurrentAgentLocally({
        metadata: { ...this.agent.metadata, tags: newTags },
      });
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    const newTags = this.agent.metadata.tags.filter((t) => t !== tag);
    this.agentBuilderService.updateCurrentAgentLocally({
      metadata: { ...this.agent.metadata, tags: newTags },
    });
  }

  get characterCount(): number {
    return this.form.get('description')?.value?.length || 0;
  }

  get longDescriptionCount(): number {
    return this.form.get('long_description')?.value?.length || 0;
  }
}
