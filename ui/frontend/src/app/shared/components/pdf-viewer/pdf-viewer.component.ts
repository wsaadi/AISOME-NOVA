import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface PDFViewerConfig {
  showToolbar?: boolean;
  showNavigation?: boolean;
  showZoom?: boolean;
  showDownload?: boolean;
  showPrint?: boolean;
  initialZoom?: number;
  maxZoom?: number;
  minZoom?: number;
}

/**
 * Composant de lecteur PDF
 *
 * @example
 * ```typescript
 * pdfConfig: PDFViewerConfig = {
 *   showToolbar: true,
 *   showNavigation: true,
 *   showZoom: true,
 *   showDownload: true,
 *   initialZoom: 1.0
 * };
 *
 * onPageChange(page: number) {
 *   console.log('Current page:', page);
 * }
 * ```
 *
 * ```html
 * <app-pdf-viewer
 *   [src]="pdfUrl"
 *   [config]="pdfConfig"
 *   (onPageChange)="onPageChange($event)">
 * </app-pdf-viewer>
 * ```
 */
@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnInit, OnDestroy {
  @Input() src!: string | Blob | ArrayBuffer;
  @Input() config: PDFViewerConfig = {
    showToolbar: true,
    showNavigation: true,
    showZoom: true,
    showDownload: true,
    showPrint: true,
    initialZoom: 1.0,
    maxZoom: 3.0,
    minZoom: 0.5
  };

  @Output() onLoad = new EventEmitter<any>();
  @Output() onError = new EventEmitter<any>();
  @Output() onPageChange = new EventEmitter<number>();

  pdfSrc: SafeResourceUrl | string = '';
  currentPage: number = 1;
  totalPages: number = 0;
  zoom: number = 1.0;
  isLoading: boolean = true;
  error: string | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.zoom = this.config.initialZoom || 1.0;
    this.loadPDF();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private loadPDF(): void {
    try {
      if (typeof this.src === 'string') {
        // URL string
        if (this.src.startsWith('http') || this.src.startsWith('https')) {
          this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.src);
        } else {
          this.pdfSrc = this.src;
        }
      } else if (this.src instanceof Blob) {
        // Blob object
        const url = URL.createObjectURL(this.src);
        this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      } else if (this.src instanceof ArrayBuffer) {
        // ArrayBuffer
        const blob = new Blob([this.src], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.pdfSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }

      this.isLoading = false;
      this.onLoad.emit({ success: true });
    } catch (err) {
      this.error = 'Erreur lors du chargement du PDF';
      this.isLoading = false;
      this.onError.emit(err);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.onPageChange.emit(this.currentPage);
    }
  }

  nextPage(): void {
    if (this.totalPages === 0 || this.currentPage < this.totalPages) {
      this.currentPage++;
      this.onPageChange.emit(this.currentPage);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && (this.totalPages === 0 || page <= this.totalPages)) {
      this.currentPage = page;
      this.onPageChange.emit(this.currentPage);
    }
  }

  zoomIn(): void {
    const maxZoom = this.config.maxZoom || 3.0;
    if (this.zoom < maxZoom) {
      this.zoom += 0.25;
    }
  }

  zoomOut(): void {
    const minZoom = this.config.minZoom || 0.5;
    if (this.zoom > minZoom) {
      this.zoom -= 0.25;
    }
  }

  resetZoom(): void {
    this.zoom = this.config.initialZoom || 1.0;
  }

  downloadPDF(): void {
    if (typeof this.src === 'string' && (this.src.startsWith('http') || this.src.startsWith('https'))) {
      window.open(this.src, '_blank');
    } else {
      // Pour les Blobs et ArrayBuffers
      const link = document.createElement('a');
      if (this.src instanceof Blob) {
        link.href = URL.createObjectURL(this.src);
      } else if (this.src instanceof ArrayBuffer) {
        const blob = new Blob([this.src], { type: 'application/pdf' });
        link.href = URL.createObjectURL(blob);
      }
      link.download = 'document.pdf';
      link.click();
    }
  }

  printPDF(): void {
    if (typeof this.pdfSrc === 'string') {
      const printWindow = window.open(this.pdfSrc, '_blank');
      printWindow?.print();
    }
  }

  get zoomPercentage(): number {
    return Math.round(this.zoom * 100);
  }
}
