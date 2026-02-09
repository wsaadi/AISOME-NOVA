import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  AfterViewInit, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

interface VlmModelOption {
  id: string;
  name: string;
  hfId: string;
  task: string;
  size: string;
  description: string;
  dtype?: any;
  /** If true, use AutoModelForImageTextToText + AutoProcessor instead of pipeline */
  useAutoModel?: boolean;
  prompt?: string;
}

interface DescriptionEntry {
  timestamp: Date;
  text: string;
  imageDataUrl: string;
  inferenceTimeMs: number;
  modelName: string;
}

type ModelStatus = 'idle' | 'checking' | 'downloading' | 'loading' | 'ready' | 'error';

const AVAILABLE_MODELS: VlmModelOption[] = [
  {
    id: 'fastvlm-05b',
    name: 'FastVLM 0.5B',
    hfId: 'onnx-community/FastVLM-0.5B-ONNX',
    task: 'image-text-to-text',
    size: '~500 Mo',
    description: 'Apple FastVLM — rapide et précis, descriptions détaillées',
    useAutoModel: true,
    dtype: {
      embed_tokens: 'fp16',
      vision_encoder: 'q4',
      decoder_model_merged: 'q4',
    },
    prompt: 'Describe this image in detail.',
  },
  {
    id: 'vit-gpt2',
    name: 'ViT-GPT2 Caption',
    hfId: 'Xenova/vit-gpt2-image-captioning',
    task: 'image-to-text',
    size: '~300 Mo',
    description: 'Rapide et léger — descriptions courtes en anglais',
  },
  {
    id: 'blip-base',
    name: 'BLIP Base',
    hfId: 'Xenova/blip-image-captioning-base',
    task: 'image-to-text',
    size: '~470 Mo',
    description: 'Descriptions plus riches et détaillées',
  },
  {
    id: 'git-base-coco',
    name: 'GIT Base COCO',
    hfId: 'Xenova/git-base-coco',
    task: 'image-to-text',
    size: '~700 Mo',
    description: 'Microsoft GIT — descriptions précises, entraîné sur COCO',
  },
  {
    id: 'vit-gpt2-coco',
    name: 'ViT-GPT2 COCO',
    hfId: 'Xenova/vit-gpt2-image-captioning-coco-en',
    task: 'image-to-text',
    size: '~300 Mo',
    description: 'Optimisé pour objets du quotidien (COCO)',
  }
];

