import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

/**
 * Composant d'upload de fichiers avec drag-and-drop
 *
 * @example
 * ```html
 * <app-file-upload
 *   [accept]="'.pdf,.docx,.xlsx,.pptx'"
 *   [multiple]="true"
 *   [maxSize]="50"
 *   [maxFiles]="10"
 *   (filesSelected)="handleFiles($event)">
 * </app-file-upload>
 * ```
 */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileUploadComponent),
      multi: true
    }
  ]
})
export class FileUploadComponent implements ControlValueAccessor {
  @Input() accept: string = '.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt';
  @Input() multiple: boolean = true;
  @Input() maxSize: number = 50; // MB
  @Input() maxFiles: number = 10;
  @Input() disabled: boolean = false;
  @Input() label: string = 'Déposer des fichiers ici';
  @Input() hint: string = 'ou cliquez pour sélectionner';
  @Input() showPreview: boolean = true;

  @Output() filesSelected = new EventEmitter<UploadedFile[]>();
  @Output() filesRemoved = new EventEmitter<UploadedFile[]>();
  @Output() error = new EventEmitter<string>();

  uploadedFiles: UploadedFile[] = [];
  isDragging: boolean = false;

  private onChange: (value: File[]) => void = () => {};
  private onTouched: () => void = () => {};

  // ControlValueAccessor
  writeValue(value: File[]): void {
    if (value && value.length > 0) {
      this.handleFiles(value);
    }
  }

  registerOnChange(fn: (value: File[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (this.disabled) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
    }
    // Reset input pour permettre de sélectionner le même fichier
    input.value = '';
  }

  private handleFiles(files: File[]): void {
    // Vérifier le nombre de fichiers
    if (this.uploadedFiles.length + files.length > this.maxFiles) {
      this.error.emit(`Maximum ${this.maxFiles} fichiers autorisés`);
      return;
    }

    const validFiles: UploadedFile[] = [];

    for (const file of files) {
      // Vérifier la taille
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > this.maxSize) {
        this.error.emit(`${file.name} dépasse la taille maximale de ${this.maxSize}MB`);
        continue;
      }

      // Vérifier l'extension
      if (this.accept && !this.isFileAccepted(file)) {
        this.error.emit(`${file.name} n'est pas un type de fichier autorisé`);
        continue;
      }

      const uploadedFile: UploadedFile = {
        file,
        id: this.generateId(),
        name: file.name,
        size: file.size,
        type: file.type || this.getFileType(file.name)
      };

      // Générer preview pour les images
      if (file.type.startsWith('image/')) {
        this.generatePreview(file, uploadedFile);
      }

      validFiles.push(uploadedFile);
    }

    if (validFiles.length > 0) {
      this.uploadedFiles = [...this.uploadedFiles, ...validFiles];
      this.filesSelected.emit(this.uploadedFiles);
      this.onChange(this.uploadedFiles.map(f => f.file));
      this.onTouched();
    }
  }

  removeFile(fileId: string): void {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== fileId);
    this.filesRemoved.emit(this.uploadedFiles);
    this.onChange(this.uploadedFiles.map(f => f.file));
  }

  clearAll(): void {
    this.uploadedFiles = [];
    this.filesRemoved.emit([]);
    this.onChange([]);
  }

  private isFileAccepted(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = this.accept.toLowerCase().split(',').map(t => t.trim());
    return acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return extension === type;
      }
      return file.type.match(new RegExp(type.replace('*', '.*'))) !== null;
    });
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'ppt': 'application/vnd.ms-powerpoint',
      'txt': 'text/plain'
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private generatePreview(file: File, uploadedFile: UploadedFile): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedFile.preview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private generateId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getFileIcon(type: string): string {
    if (type.includes('pdf')) return 'fa fa-file-pdf';
    if (type.includes('word')) return 'fa fa-file-word';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'fa fa-file-excel';
    if (type.includes('powerpoint') || type.includes('presentation')) return 'fa fa-file-powerpoint';
    if (type.includes('image')) return 'fa fa-file-image';
    if (type.includes('text')) return 'fa fa-file-alt';
    return 'fa fa-file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}
