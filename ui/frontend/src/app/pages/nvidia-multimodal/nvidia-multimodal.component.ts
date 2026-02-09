import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  AfterViewInit, ChangeDetectorRef
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, timeout } from 'rxjs';

import { MarkdownViewerComponent } from '../../shared/components/markdown-viewer/markdown-viewer.component';
import { environment } from '../../../environments/environment';

interface PipelineResponse {
  success: boolean;
  text?: string;
  summary?: string;
  image_base64?: string;
  audio_base64?: string;
  audio_duration?: number;
  blendshapes?: BlendshapeFrame[];
  blendshapes_fps?: number;
  image_analysis?: string;
  transcription?: string;
  tasks_completed?: string[];
  tasks_failed?: string[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: string;
}

interface BlendshapeFrame {
  time: number;
  jawOpen: number;
  mouthClose: number;
  mouthPucker: number;
  mouthSmileLeft: number;
  mouthSmileRight: number;
  browInnerUp: number;
  eyeBlinkLeft: number;
  eyeBlinkRight: number;
  mouthFunnel: number;
  mouthLeft: number;
  mouthRight: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  audio?: string;
  audioDuration?: number;
  blendshapes?: BlendshapeFrame[];
  blendshapesFps?: number;
  summary?: string;
  tasksCompleted?: string[];
  tasksFailed?: string[];
  timestamp: Date;
}

@Component({
  selector: 'app-nvidia-multimodal',
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
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatExpansionModule,
    TranslateModule,
    MarkdownViewerComponent,
  ],
  templateUrl: './nvidia-multimodal.component.html',
  styleUrls: ['./nvidia-multimodal.component.scss'],
})
export class NvidiaMultimodalComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('avatarCanvas') avatarCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  // Config
  apiKey: string = '';
  generateImage: boolean = true;
  generateAudio: boolean = true;
  generateAvatar: boolean = true;
  selectedVoice: string = 'English-US.Female-1';
  selectedAvatar: string = 'claire';

  voices = [
    { value: 'English-US.Female-1', label: 'Female (US)' },
    { value: 'English-US.Male-1', label: 'Male (US)' },
    { value: 'English-UK.Female-1', label: 'Female (UK)' },
  ];

  avatars = [
    { value: 'mark', label: 'Mark' },
    { value: 'claire', label: 'Claire' },
    { value: 'james', label: 'James' },
  ];

  // State
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  isProcessing: boolean = false;
  processingStage: string = '';
  errorMessage: string = '';
  showSettings: boolean = false;

  // Avatar state
  private animationFrameId: number = 0;
  private currentBlendshapes: BlendshapeFrame[] = [];
  private currentFps: number = 30;
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private idleAnimTime: number = 0;
  private idleFrameId: number = 0;

  // Audio
  private currentAudioUrl: string = '';

  // Pipeline progress tracking
  pipelineSteps = [
    { key: 'llm', icon: 'memory', label: 'LLM', done: false, active: false },
    { key: 'flux', icon: 'image', label: 'FLUX', done: false, active: false },
    { key: 'tts', icon: 'record_voice_over', label: 'TTS', done: false, active: false },
    { key: 'a2f', icon: 'face', label: 'A2F', done: false, active: false },
  ];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.addWelcomeMessage();
  }

  ngAfterViewInit(): void {
    this.initAvatarCanvas();
    this.startIdleAnimation();
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    this.stopIdleAnimation();
    if (this.currentAudioUrl) {
      URL.revokeObjectURL(this.currentAudioUrl);
    }
  }

  // ==========================================
  //  CONFIG
  // ==========================================

  loadConfig(): void {
    const saved = localStorage.getItem('nvidia-multimodal-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.apiKey = config.apiKey || '';
      this.generateImage = config.generateImage !== false;
      this.generateAudio = config.generateAudio !== false;
      this.generateAvatar = config.generateAvatar !== false;
      this.selectedVoice = config.selectedVoice || 'English-US.Female-1';
      this.selectedAvatar = config.selectedAvatar || 'claire';
    }
  }

  saveConfig(): void {
    localStorage.setItem('nvidia-multimodal-config', JSON.stringify({
      apiKey: this.apiKey,
      generateImage: this.generateImage,
      generateAudio: this.generateAudio,
      generateAvatar: this.generateAvatar,
      selectedVoice: this.selectedVoice,
      selectedAvatar: this.selectedAvatar,
    }));
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  // ==========================================
  //  CHAT
  // ==========================================

  addWelcomeMessage(): void {
    this.messages.push({
      role: 'assistant',
      content: this.translate.instant('nvidia_multimodal.welcome'),
      timestamp: new Date(),
    });
  }

  async sendMessage(): Promise<void> {
    if (!this.currentMessage.trim() || this.isProcessing) return;

    if (!this.apiKey) {
      this.errorMessage = this.translate.instant('nvidia_multimodal.errors.api_key_missing');
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.resetPipelineSteps();

    const userMsg: ChatMessage = {
      role: 'user',
      content: this.currentMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    const message = this.currentMessage;
    this.currentMessage = '';
    this.scrollToBottom();

    // Animate pipeline steps
    this.pipelineSteps[0].active = true;
    this.processingStage = this.translate.instant('nvidia_multimodal.stages.analyzing');

    try {
      const response = await firstValueFrom(
        this.http.post<PipelineResponse>(
          `${environment.api.nvidiaMultimodal}/api/v1/nvidia-multimodal/pipeline`,
          {
            user_message: message,
            generate_image: this.generateImage,
            generate_audio: this.generateAudio,
            generate_avatar: this.generateAvatar,
            voice: this.selectedVoice,
            avatar: this.selectedAvatar,
          },
          {
            headers: { 'X-Api-Key': this.apiKey },
          }
        ).pipe(timeout(300000))
      );

      // Update pipeline visualization
      this.updatePipelineFromResponse(response);

      if (response.success) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.text || '',
          image: response.image_base64 ? `data:image/png;base64,${response.image_base64}` : undefined,
          audio: response.audio_base64 || undefined,
          audioDuration: response.audio_duration,
          blendshapes: response.blendshapes || undefined,
          blendshapesFps: response.blendshapes_fps || 30,
          summary: response.summary,
          tasksCompleted: response.tasks_completed,
          tasksFailed: response.tasks_failed,
          timestamp: new Date(),
        };
        this.messages.push(assistantMsg);

        // Show activation hint if tasks failed
        if (response.tasks_failed && response.tasks_failed.length > 0) {
          const activationLinks: Record<string, string> = {
            'image_generation': 'https://build.nvidia.com/black-forest-labs/flux_1-schnell',
            'tts': 'https://build.nvidia.com/nvidia/magpie-tts-multilingual',
            'audio2face': 'https://build.nvidia.com/nvidia/audio2face-3d',
          };
          const hints = response.tasks_failed
            .filter(t => activationLinks[t])
            .map(t => `<a href="${activationLinks[t]}" target="_blank">${this.getTaskLabel(t)}</a>`);
          if (hints.length > 0) {
            this.errorMessage = `Some models need activation on build.nvidia.com: ${hints.join(', ')}. Click the links, then click "Get API Key" to activate.`;
          }
        }

        // Auto-play audio and avatar if available
        if (response.audio_base64 && response.blendshapes) {
          setTimeout(() => this.playAudioWithAvatar(response.audio_base64!, response.blendshapes!, response.blendshapes_fps || 30), 500);
        }
      } else {
        this.messages.push({
          role: 'assistant',
          content: `**Erreur:** ${response.error || 'Echec du pipeline'}`,
          timestamp: new Date(),
        });
      }
    } catch (error: any) {
      const errMsg = error.status === 0
        ? this.translate.instant('nvidia_multimodal.errors.backend_unreachable')
        : (error.error?.detail || error.message || 'Erreur inconnue');
      this.errorMessage = errMsg;
      this.messages.push({
        role: 'assistant',
        content: `**Erreur:** ${errMsg}`,
        timestamp: new Date(),
      });
    } finally {
      this.isProcessing = false;
      this.processingStage = '';
      this.scrollToBottom();
    }
  }

  private resetPipelineSteps(): void {
    this.pipelineSteps.forEach(s => { s.done = false; s.active = false; });
  }

  private updatePipelineFromResponse(resp: PipelineResponse): void {
    const completed = resp.tasks_completed || [];
    const failed = resp.tasks_failed || [];

    this.pipelineSteps[0].done = completed.includes('text_generation');
    this.pipelineSteps[0].active = false;
    this.pipelineSteps[1].done = completed.includes('image_generation');
    this.pipelineSteps[2].done = completed.includes('tts');
    this.pipelineSteps[3].done = completed.includes('audio2face');
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages = [];
    this.addWelcomeMessage();
    this.stopAnimation();
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }, 150);
  }

  // ==========================================
  //  AUDIO PLAYBACK
  // ==========================================

  playMessageAudio(msg: ChatMessage): void {
    if (msg.audio && msg.blendshapes) {
      this.playAudioWithAvatar(msg.audio, msg.blendshapes, msg.blendshapesFps || 30);
    } else if (msg.audio) {
      this.playAudioOnly(msg.audio);
    }
  }

  private playAudioOnly(audioBase64: string): void {
    try {
      const audioBytes = this.base64ToArrayBuffer(audioBase64);
      const blob = new Blob([audioBytes], { type: 'audio/wav' });
      if (this.currentAudioUrl) URL.revokeObjectURL(this.currentAudioUrl);
      this.currentAudioUrl = URL.createObjectURL(blob);

      if (this.audioPlayer) {
        this.audioPlayer.nativeElement.src = this.currentAudioUrl;
        this.audioPlayer.nativeElement.play();
      }
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  }

  playAudioWithAvatar(audioBase64: string, blendshapes: BlendshapeFrame[], fps: number): void {
    this.stopAnimation();
    this.stopIdleAnimation();

    const audioBytes = this.base64ToArrayBuffer(audioBase64);
    const blob = new Blob([audioBytes], { type: 'audio/wav' });
    if (this.currentAudioUrl) URL.revokeObjectURL(this.currentAudioUrl);
    this.currentAudioUrl = URL.createObjectURL(blob);

    this.currentBlendshapes = blendshapes;
    this.currentFps = fps;

    if (this.audioPlayer) {
      const audio = this.audioPlayer.nativeElement;
      audio.src = this.currentAudioUrl;

      audio.onplay = () => {
        this.animationStartTime = performance.now();
        this.isAnimating = true;
        this.animateAvatar();
      };

      audio.onended = () => {
        this.isAnimating = false;
        this.startIdleAnimation();
      };

      audio.onpause = () => {
        this.isAnimating = false;
        this.startIdleAnimation();
      };

      audio.play().catch(e => console.error('Audio play failed:', e));
    }
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
  //  AVATAR CANVAS RENDERING (Enhanced 3D)
  // ==========================================

  private initAvatarCanvas(): void {
    if (!this.avatarCanvas) return;
    const canvas = this.avatarCanvas.nativeElement;
    canvas.width = 420;
    canvas.height = 420;
    this.canvasCtx = canvas.getContext('2d');
    this.drawIdleAvatar();
  }

  private drawIdleAvatar(): void {
    this.drawAvatar({
      time: 0, jawOpen: 0, mouthClose: 0.5, mouthPucker: 0,
      mouthSmileLeft: 0.2, mouthSmileRight: 0.2, browInnerUp: 0,
      eyeBlinkLeft: 0, eyeBlinkRight: 0, mouthFunnel: 0,
      mouthLeft: 0, mouthRight: 0,
    });
  }

  private startIdleAnimation(): void {
    this.stopIdleAnimation();
    const animate = () => {
      this.idleAnimTime += 0.016;
      const blink = (Math.sin(this.idleAnimTime * 0.4) > 0.97) ? 0.8 : 0;
      const breathe = 0.02 * Math.sin(this.idleAnimTime * 1.2);

      this.drawAvatar({
        time: this.idleAnimTime,
        jawOpen: 0,
        mouthClose: 0.5,
        mouthPucker: 0,
        mouthSmileLeft: 0.18 + breathe,
        mouthSmileRight: 0.18 + breathe,
        browInnerUp: 0.02 * Math.sin(this.idleAnimTime * 0.7),
        eyeBlinkLeft: blink,
        eyeBlinkRight: blink,
        mouthFunnel: 0,
        mouthLeft: 0,
        mouthRight: 0,
      });
      this.idleFrameId = requestAnimationFrame(animate);
    };
    this.idleFrameId = requestAnimationFrame(animate);
  }

  private stopIdleAnimation(): void {
    if (this.idleFrameId) {
      cancelAnimationFrame(this.idleFrameId);
      this.idleFrameId = 0;
    }
  }

  private animateAvatar(): void {
    if (!this.isAnimating || !this.currentBlendshapes.length) return;

    const elapsed = (performance.now() - this.animationStartTime) / 1000;
    const frameIndex = Math.min(
      Math.floor(elapsed * this.currentFps),
      this.currentBlendshapes.length - 1
    );

    this.drawAvatar(this.currentBlendshapes[frameIndex]);

    if (frameIndex < this.currentBlendshapes.length - 1) {
      this.animationFrameId = requestAnimationFrame(() => this.animateAvatar());
    } else {
      this.isAnimating = false;
      this.startIdleAnimation();
    }
  }

  private stopAnimation(): void {
    this.isAnimating = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  private drawAvatar(frame: BlendshapeFrame): void {
    const ctx = this.canvasCtx;
    if (!ctx) return;

    const w = 420, h = 420;
    const cx = w / 2, cy = h / 2 - 10;

    ctx.clearRect(0, 0, w, h);

    // Background - deep dark gradient
    const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 280);
    bgGrad.addColorStop(0, '#1e2a3a');
    bgGrad.addColorStop(0.5, '#0f1923');
    bgGrad.addColorStop(1, '#080d14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle particle grid
    ctx.globalAlpha = 0.03;
    for (let x = 0; x < w; x += 20) {
      for (let y = 0; y < h; y += 20) {
        ctx.fillStyle = '#76b900';
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;

    // Outer glow ring
    const glowPhase = (frame.time || Date.now() / 1000) * 1.5;
    const glowAlpha = this.isAnimating ? 0.5 + 0.2 * Math.sin(glowPhase) : 0.15 + 0.05 * Math.sin(glowPhase);
    ctx.beginPath();
    ctx.arc(cx, cy, 155, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(118, 185, 0, ${glowAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glow
    if (this.isAnimating) {
      const innerGlow = ctx.createRadialGradient(cx, cy, 100, cx, cy, 160);
      innerGlow.addColorStop(0, 'rgba(118, 185, 0, 0)');
      innerGlow.addColorStop(0.8, 'rgba(118, 185, 0, 0.03)');
      innerGlow.addColorStop(1, 'rgba(118, 185, 0, 0.08)');
      ctx.fillStyle = innerGlow;
      ctx.fillRect(0, 0, w, h);
    }

    // Neck
    ctx.beginPath();
    ctx.moveTo(cx - 25, cy + 95);
    ctx.lineTo(cx - 30, cy + 140);
    ctx.lineTo(cx + 30, cy + 140);
    ctx.lineTo(cx + 25, cy + 95);
    ctx.closePath();
    const neckGrad = ctx.createLinearGradient(cx, cy + 90, cx, cy + 140);
    neckGrad.addColorStop(0, '#e8c4a0');
    neckGrad.addColorStop(1, '#d4a574');
    ctx.fillStyle = neckGrad;
    ctx.fill();

    // Shoulders hint
    ctx.beginPath();
    ctx.ellipse(cx, cy + 155, 85, 25, 0, 0, Math.PI);
    const shoulderGrad = ctx.createLinearGradient(cx - 85, cy + 130, cx + 85, cy + 180);
    shoulderGrad.addColorStop(0, '#2a3a4a');
    shoulderGrad.addColorStop(0.5, '#3a4a5a');
    shoulderGrad.addColorStop(1, '#2a3a4a');
    ctx.fillStyle = shoulderGrad;
    ctx.fill();

    // Head shadow
    ctx.beginPath();
    ctx.ellipse(cx + 3, cy + 3, 92, 112, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.ellipse(cx, cy, 90, 110, 0, 0, Math.PI * 2);
    const headGrad = ctx.createRadialGradient(cx - 15, cy - 30, 10, cx, cy, 110);
    headGrad.addColorStop(0, '#fce4cc');
    headGrad.addColorStop(0.5, '#f5d6b8');
    headGrad.addColorStop(1, '#e0b892');
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 140, 100, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Hair
    ctx.beginPath();
    ctx.ellipse(cx, cy - 80, 95, 60, 0, Math.PI * 0.95, Math.PI * 2.05);
    const hairGrad = ctx.createLinearGradient(cx - 95, cy - 140, cx + 95, cy - 20);
    hairGrad.addColorStop(0, '#1a0f08');
    hairGrad.addColorStop(0.3, '#2c1810');
    hairGrad.addColorStop(0.7, '#3a2218');
    hairGrad.addColorStop(1, '#2c1810');
    ctx.fillStyle = hairGrad;
    ctx.fill();

    // Hair sides
    ctx.beginPath();
    ctx.ellipse(cx - 82, cy - 30, 18, 45, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#2c1810';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 82, cy - 30, 18, 45, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#2c1810';
    ctx.fill();

    // Ears
    this.drawEar(ctx, cx - 85, cy - 20, false);
    this.drawEar(ctx, cx + 85, cy - 20, true);

    // Eyes
    const eyeY = cy - 25;
    const eyeSpacing = 32;
    this.drawEye3D(ctx, cx - eyeSpacing, eyeY, frame.eyeBlinkLeft, frame.browInnerUp, false);
    this.drawEye3D(ctx, cx + eyeSpacing, eyeY, frame.eyeBlinkRight, frame.browInnerUp, true);

    // Nose with 3D shading
    this.drawNose3D(ctx, cx, cy + 8);

    // Mouth with 3D effect
    this.drawMouth3D(ctx, cx, cy + 38, frame);

    // Cheek blush
    ctx.globalAlpha = 0.06;
    ctx.beginPath();
    ctx.arc(cx - 55, cy + 15, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#ff9999';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 55, cy + 15, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // NVIDIA branded status bar at bottom
    this.drawStatusBar(ctx, w, h);
  }

  private drawEar(ctx: CanvasRenderingContext2D, x: number, y: number, mirror: boolean): void {
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 18, mirror ? -0.15 : 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#e8c4a0';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + (mirror ? -2 : 2), y, 6, 12, mirror ? -0.15 : 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#d8b48f';
    ctx.fill();
  }

  private drawEye3D(ctx: CanvasRenderingContext2D, x: number, y: number, blink: number, browUp: number, isRight: boolean): void {
    const eyeH = 13 * (1 - blink * 0.92);

    // Eye socket shadow
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 19, Math.max(2, eyeH + 2), 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160, 120, 80, 0.12)';
    ctx.fill();

    // Eye white with slight shadow
    ctx.beginPath();
    ctx.ellipse(x, y, 17, Math.max(1.5, eyeH), 0, 0, Math.PI * 2);
    const eyeGrad = ctx.createLinearGradient(x, y - eyeH, x, y + eyeH);
    eyeGrad.addColorStop(0, '#f5f5f5');
    eyeGrad.addColorStop(0.4, '#ffffff');
    eyeGrad.addColorStop(1, '#e8e8e8');
    ctx.fillStyle = eyeGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 120, 90, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (eyeH > 3) {
      // Iris with radial gradient
      const irisR = 8;
      ctx.beginPath();
      ctx.arc(x, y, irisR, 0, Math.PI * 2);
      const irisGrad = ctx.createRadialGradient(x, y, 1, x, y, irisR);
      irisGrad.addColorStop(0, '#5a4530');
      irisGrad.addColorStop(0.3, '#4a3520');
      irisGrad.addColorStop(0.7, '#3a2515');
      irisGrad.addColorStop(1, '#2a1a0a');
      ctx.fillStyle = irisGrad;
      ctx.fill();

      // Pupil
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();

      // Eye highlights (multiple for 3D effect)
      ctx.beginPath();
      ctx.arc(x + 3, y - 3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - 2, y + 2, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Eyelid line
      ctx.beginPath();
      ctx.ellipse(x, y - eyeH * 0.3, 17, eyeH * 0.5, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 70, 40, 0.15)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Eyelashes (subtle)
    if (eyeH > 5) {
      ctx.beginPath();
      ctx.ellipse(x, y - 1, 18, eyeH + 1, 0, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = 'rgba(40, 25, 15, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Eyebrow with 3D
    const browY = y - 24 - browUp * 6;
    ctx.beginPath();
    ctx.moveTo(x - 20, browY + 4);
    ctx.quadraticCurveTo(x - 5, browY - 3, x + 2, browY);
    ctx.quadraticCurveTo(x + 12, browY + 1, x + 20, browY + 5);
    ctx.strokeStyle = '#2a1810';
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  private drawNose3D(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Nose bridge highlight
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 28);
    ctx.quadraticCurveTo(x + 2, y - 10, x, y);
    ctx.strokeStyle = 'rgba(255, 240, 220, 0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Nose shape
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.quadraticCurveTo(x - 2, y - 5, x - 10, y + 5);
    ctx.quadraticCurveTo(x, y + 9, x + 10, y + 5);
    ctx.quadraticCurveTo(x + 2, y - 5, x, y - 15);
    ctx.strokeStyle = 'rgba(180, 140, 100, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Nostril shadows
    ctx.beginPath();
    ctx.ellipse(x - 6, y + 3, 3.5, 2.5, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160, 120, 80, 0.12)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 6, y + 3, 3.5, 2.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose tip highlight
    ctx.beginPath();
    ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 240, 220, 0.08)';
    ctx.fill();
  }

  private drawMouth3D(ctx: CanvasRenderingContext2D, x: number, y: number, frame: BlendshapeFrame): void {
    const jawOpen = frame.jawOpen;
    const smileL = frame.mouthSmileLeft;
    const smileR = frame.mouthSmileRight;
    const pucker = frame.mouthPucker;
    const funnel = frame.mouthFunnel;

    const mouthWidth = 28 - pucker * 15 + (smileL + smileR) * 5;
    const mouthHeight = 2.5 + jawOpen * 20;
    const cornerLift = (smileL + smileR) * 5;

    if (jawOpen > 0.12) {
      // Open mouth with interior
      ctx.beginPath();
      ctx.ellipse(x, y + mouthHeight / 3, mouthWidth, mouthHeight, 0, 0, Math.PI * 2);

      const mouthGrad = ctx.createRadialGradient(
        x, y + mouthHeight / 3, 2,
        x, y + mouthHeight / 3, mouthHeight + 2
      );
      mouthGrad.addColorStop(0, '#6a1a1a');
      mouthGrad.addColorStop(0.5, '#4a0e0e');
      mouthGrad.addColorStop(1, '#2a0505');
      ctx.fillStyle = mouthGrad;
      ctx.fill();

      // Tongue hint
      if (jawOpen > 0.3) {
        ctx.beginPath();
        ctx.ellipse(x, y + mouthHeight * 0.6, mouthWidth * 0.5, mouthHeight * 0.3, 0, 0, Math.PI);
        ctx.fillStyle = '#cc6666';
        ctx.fill();
      }

      // Upper teeth
      if (jawOpen > 0.25) {
        ctx.beginPath();
        ctx.ellipse(x, y - 1, mouthWidth * 0.65, 4, 0, 0, Math.PI);
        ctx.fillStyle = '#f5f0eb';
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 190, 180, 0.3)';
        ctx.lineWidth = 0.3;
        ctx.stroke();
      }

      // Lips outline with gradient
      ctx.beginPath();
      ctx.ellipse(x, y + mouthHeight / 3, mouthWidth + 3, mouthHeight + 3, 0, 0, Math.PI * 2);
      const lipGrad = ctx.createLinearGradient(x, y - mouthHeight, x, y + mouthHeight * 2);
      lipGrad.addColorStop(0, '#cc8878');
      lipGrad.addColorStop(0.5, '#c47a6a');
      lipGrad.addColorStop(1, '#b86a5a');
      ctx.strokeStyle = lipGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      // Closed/smiling mouth with lip detail
      // Lower lip shadow
      ctx.beginPath();
      ctx.moveTo(x - mouthWidth + 2, y + 2);
      ctx.quadraticCurveTo(x, y + 10 + cornerLift, x + mouthWidth - 2, y + 2);
      ctx.strokeStyle = 'rgba(180, 120, 100, 0.15)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Main mouth line
      ctx.beginPath();
      ctx.moveTo(x - mouthWidth, y);
      ctx.quadraticCurveTo(x, y + 7 + cornerLift, x + mouthWidth, y);
      const lipColor = ctx.createLinearGradient(x - mouthWidth, y, x + mouthWidth, y);
      lipColor.addColorStop(0, '#b86a5a');
      lipColor.addColorStop(0.5, '#cc8070');
      lipColor.addColorStop(1, '#b86a5a');
      ctx.strokeStyle = lipColor;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Upper lip shape
      ctx.beginPath();
      ctx.moveTo(x - mouthWidth * 0.6, y - 1);
      ctx.quadraticCurveTo(x - 3, y - 4, x, y - 2);
      ctx.quadraticCurveTo(x + 3, y - 4, x + mouthWidth * 0.6, y - 1);
      ctx.strokeStyle = 'rgba(180, 120, 100, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Status bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.roundRect(20, h - 50, w - 40, 36, 10);
    ctx.fill();

    // Status dot
    const dotColor = this.isAnimating ? '#76b900' : '#555';
    ctx.beginPath();
    ctx.arc(40, h - 32, 5, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();

    if (this.isAnimating) {
      ctx.beginPath();
      ctx.arc(40, h - 32, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(118, 185, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Status text
    ctx.fillStyle = this.isAnimating ? '#76b900' : '#888';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.isAnimating ? 'Speaking...' : 'Idle', 52, h - 28);

    // NVIDIA badge
    ctx.fillStyle = '#76b900';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('NVIDIA Audio2Face', w - 35, h - 28);

    // Avatar name
    const avatarName = this.selectedAvatar.charAt(0).toUpperCase() + this.selectedAvatar.slice(1);
    ctx.fillStyle = '#666';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(avatarName, w / 2, h - 28);
  }

  // ==========================================
  //  HELPERS
  // ==========================================

  get canSend(): boolean {
    return this.currentMessage.trim().length > 0 && !this.isProcessing && this.apiKey.length > 0;
  }

  getTaskIcon(task: string): string {
    const icons: Record<string, string> = {
      'text_generation': 'text_fields',
      'image_generation': 'image',
      'tts': 'record_voice_over',
      'stt': 'hearing',
      'image_analysis': 'visibility',
      'audio2face': 'face',
    };
    return icons[task] || 'check_circle';
  }

  getTaskLabel(task: string): string {
    const labels: Record<string, string> = {
      'text_generation': 'Llama 3.1 LLM',
      'image_generation': 'FLUX.1 schnell',
      'tts': 'Magpie TTS',
      'stt': 'Parakeet STT',
      'image_analysis': 'NVLM Vision',
      'audio2face': 'Audio2Face 3D',
    };
    return labels[task] || task;
  }
}