@Component({
  selector: 'app-webgpu-local-agent',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatProgressBarModule, MatProgressSpinnerModule, MatTooltipModule,
    MatChipsModule, MatSlideToggleModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, TranslateModule
  ],
  templateUrl: './webgpu-local-agent.component.html',
  styleUrls: ['./webgpu-local-agent.component.scss']
})
export class WebgpuLocalAgentComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('descriptionsContainer') descriptionsRef!: ElementRef<HTMLDivElement>;

  // WebGPU
  webgpuSupported = false;
  gpuAdapterInfo = '';

  // Models
  availableModels = AVAILABLE_MODELS;
  selectedModelId = 'fastvlm-05b';
  loadedModelId = '';

  // Model state
  modelStatus: ModelStatus = 'idle';
  modelLoadProgress = 0;
  modelLoadStep = '';
  modelError = '';

  // Camera
  cameraActive = false;
  cameraError = '';
  availableCameras: MediaDeviceInfo[] = [];
  selectedCameraId = '';
  private mediaStream: MediaStream | null = null;

  // Inference
  isAnalyzing = false;
  autoMode = false;
  autoIntervalSec = 4;
  descriptions: DescriptionEntry[] = [];
  private autoTimer: any = null;
  private pipelineInstance: any = null;
  private autoModelInstance: any = null;
  private autoProcessorInstance: any = null;

  // Stats
  totalInferences = 0;
  avgInferenceTime = 0;

  // Settings
  showSettings = false;

  get selectedModel(): VlmModelOption {
    return this.availableModels.find(m => m.id === this.selectedModelId) || this.availableModels[0];
  }

  get needsReload(): boolean {
    return this.modelStatus === 'ready' && this.loadedModelId !== this.selectedModelId;
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.checkWebGPUSupport();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.stopAutoMode();
    this.stopCamera();
    this.pipelineInstance = null;
    this.autoModelInstance = null;
    this.autoProcessorInstance = null;
  }

  async checkWebGPUSupport(): Promise<void> {
    this.modelStatus = 'checking';
    try {
      if (!('gpu' in navigator)) {
        this.webgpuSupported = false;
        this.gpuAdapterInfo = 'WebGPU non disponible';
        this.modelStatus = 'error';
        this.modelError = 'WebGPU n\'est pas supporté. Utilisez Chrome 113+ ou Edge 113+.';
        return;
      }
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) {
        this.webgpuSupported = false;
        this.gpuAdapterInfo = 'Aucun adaptateur GPU trouvé';
        this.modelStatus = 'error';
        this.modelError = 'Aucun adaptateur GPU compatible trouvé.';
        return;
      }
      const info = await adapter.requestAdapterInfo?.() || {};
      this.webgpuSupported = true;
      this.gpuAdapterInfo = info.description || info.vendor || 'GPU détecté';
      this.modelStatus = 'idle';
    } catch (e: any) {
      this.webgpuSupported = false;
      this.modelStatus = 'error';
      this.modelError = `Erreur WebGPU: ${e.message}`;
    }
    this.cdr.detectChanges();
  }

  async loadModel(): Promise<void> {
    if (this.modelStatus === 'loading' || this.modelStatus === 'downloading') return;

    const model = this.selectedModel;
    this.modelStatus = 'downloading';
    this.modelLoadProgress = 0;
    this.modelLoadStep = 'Chargement de Transformers.js...';
    this.modelError = '';
    this.pipelineInstance = null;
    this.autoModelInstance = null;
    this.autoProcessorInstance = null;
    this.cdr.detectChanges();

    try {
      const transformers = await import('@huggingface/transformers');
      const { env } = transformers;
      env.allowLocalModels = false;

      this.modelLoadStep = `Initialisation de ${model.name}...`;
      this.modelStatus = 'loading';
      this.modelLoadProgress = 10;
      this.cdr.detectChanges();

      const progressCallback = (progress: any) => {
        if (progress.status === 'progress' && progress.progress) {
          this.ngZone.run(() => {
            this.modelLoadProgress = Math.min(10 + progress.progress * 0.85, 95);
            this.modelLoadStep = `Téléchargement: ${Math.round(progress.progress)}%`;
            this.cdr.detectChanges();
          });
        } else if (progress.status === 'ready') {
          this.ngZone.run(() => {
            this.modelLoadProgress = 95;
            this.modelLoadStep = 'Modèle prêt, finalisation...';
            this.cdr.detectChanges();
          });
        }
      };

      if (model.useAutoModel) {
        // FastVLM / AutoModel path
        const { AutoModelForImageTextToText, AutoProcessor } = transformers;

        const modelOpts: any = {
          device: 'webgpu',
          progress_callback: progressCallback,
        };
        if (model.dtype) {
          modelOpts.dtype = model.dtype;
        }

        const [autoModel, processor] = await Promise.all([
          (AutoModelForImageTextToText as any).from_pretrained(model.hfId, modelOpts),
          (AutoProcessor as any).from_pretrained(model.hfId),
        ]);

        this.autoModelInstance = autoModel;
        this.autoProcessorInstance = processor;
      } else {
        // Simple pipeline path
        const { pipeline } = transformers;
        const pipelineOpts: any = {
          device: 'webgpu',
          progress_callback: progressCallback,
        };
        if (model.dtype) {
          pipelineOpts.dtype = model.dtype;
        }

        this.pipelineInstance = await pipeline(
          model.task as any,
          model.hfId,
          pipelineOpts
        );
      }

      this.loadedModelId = model.id;
      this.modelLoadProgress = 100;
      this.modelLoadStep = `${model.name} chargé !`;
      this.modelStatus = 'ready';
      this.cdr.detectChanges();
    } catch (e: any) {
      console.error('Model loading error:', e);
      this.modelStatus = 'error';
      this.modelError = `Erreur: ${e.message}`;
      this.cdr.detectChanges();
    }
  }

  async startCamera(): Promise<void> {
    this.cameraError = '';
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter(d => d.kind === 'videoinput');

      const constraints: MediaStreamConstraints = {
        video: this.selectedCameraId
          ? { deviceId: { exact: this.selectedCameraId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!this.selectedCameraId && this.mediaStream.getVideoTracks().length > 0) {
        this.selectedCameraId = this.mediaStream.getVideoTracks()[0].getSettings().deviceId || '';
      }

      const video = this.videoRef.nativeElement;
      video.srcObject = this.mediaStream;
      await video.play();
      this.cameraActive = true;
      this.cdr.detectChanges();

      const updatedDevices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = updatedDevices.filter(d => d.kind === 'videoinput');
      this.cdr.detectChanges();
    } catch (e: any) {
      this.cameraError = `Impossible d'accéder à la caméra: ${e.message}`;
      this.cdr.detectChanges();
    }
  }

  stopCamera(): void {
    this.stopAutoMode();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
    this.cdr.detectChanges();
  }

  async switchCamera(deviceId: string): Promise<void> {
    this.selectedCameraId = deviceId;
    if (this.cameraActive) {
      this.stopCamera();
      await this.startCamera();
    }
  }

  captureFrame(): string {
    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  private get isModelReady(): boolean {
    const model = this.selectedModel;
    if (model.useAutoModel) {
      return !!(this.autoModelInstance && this.autoProcessorInstance);
    }
    return !!this.pipelineInstance;
  }

  async analyzeFrame(): Promise<void> {
    if (!this.isModelReady || this.isAnalyzing || !this.cameraActive) return;

    this.isAnalyzing = true;
    this.cdr.detectChanges();

    try {
      const imageDataUrl = this.captureFrame();
      const startTime = performance.now();
      const loadedModel = this.availableModels.find(m => m.id === this.loadedModelId)!;

      let text = '';

      if (loadedModel.useAutoModel) {
        // FastVLM path: use AutoProcessor + model.generate()
        const transformers = await import('@huggingface/transformers');
        const { load_image } = transformers;

        const image = await (load_image as any)(imageDataUrl);

        const messages = [
          { role: 'user', content: `<image>${loadedModel.prompt || 'Describe this image.'}` },
        ];
        const prompt = this.autoProcessorInstance.apply_chat_template(messages, {
          add_generation_prompt: true,
        });

        const inputs = await this.autoProcessorInstance(image, prompt, {
          add_special_tokens: false,
        });

        const outputs = await this.autoModelInstance.generate({
          ...inputs,
          max_new_tokens: 256,
          do_sample: false,
        });

        // Decode only the new tokens (skip input tokens)
        const inputLength = inputs.input_ids.dims?.at(-1) || 0;
        // outputs is a Tensor with shape [1, seq_len] — extract the generated token IDs
        const allTokenIds = Array.from(outputs.data as any, (v: any) => Number(v));
        const newTokenIds = allTokenIds.slice(inputLength);
        text = this.autoProcessorInstance.tokenizer.decode(newTokenIds, { skip_special_tokens: true }).trim();
      } else {
        // Simple pipeline path
        const result = await this.pipelineInstance(imageDataUrl);

        if (Array.isArray(result) && result.length > 0) {
          text = result[0].generated_text || JSON.stringify(result[0]);
        } else if (typeof result === 'string') {
          text = result;
        } else {
          text = JSON.stringify(result);
        }
      }

      const inferenceTimeMs = Math.round(performance.now() - startTime);

      const entry: DescriptionEntry = {
        timestamp: new Date(),
        text,
        imageDataUrl,
        inferenceTimeMs,
        modelName: loadedModel.name
      };

      this.descriptions.unshift(entry);
      if (this.descriptions.length > 50) {
        this.descriptions.pop();
      }

      this.totalInferences++;
      this.avgInferenceTime = Math.round(
        this.descriptions.reduce((s, d) => s + d.inferenceTimeMs, 0) / this.descriptions.length
      );
    } catch (e: any) {
      console.error('Inference error:', e);
      this.descriptions.unshift({
        timestamp: new Date(),
        text: `Erreur: ${e.message}`,
        imageDataUrl: '',
        inferenceTimeMs: 0,
        modelName: this.selectedModel.name
      });
    }

    this.isAnalyzing = false;
    this.cdr.detectChanges();
  }

  toggleAutoMode(): void {
    if (this.autoMode) {
      this.stopAutoMode();
    } else {
      this.startAutoMode();
    }
  }

  startAutoMode(): void {
    this.autoMode = true;
    this.runAutoLoop();
  }

  private async runAutoLoop(): Promise<void> {
    if (!this.autoMode) return;
    await this.analyzeFrame();
    if (this.autoMode) {
      this.autoTimer = setTimeout(() => this.runAutoLoop(), this.autoIntervalSec * 1000);
    }
  }

  stopAutoMode(): void {
    this.autoMode = false;
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    this.cdr.detectChanges();
  }

  clearDescriptions(): void {
    this.descriptions = [];
    this.totalInferences = 0;
    this.avgInferenceTime = 0;
    this.cdr.detectChanges();
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
