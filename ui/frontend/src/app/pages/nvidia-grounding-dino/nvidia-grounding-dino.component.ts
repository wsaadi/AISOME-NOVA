import {
  Component, OnInit, ChangeDetectorRef,
  ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';

// ==========================================
//  INTERFACES
// ==========================================

interface Detection {
  bbox: number[];  // [x_min, y_min, x_max, y_max] as fractions 0-1
  label: string;
  score: number;
  color: string;
}

interface SampleImage {
  id: string;
  name: string;
  description: string;
  url: string;
  prompt: string;
}

interface InferenceResult {
  success: boolean;
  message?: string;
  detections?: Detection[];
  prompt?: string;
  threshold?: number;
  error?: string;
  demo_mode?: boolean;
  annotated_image?: string;  // base64 JPEG from NVIDIA with bboxes pre-drawn
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  prompt: string;
  detectionCount: number;
  result: InferenceResult;
  imagePreview: string;
}

@Component({
  selector: 'app-nvidia-grounding-dino',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSliderModule,
    MatFormFieldModule,
    MatInputModule,
    TranslateModule,
  ],
  templateUrl: './nvidia-grounding-dino.component.html',
  styleUrls: ['./nvidia-grounding-dino.component.scss'],
})
export class NvidiaGroundingDinoComponent implements OnInit {
  @ViewChild('detectionCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: false }) fileInputRef!: ElementRef<HTMLInputElement>;

  // Config
  apiKey: string = '';
  showSettings: boolean = false;

  // Input
  promptInput: string = '';
  threshold: number = 0.3;
  imageBase64: string = '';
  imagePreview: string = '';
  imageName: string = '';
  sampleImages: SampleImage[] = [];

  // State
  isProcessing: boolean = false;
  processingStage: string = '';
  errorMessage: string = '';
  currentResult: InferenceResult | null = null;
  history: HistoryEntry[] = [];
  selectedDetection: Detection | null = null;

  // Image dimensions for bbox rendering
  private naturalWidth: number = 0;
  private naturalHeight: number = 0;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadModelInfo();
  }

  // ==========================================
  //  CONFIG
  // ==========================================

  loadConfig(): void {
    const saved = localStorage.getItem('nvidia-grounding-dino-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.apiKey = config.apiKey || '';
    }
  }

  saveConfig(): void {
    localStorage.setItem('nvidia-grounding-dino-config', JSON.stringify({
      apiKey: this.apiKey,
    }));
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  // ==========================================
  //  MODEL INFO
  // ==========================================

  async loadModelInfo(): Promise<void> {
    try {
      const info = await firstValueFrom(
        this.http.get<any>(`${environment.api.nvidiaGroundingDino}/api/v1/nvidia-grounding-dino/info`)
      );
      this.sampleImages = info.sample_images || [];
    } catch {
      this.sampleImages = [
        { id: 'city', name: 'City Street', description: 'Urban scene', url: '', prompt: 'car . person . building' },
        { id: 'kitchen', name: 'Kitchen', description: 'Kitchen scene', url: '', prompt: 'cup . plate . bottle' },
      ];
    }
  }

  // ==========================================
  //  IMAGE HANDLING
  // ==========================================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = this.translate.instant('nvidia_grounding_dino.errors.file_too_large');
      return;
    }

