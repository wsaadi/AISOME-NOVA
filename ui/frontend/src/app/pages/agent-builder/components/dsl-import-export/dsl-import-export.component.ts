import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { inject } from '@angular/core';

import { AgentDSLService } from '../../services/agent-dsl.service';
import { DSLTemplateInfo, ValidationResult, ADL_VERSION } from '../../models/agent-dsl.models';

/**
 * DSL Import/Export Dialog Component
 *
 * Provides a unified interface for:
 * - Importing agents from YAML/JSON
 * - Exporting agents to YAML/JSON
 * - Using templates
 * - Viewing validation results
 */
@Component({
  selector: 'app-dsl-import-export',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="dsl-dialog">
      <h2 mat-dialog-title>
        <mat-icon>code</mat-icon>
        Agent Descriptor Language (ADL)
        <span class="version-badge">v{{ adlVersion }}</span>
      </h2>

      <mat-dialog-content>
        <mat-tab-group [(selectedIndex)]="selectedTab">
          <!-- Import Tab -->
          <mat-tab label="Importer">
            <div class="tab-content">
              <div class="import-options">
                <h3>Source d'import</h3>

                <!-- File Upload -->
                <div
                  class="file-drop-zone"
                  [class.drag-over]="isDragOver()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onDrop($event)"
                >
                  <mat-icon>cloud_upload</mat-icon>
                  <p>Glissez un fichier .yaml ou .json ici</p>
                  <p class="hint">ou</p>
                  <button mat-stroked-button (click)="fileInput.click()">
                    <mat-icon>folder_open</mat-icon>
                    Parcourir
                  </button>
                  <input
                    #fileInput
                    type="file"
                    accept=".yaml,.yml,.json"
                    (change)="onFileSelected($event)"
                    hidden
                  />
                  @if (selectedFile()) {
                    <div class="selected-file">
                      <mat-chip>
                        <mat-icon>description</mat-icon>
                        {{ selectedFile()?.name }}
                        <button matChipRemove (click)="clearFile()">
                          <mat-icon>cancel</mat-icon>
                        </button>
                      </mat-chip>
                    </div>
                  }
                </div>

                <!-- Or paste content -->
                <div class="divider-text">
                  <span>ou collez le contenu</span>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Format</mat-label>
                  <mat-select [(value)]="importFormat">
                    <mat-option value="yaml">YAML</mat-option>
                    <mat-option value="json">JSON</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Contenu {{ importFormat.toUpperCase() }}</mat-label>
                  <textarea
                    matInput
                    [(ngModel)]="importContent"
                    rows="12"
                    [placeholder]="getPlaceholder()"
                  ></textarea>
                </mat-form-field>

                <!-- Validation Results -->
                @if (validationResult()) {
                  <div
                    class="validation-results"
                    [class.valid]="validationResult()?.valid"
                    [class.invalid]="!validationResult()?.valid"
                  >
                    <h4>
                      <mat-icon>{{ validationResult()?.valid ? 'check_circle' : 'error' }}</mat-icon>
                      {{ validationResult()?.valid ? 'Valide' : 'Erreurs de validation' }}
                    </h4>

                    @if (validationResult()?.errors?.length) {
                      <ul class="errors">
                        @for (error of validationResult()?.errors; track error.path) {
                          <li>
                            <strong>{{ error.path }}:</strong> {{ error.message }}
                          </li>
                        }
                      </ul>
                    }

                    @if (validationResult()?.warnings?.length) {
                      <ul class="warnings">
                        @for (warning of validationResult()?.warnings; track warning.path) {
                          <li>
                            <mat-icon>warning</mat-icon>
                            <strong>{{ warning.path }}:</strong> {{ warning.message }}
                          </li>
                        }
                      </ul>
                    }
                  </div>
                }
              </div>

              <div class="actions">
                <button mat-button (click)="validateImport()" [disabled]="isLoading() || !canValidate()">
                  <mat-icon>fact_check</mat-icon>
                  Valider
                </button>
                <button
                  mat-raised-button
                  color="primary"
                  (click)="importAgent()"
                  [disabled]="isLoading() || !canImport()"
                >
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>file_download</mat-icon>
                  }
                  Importer
                </button>
              </div>
            </div>
          </mat-tab>

          <!-- Export Tab -->
          <mat-tab label="Exporter">
            <div class="tab-content">
              @if (agentId) {
                <div class="export-options">
                  <h3>Format d'export</h3>

                  <div class="format-buttons">
                    <button
                      mat-stroked-button
                      [class.selected]="exportFormat === 'yaml'"
                      (click)="exportFormat = 'yaml'"
                    >
                      <mat-icon>code</mat-icon>
                      YAML
                    </button>
                    <button
                      mat-stroked-button
                      [class.selected]="exportFormat === 'json'"
                      (click)="exportFormat = 'json'"
                    >
                      <mat-icon>data_object</mat-icon>
                      JSON
                    </button>
                  </div>

                  <div class="export-preview">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Aperçu</mat-label>
                      <textarea matInput [value]="exportContent()" rows="15" readonly></textarea>
                    </mat-form-field>
                  </div>
                </div>

                <div class="actions">
                  <button mat-button (click)="copyToClipboard()">
                    <mat-icon>content_copy</mat-icon>
                    Copier
                  </button>
                  <button mat-raised-button color="primary" (click)="downloadExport()">
                    <mat-icon>download</mat-icon>
                    Télécharger
                  </button>
                </div>
              } @else {
                <div class="no-agent">
                  <mat-icon>info</mat-icon>
                  <p>Sélectionnez un agent pour l'exporter</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Templates Tab -->
          <mat-tab label="Templates">
            <div class="tab-content">
              <h3>Templates disponibles</h3>
              <p class="hint">Créez un agent à partir d'un template prédéfini</p>

              <div class="templates-grid">
                @for (template of templates(); track template.id) {
                  <div
                    class="template-card"
                    [class.selected]="selectedTemplate() === template.id"
                    (click)="selectTemplate(template.id)"
                  >
                    <mat-icon>{{ template.icon || 'smart_toy' }}</mat-icon>
                    <h4>{{ template.name }}</h4>
                    <p>{{ template.description }}</p>
                  </div>
                }
              </div>

              @if (selectedTemplate()) {
                <div class="template-form">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Nom de l'agent</mat-label>
                    <input matInput [(ngModel)]="newAgentName" placeholder="Mon nouvel agent" />
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea
                      matInput
                      [(ngModel)]="newAgentDescription"
                      rows="3"
                      placeholder="Description de l'agent..."
                    ></textarea>
                  </mat-form-field>
                </div>
              }

              <div class="actions">
                <button
                  mat-raised-button
                  color="primary"
                  (click)="createFromTemplate()"
                  [disabled]="!selectedTemplate() || !newAgentName || isLoading()"
                >
                  @if (isLoading()) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    <mat-icon>add</mat-icon>
                  }
                  Créer depuis le template
                </button>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Fermer</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .dsl-dialog {
        min-width: 600px;
        max-width: 800px;
      }

      h2[mat-dialog-title] {
        display: flex;
        align-items: center;
        gap: 8px;

        mat-icon {
          color: #6366f1;
        }

        .version-badge {
          font-size: 12px;
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 12px;
          color: #6b7280;
        }
      }

      .tab-content {
        padding: 24px 0;
      }

      .file-drop-zone {
        border: 2px dashed #d1d5db;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        transition: all 0.2s ease;
        background: #f9fafb;
        cursor: pointer;

        &:hover,
        &.drag-over {
          border-color: #6366f1;
          background: #eef2ff;
        }

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          color: #9ca3af;
        }

        p {
          margin: 8px 0;
          color: #6b7280;

          &.hint {
            font-size: 12px;
            color: #9ca3af;
          }
        }

        .selected-file {
          margin-top: 16px;
        }
      }

      .divider-text {
        display: flex;
        align-items: center;
        margin: 24px 0;

        &::before,
        &::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e5e7eb;
        }

        span {
          padding: 0 16px;
          color: #9ca3af;
          font-size: 14px;
        }
      }

      .full-width {
        width: 100%;
      }

      .validation-results {
        margin-top: 16px;
        padding: 16px;
        border-radius: 8px;

        &.valid {
          background: #ecfdf5;
          border: 1px solid #10b981;

          h4 {
            color: #059669;
          }
        }

        &.invalid {
          background: #fef2f2;
          border: 1px solid #ef4444;

          h4 {
            color: #dc2626;
          }
        }

        h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
        }

        ul {
          margin: 0;
          padding-left: 20px;

          li {
            margin: 4px 0;
            display: flex;
            align-items: flex-start;
            gap: 4px;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
              color: #f59e0b;
            }
          }
        }

        .errors li {
          color: #dc2626;
        }

        .warnings {
          margin-top: 12px;

          li {
            color: #92400e;
          }
        }
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }

      .format-buttons {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;

        button {
          flex: 1;
          padding: 16px;

          &.selected {
            background: #eef2ff;
            border-color: #6366f1;
            color: #6366f1;
          }
        }
      }

      .no-agent {
        text-align: center;
        padding: 60px;
        color: #6b7280;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
        }
      }

      .templates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .template-card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 20px;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: #6366f1;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        &.selected {
          border-color: #6366f1;
          background: #eef2ff;
        }

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: #6366f1;
          margin-bottom: 12px;
        }

        h4 {
          margin: 0 0 8px;
          font-size: 16px;
        }

        p {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }
      }

      .template-form {
        margin-top: 24px;
        padding: 20px;
        background: #f9fafb;
        border-radius: 12px;
      }
    `,
  ],
})
export class DslImportExportComponent {
  @Input() agentId?: string;
  @Output() imported = new EventEmitter<{ agentId: string; agentName: string }>();
  @Output() created = new EventEmitter<{ agentId: string; agentName: string }>();

  private dslService = inject(AgentDSLService);
  private snackBar = inject(MatSnackBar);

  // Version
  adlVersion = ADL_VERSION;

  // Tab state
  selectedTab = 0;

  // Import state
  importFormat: 'yaml' | 'json' = 'yaml';
  importContent = '';
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);
  validationResult = signal<ValidationResult | null>(null);

  // Export state
  exportFormat: 'yaml' | 'json' = 'yaml';
  exportContent = signal('');

  // Templates state
  templates = signal<DSLTemplateInfo[]>([]);
  selectedTemplate = signal<string | null>(null);
  newAgentName = '';
  newAgentDescription = '';

  // Loading state
  isLoading = signal(false);

  constructor() {
    this.loadTemplates();
    if (this.agentId) {
      this.loadExportContent();
    }
  }

  // ============== IMPORT ==============

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    this.selectedFile.set(file);

    // Auto-detect format
    if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
      this.importFormat = 'yaml';
    } else if (file.name.endsWith('.json')) {
      this.importFormat = 'json';
    }

    // Read content
    const reader = new FileReader();
    reader.onload = (e) => {
      this.importContent = e.target?.result as string;
    };
    reader.readAsText(file);
  }

  clearFile(): void {
    this.selectedFile.set(null);
    this.importContent = '';
    this.validationResult.set(null);
  }

  getPlaceholder(): string {
    if (this.importFormat === 'yaml') {
      return `metadata:
  adl_version: "1.0.0"
  version: "1.0.0"

