import {
  Component, OnInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSliderModule } from '@angular/material/slider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, timeout } from 'rxjs';

import { environment } from '../../../environments/environment';

interface AnatomyGroup {
  label: string;
  icon: string;
  classes: string[];
}

interface SampleDataset {
  id: string;
  name: string;
  url: string;
  description: string;
  region: string;
}

interface SlicePreview {
  index: number;
  image: string;
}

interface LegendEntry {
  class: string;
  color: string;
}

interface PreviewData {
  axial_slices: SlicePreview[];
  coronal_slices: SlicePreview[];
  sagittal_slices: SlicePreview[];
  total_slices: number;
  slice_range: number[];
  volume_shape: number[];
  legend: LegendEntry[];
}

interface InferenceResult {
  success: boolean;
  message?: string;
  segmentation_base64?: string;
  segmentation_url?: string;
  classes_found?: string[];
  file_name?: string;
  error?: string;
  activation_url?: string;
  previews?: PreviewData;
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  imageUrl: string;
  classes: string[];
  result: InferenceResult;
}

@Component({
  selector: 'app-nvidia-vista3d',
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
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatTabsModule,
    MatSliderModule,
    TranslateModule,
  ],
  templateUrl: './nvidia-vista3d.component.html',
  styleUrls: ['./nvidia-vista3d.component.scss'],
})
export class NvidiaVista3dComponent implements OnInit {
  // Config
  apiKey: string = '';
  showSettings: boolean = false;

  // Input
  imageUrl: string = '';
  selectedClasses: string[] = [];

  // Anatomy groups (loaded from backend)
  anatomyGroups: Record<string, AnatomyGroup> = {};
  anatomyGroupKeys: string[] = [];
  sampleDatasets: SampleDataset[] = [];
  allClasses: string[] = [];
  totalClasses: number = 0;

  // State
  isProcessing: boolean = false;
  processingStage: string = '';
  errorMessage: string = '';
  currentResult: InferenceResult | null = null;
  history: HistoryEntry[] = [];

  // Viewer state
  currentSliceIndex: number = 0;
  coronalSliceIndex: number = 0;
  sagittalSliceIndex: number = 0;
  activeView: 'axial' | 'coronal' | 'sagittal' = 'axial';