    this.imageName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.imagePreview = dataUrl;
      // Strip the data:image/...;base64, prefix
      this.imageBase64 = dataUrl.split(',')[1];
      this.currentResult = null;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement?.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files?.length) {
      const file = files[0];
      if (!file.type.startsWith('image/')) return;
      this.imageName = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.imagePreview = dataUrl;
        this.imageBase64 = dataUrl.split(',')[1];
        this.currentResult = null;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  loadSample(sample: SampleImage): void {
    this.promptInput = sample.prompt;
    // For sample images, we'd need to fetch and convert to base64
    // For now, set the URL as preview
    if (sample.url) {
      this.imagePreview = sample.url;
      this.imageName = sample.name;
      // Fetch and convert to base64
      this.fetchImageAsBase64(sample.url);
    }
  }

  private async fetchImageAsBase64(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        this.imageBase64 = dataUrl.split(',')[1];
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(blob);
    } catch {
      this.errorMessage = 'Failed to load sample image';
    }
  }

  clearImage(): void {
    this.imageBase64 = '';
    this.imagePreview = '';
    this.imageName = '';
    this.currentResult = null;
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  // ==========================================
  //  INFERENCE
  // ==========================================

  async runInference(): Promise<void> {
    if (!this.imageBase64 || !this.promptInput.trim() || this.isProcessing) return;

    if (!this.apiKey) {
      this.errorMessage = this.translate.instant('nvidia_grounding_dino.errors.api_key_missing');
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.currentResult = null;
    this.selectedDetection = null;
    this.processingStage = this.translate.instant('nvidia_grounding_dino.stages.sending');
    this.cdr.detectChanges();

    try {
      this.processingStage = this.translate.instant('nvidia_grounding_dino.stages.detecting');
      this.cdr.detectChanges();

      const payload = {
        image_base64: this.imageBase64,
        prompt: this.promptInput.trim(),
        threshold: this.threshold,
      };

      const result = await firstValueFrom(
        this.http.post<InferenceResult>(
          `${environment.api.nvidiaGroundingDino}/api/v1/nvidia-grounding-dino/inference`,
          payload,
          { headers: { 'X-Api-Key': this.apiKey } }
        ).pipe(timeout(120000))
      );

      this.currentResult = result;

      if (result.success && (result.detections || result.annotated_image)) {
        this.processingStage = this.translate.instant('nvidia_grounding_dino.stages.complete');
        this.cdr.detectChanges();

        // Draw bounding boxes on canvas (or show NVIDIA annotated image)
        setTimeout(() => this.drawDetections(), 100);

        this.history.unshift({
          id: Date.now().toString(),
          timestamp: new Date(),
          prompt: this.promptInput.trim(),
          detectionCount: result.detections?.length || 0,
          result,
          imagePreview: this.imagePreview,
        });
      } else {
        this.errorMessage = result.error || 'Erreur inconnue';
      }
    } catch (error: any) {
      const errMsg = error.status === 0
        ? this.translate.instant('nvidia_grounding_dino.errors.backend_unreachable')
        : (error.error?.detail || error.message || 'Erreur inconnue');
      this.errorMessage = errMsg;
    } finally {
      this.isProcessing = false;
      this.processingStage = '';
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  //  BOUNDING BOX RENDERING
  // ==========================================

  private drawDetections(): void {
    if (!this.canvasRef?.nativeElement || !this.currentResult) return;

    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If NVIDIA returned an annotated image, display that directly
    const imgSrc = this.currentResult.annotated_image
      ? `data:image/jpeg;base64,${this.currentResult.annotated_image}`
      : this.imagePreview;

    const hasDetections = this.currentResult.detections && this.currentResult.detections.length > 0;
    const useNvidiaImage = !!this.currentResult.annotated_image;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.naturalWidth = img.naturalWidth;
      this.naturalHeight = img.naturalHeight;

      // Set canvas size to match container while maintaining aspect ratio
      const container = canvas.parentElement!;
      const maxW = container.clientWidth || 800;
      const maxH = 500;
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = Math.floor(img.naturalWidth * scale);
      const h = Math.floor(img.naturalHeight * scale);

      canvas.width = w;
      canvas.height = h;

      // Draw image (either NVIDIA-annotated or original)
      ctx.drawImage(img, 0, 0, w, h);

      // If using NVIDIA annotated image, bboxes are already drawn
      // Only draw our own bboxes for demo mode or parsed detections
      if (!useNvidiaImage && hasDetections) {
        const detections = this.currentResult!.detections!;
        for (const det of detections) {
          const [x1, y1, x2, y2] = det.bbox;

          let bx1: number, by1: number, bx2: number, by2: number;
          if (x2 <= 1.0 && y2 <= 1.0) {
            bx1 = x1 * w;
            by1 = y1 * h;
            bx2 = x2 * w;
            by2 = y2 * h;
          } else {
            bx1 = x1 * scale;
            by1 = y1 * scale;
            bx2 = x2 * scale;
            by2 = y2 * scale;
          }

          const bw = bx2 - bx1;
          const bh = by2 - by1;

          ctx.strokeStyle = det.color;
          ctx.lineWidth = 2;
          ctx.strokeRect(bx1, by1, bw, bh);

          ctx.fillStyle = det.color + '20';
          ctx.fillRect(bx1, by1, bw, bh);

          const label = `${det.label} ${(det.score * 100).toFixed(0)}%`;
          ctx.font = 'bold 12px sans-serif';
          const textMetrics = ctx.measureText(label);
          const textH = 18;
          const textW = textMetrics.width + 8;

          ctx.fillStyle = det.color;
          ctx.fillRect(bx1, by1 - textH, textW, textH);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(label, bx1 + 4, by1 - 5);
        }
      }

      this.cdr.detectChanges();
    };

    img.src = imgSrc;
  }

  selectDetection(det: Detection): void {
    this.selectedDetection = this.selectedDetection === det ? null : det;
  }

  // ==========================================
  //  HELPERS
  // ==========================================

  get canRun(): boolean {
    return this.imageBase64.length > 0
      && this.promptInput.trim().length > 0
      && !this.isProcessing
      && this.apiKey.length > 0;
  }

  get uniqueLabels(): { label: string; color: string; count: number }[] {
    if (!this.currentResult?.detections) return [];
    const map = new Map<string, { color: string; count: number }>();
    for (const det of this.currentResult.detections) {
      const existing = map.get(det.label);
      if (existing) {
        existing.count++;
      } else {
        map.set(det.label, { color: det.color, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([label, info]) => ({
      label,
      color: info.color,
      count: info.count,
    }));
  }

  formatThreshold(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
  }

  clearHistory(): void {
    this.history = [];
  }
}