identity:
  name: "Mon Agent"
  description: "Description de l'agent"
  ...`;
    }
    return `{
  "metadata": {
    "adl_version": "1.0.0",
    "version": "1.0.0"
  },
  "identity": {
    "name": "Mon Agent",
    "description": "Description de l'agent"
  }
  ...
}`;
  }

  canValidate(): boolean {
    return this.importContent.trim().length > 0;
  }

  canImport(): boolean {
    return this.importContent.trim().length > 0 && (this.validationResult()?.valid ?? false);
  }

  validateImport(): void {
    this.isLoading.set(true);
    this.dslService.validateDSL(this.importContent, this.importFormat).subscribe({
      next: (result) => {
        this.validationResult.set(result);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.snackBar.open('Erreur de validation: ' + error.message, 'Fermer', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }

  importAgent(): void {
    this.isLoading.set(true);

    const observable =
      this.importFormat === 'yaml'
        ? this.dslService.importFromYAML(this.importContent)
        : this.dslService.importFromJSON(JSON.parse(this.importContent));

    observable.subscribe({
      next: (result) => {
        this.snackBar.open(`Agent "${result.agent_name}" importé avec succès!`, 'Fermer', { duration: 3000 });
        this.imported.emit({ agentId: result.agent_id, agentName: result.agent_name });
        this.isLoading.set(false);
      },
      error: (error) => {
        this.snackBar.open("Erreur d'import: " + error.message, 'Fermer', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }

  // ============== EXPORT ==============

  loadExportContent(): void {
    if (!this.agentId) return;

    const observable =
      this.exportFormat === 'yaml'
        ? this.dslService.exportToYAML(this.agentId)
        : this.dslService.exportToJSON(this.agentId);

    observable.subscribe({
      next: (content) => {
        this.exportContent.set(content);
      },
      error: (error) => {
        this.snackBar.open("Erreur d'export: " + error.message, 'Fermer', { duration: 5000 });
      },
    });
  }

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.exportContent()).then(() => {
      this.snackBar.open('Copié dans le presse-papiers!', 'Fermer', { duration: 2000 });
    });
  }

  downloadExport(): void {
    if (this.agentId) {
      this.dslService.downloadAgent(this.agentId, this.exportFormat);
    }
  }

  // ============== TEMPLATES ==============

  loadTemplates(): void {
    this.dslService.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
      },
      error: (error) => {
        console.error('Failed to load templates:', error);
      },
    });
  }

  selectTemplate(templateId: string): void {
    this.selectedTemplate.set(templateId);

    // Pre-fill name from template
    const template = this.templates().find((t) => t.id === templateId);
    if (template) {
      this.newAgentName = template.name + ' (copie)';
      this.newAgentDescription = template.description;
    }
  }

  createFromTemplate(): void {
    const templateId = this.selectedTemplate();
    if (!templateId || !this.newAgentName) return;

    this.isLoading.set(true);

    this.dslService.createFromTemplate(templateId, this.newAgentName, this.newAgentDescription).subscribe({
      next: (result) => {
        this.snackBar.open(`Agent "${result.agent_name}" créé avec succès!`, 'Fermer', { duration: 3000 });
        this.created.emit({ agentId: result.agent_id, agentName: result.agent_name });
        this.isLoading.set(false);
      },
      error: (error) => {
        this.snackBar.open('Erreur de création: ' + error.message, 'Fermer', { duration: 5000 });
        this.isLoading.set(false);
      },
    });
  }
}