  // Quick presets
  presets = [
    { label: 'Organes abdominaux', icon: 'favorite', classes: ['liver', 'spleen', 'pancreas', 'right kidney', 'left kidney', 'stomach', 'gallbladder'] },
    { label: 'Poumons', icon: 'air', classes: ['left lung upper lobe', 'left lung lower lobe', 'right lung upper lobe', 'right lung middle lobe', 'right lung lower lobe', 'trachea'] },
    { label: 'Cardiovasculaire', icon: 'monitor_heart', classes: ['heart', 'aorta', 'inferior vena cava', 'pulmonary artery'] },
    { label: 'Colonne vertebrale', icon: 'straighten', classes: ['vertebrae L1', 'vertebrae L2', 'vertebrae L3', 'vertebrae L4', 'vertebrae L5', 'vertebrae T12'] },
    { label: 'Lesions', icon: 'report_problem', classes: ['lung nodule', 'liver tumor', 'pancreatic tumor', 'colon tumor', 'bone lesion', 'kidney tumor'] },
    { label: 'Tout segmenter', icon: 'select_all', classes: [] },
  ];

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
    const saved = localStorage.getItem('nvidia-vista3d-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.apiKey = config.apiKey || '';
    }
  }

  saveConfig(): void {
    localStorage.setItem('nvidia-vista3d-config', JSON.stringify({
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
        this.http.get<any>(`${environment.api.nvidiaVista3d}/api/v1/nvidia-vista3d/info`)
      );
      this.anatomyGroups = info.anatomy_groups || {};
      this.anatomyGroupKeys = Object.keys(this.anatomyGroups);
      this.sampleDatasets = info.sample_datasets || [];
      this.allClasses = info.supported_classes || [];
      this.totalClasses = info.total_classes || 0;
    } catch {
      // Fallback: use presets
      this.allClasses = this.presets.flatMap(p => p.classes);
      this.sampleDatasets = [{
        id: 'example-1',
        name: 'CT Abdomen (Exemple NVIDIA)',
        url: 'https://assets.ngc.nvidia.com/products/api-catalog/vista3d/example-1.nii.gz',
        description: 'Scan CT abdominal de demonstration',
        region: 'Abdomen',
      }];
    }
  }

  // ==========================================
  //  CLASS SELECTION
  // ==========================================

  toggleClass(cls: string): void {
    const idx = this.selectedClasses.indexOf(cls);
    if (idx >= 0) {
      this.selectedClasses.splice(idx, 1);
    } else {
      this.selectedClasses.push(cls);
    }
  }

  isClassSelected(cls: string): boolean {
    return this.selectedClasses.includes(cls);
  }

  applyPreset(preset: { classes: string[] }): void {
    if (preset.classes.length === 0) {
      this.selectedClasses = [];
    } else {
      this.selectedClasses = [...preset.classes];
    }
  }

  selectGroup(groupKey: string): void {
    const group = this.anatomyGroups[groupKey];
    if (group) {
      this.selectedClasses = [...group.classes];
    }
  }

  clearSelection(): void {
    this.selectedClasses = [];
  }

  // ==========================================
  //  SAMPLE DATASETS
  // ==========================================

  useSampleDataset(dataset: SampleDataset): void {
    this.imageUrl = dataset.url;
  }

  // ==========================================
  //  INFERENCE
  // ==========================================

  async runInference(): Promise<void> {
    if (!this.imageUrl.trim() || this.isProcessing) return;

    if (!this.apiKey) {
      this.errorMessage = this.translate.instant('nvidia_vista3d.errors.api_key_missing');
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.currentResult = null;
    this.processingStage = this.translate.instant('nvidia_vista3d.stages.sending');
    this.cdr.detectChanges();

    try {
      this.processingStage = this.translate.instant('nvidia_vista3d.stages.segmenting');
      this.cdr.detectChanges();

      const payload: any = {
        image_url: this.imageUrl,
      };
      if (this.selectedClasses.length > 0) {
        payload.classes = this.selectedClasses;
      }

      const result = await firstValueFrom(
        this.http.post<InferenceResult>(
          `${environment.api.nvidiaVista3d}/api/v1/nvidia-vista3d/inference`,
          payload,
          { headers: { 'X-Api-Key': this.apiKey } }
        ).pipe(timeout(300000))
      );

      this.currentResult = result;

      if (result.success) {
        this.processingStage = this.translate.instant('nvidia_vista3d.stages.complete');
        // Reset viewer
        this.currentSliceIndex = 0;
        this.coronalSliceIndex = 0;
        this.sagittalSliceIndex = 0;
        this.activeView = 'axial';
        // Add to history
        this.history.unshift({
          id: Date.now().toString(),
          timestamp: new Date(),
          imageUrl: this.imageUrl,
          classes: this.selectedClasses.length > 0 ? [...this.selectedClasses] : ['Tout (auto)'],
          result: result,
        });
      } else {
        this.errorMessage = result.error || 'Erreur inconnue';
      }
    } catch (error: any) {
      const errMsg = error.status === 0
        ? this.translate.instant('nvidia_vista3d.errors.backend_unreachable')
        : (error.error?.detail || error.message || 'Erreur inconnue');
      this.errorMessage = errMsg;
    } finally {
      this.isProcessing = false;
      this.processingStage = '';
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  //  VIEWER
  // ==========================================

  get currentViewSlices(): SlicePreview[] {
    const previews = this.currentResult?.previews;
    if (!previews) return [];
    switch (this.activeView) {
      case 'axial': return previews.axial_slices || [];
      case 'coronal': return previews.coronal_slices || [];
      case 'sagittal': return previews.sagittal_slices || [];
    }
  }

  get currentViewSliceIndex(): number {
    switch (this.activeView) {
      case 'axial': return this.currentSliceIndex;
      case 'coronal': return this.coronalSliceIndex;
      case 'sagittal': return this.sagittalSliceIndex;
    }
  }

  get currentSlice(): SlicePreview | null {
    const slices = this.currentViewSlices;
    if (!slices.length) return null;
    const idx = this.currentViewSliceIndex;
    return slices[idx] || slices[0];
  }

  get maxViewSliceIndex(): number {
    return Math.max(0, this.currentViewSlices.length - 1);
  }

  onSliceChange(value: number): void {
    switch (this.activeView) {
      case 'axial': this.currentSliceIndex = value; break;
      case 'coronal': this.coronalSliceIndex = value; break;
      case 'sagittal': this.sagittalSliceIndex = value; break;
    }
  }

  setView(view: 'axial' | 'coronal' | 'sagittal'): void {
    this.activeView = view;
  }

  // ==========================================
  //  DOWNLOAD
  // ==========================================

  downloadResult(result: InferenceResult): void {
    if (!result.segmentation_base64) return;

    const bytes = this.base64ToArrayBuffer(result.segmentation_base64);
    const blob = new Blob([bytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file_name || 'vista3d_segmentation.zip';
    a.click();
    URL.revokeObjectURL(url);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ==========================================
  //  HELPERS
  // ==========================================

  get canRun(): boolean {
    return this.imageUrl.trim().length > 0 && !this.isProcessing && this.apiKey.length > 0;
  }

  clearHistory(): void {
    this.history = [];
  }

  formatClassName(cls: string): string {
    return cls.charAt(0).toUpperCase() + cls.slice(1);
  }
}
