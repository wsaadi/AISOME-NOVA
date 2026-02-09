import {
  Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef,
  ElementRef, ViewChild, NgZone
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

import * as THREE from 'three';

import { environment } from '../../../environments/environment';

// ==========================================
//  INTERFACES
// ==========================================

interface VariableInfo { id: string; name: string; unit: string; }
interface VariableGroup { label: string; icon: string; variables: VariableInfo[]; }
interface Preset { id: string; label: string; icon: string; variables: string[]; }

interface VariablePreview {
  variable: string;
  name: string;
  unit: string;
  image: string;  // equirectangular base64 PNG
  colorbar: string; // colorbar base64 PNG
  min: number;
  max: number;
  mean: number;
}

interface ForecastStep {
  step: number;
  hours_ahead: number;
  valid_time: string;
  variables: VariablePreview[];
}

interface InferenceResult {
  success: boolean;
  message?: string;
  forecasts?: ForecastStep[];
  variables_available?: string[];
  simulation_length?: number;
  initial_date?: string;
  error?: string;
  demo_mode?: boolean;
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  date: string;
  simulationLength: number;
  variables: string[];
  result: InferenceResult;
}

@Component({
  selector: 'app-nvidia-fourcastnet',
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
  templateUrl: './nvidia-fourcastnet.component.html',
  styleUrls: ['./nvidia-fourcastnet.component.scss'],
})
export class NvidiaFourcastnetComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('globeCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Config
  apiKey: string = '';
  showSettings: boolean = false;

  // Input
  initialDate: string = '';
  simulationLength: number = 4;
  selectedVariables: string[] = [];

  // Model info
  variableGroups: Record<string, VariableGroup> = {};
  variableGroupKeys: string[] = [];
  presets: Preset[] = [];
  allVariables: string[] = [];
  totalVariables: number = 0;

  // State
  isProcessing: boolean = false;
  processingStage: string = '';
  errorMessage: string = '';
  currentResult: InferenceResult | null = null;
  history: HistoryEntry[] = [];

  // Viewer state
  currentStepIndex: number = 0;
  currentVariableIndex: number = 0;

  // Three.js
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private globe!: THREE.Mesh;
  private globeMaterial!: THREE.MeshPhongMaterial;
  private atmosphereMeshes: THREE.Mesh[] = [];
  private starField!: THREE.Points;
  private textureLoader!: THREE.TextureLoader;
  private maxAnisotropy: number = 1;
  private animFrameId: number = 0;
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private rotationSpeed = { x: 0, y: 0.002 };
  private velocity = { x: 0, y: 0 };
  private targetRotation = { x: 0.3, y: 0 };
  globeReady = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadModelInfo();
    this.setDefaultDate();
  }

  ngAfterViewInit(): void {
    // Globe is initialized when results arrive
  }

  ngOnDestroy(): void {
    this.disposeGlobe();
  }

  // ==========================================
  //  THREE.JS 3D GLOBE
  // ==========================================

  private initGlobe(): void {
    if (!this.canvasRef?.nativeElement) return;
    if (this.renderer) return; // already initialized

    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    const w = container.clientWidth;
    const h = Math.max(400, Math.min(w * 0.75, 600));

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x030712, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textureLoader = new THREE.TextureLoader();

    // Scene
    this.scene = new THREE.Scene();

    // Starfield background
    this.createStarField();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 2.8);

    // Lights — hemisphere for natural ambient + warm directional sun + cool rim
    const hemi = new THREE.HemisphereLight(0x6088c0, 0x101830, 0.4);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0dd, 1.2);
    sun.position.set(5, 3, 4);
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x4488ff, 0.3);
    rim.position.set(-4, -1, -3);
    this.scene.add(rim);

    // Globe sphere — high detail
    const geo = new THREE.SphereGeometry(1, 192, 96);
    this.globeMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 15,
      specular: 0x222233,
      emissive: 0x050510,
      emissiveIntensity: 0.15,
    });
    this.globe = new THREE.Mesh(geo, this.globeMaterial);
    this.globe.rotation.x = 0.3;
    this.scene.add(this.globe);

    // Load base Earth texture (visible before forecast data loads)
    this.loadBaseEarthTexture();

    // Multi-layer atmosphere glow (Fresnel-like via custom shaders)
    this.createAtmosphere();

    // Mouse interaction
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Touch support
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onMouseUp);

    this.globeReady = true;

    // Start render loop outside angular zone for performance
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private createStarField(): void {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 450;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
    });
    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);
  }

  private createAtmosphere(): void {
    // Inner glow — subtle Fresnel-like edge glow using a custom shader
    const atmosphereVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const atmosphereFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform vec3 glowColor;
      uniform float intensity;
      uniform float power;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), power);
        gl_FragColor = vec4(glowColor, fresnel * intensity);
      }
    `;

    // Layer 1: Tight inner atmosphere (cyan-blue)
    const atmo1Geo = new THREE.SphereGeometry(1.015, 64, 32);
    const atmo1Mat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0x4499ff) },
        intensity: { value: 0.8 },
        power: { value: 3.5 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });
    const atmo1 = new THREE.Mesh(atmo1Geo, atmo1Mat);
    this.scene.add(atmo1);
    this.atmosphereMeshes.push(atmo1);

    // Layer 2: Outer halo (wider, softer, blue)
    const atmo2Geo = new THREE.SphereGeometry(1.12, 64, 32);
    const atmo2Mat = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        glowColor: { value: new THREE.Color(0x2266cc) },
        intensity: { value: 0.35 },
        power: { value: 2.0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmo2 = new THREE.Mesh(atmo2Geo, atmo2Mat);
    this.scene.add(atmo2);
    this.atmosphereMeshes.push(atmo2);
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    if (this.globe) {
      if (this.isDragging) {
        // No auto-rotation while dragging
      } else {
        // Apply inertia decay
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;

        // If velocity is very low, apply gentle auto-rotation
        if (Math.abs(this.velocity.y) < 0.0005) {
          this.velocity.y = this.rotationSpeed.y;
        }

        this.globe.rotation.y += this.velocity.y;
        this.globe.rotation.x += this.velocity.x;
        this.globe.rotation.x = Math.max(-1.2, Math.min(1.2, this.globe.rotation.x));
      }

      // Keep atmosphere layers in sync with globe rotation
      for (const atmo of this.atmosphereMeshes) {
        atmo.rotation.copy(this.globe.rotation);
      }
    }

    // Slowly rotate star field for subtle depth
    if (this.starField) {
      this.starField.rotation.y += 0.00005;
    }

    this.renderer?.render(this.scene, this.camera);
  };

  private disposeGlobe(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.canvasRef?.nativeElement) {
      const c = this.canvasRef.nativeElement;
      c.removeEventListener('mousedown', this.onMouseDown);
      c.removeEventListener('mousemove', this.onMouseMove);
      c.removeEventListener('mouseup', this.onMouseUp);
      c.removeEventListener('mouseleave', this.onMouseUp);
      c.removeEventListener('wheel', this.onWheel);
      c.removeEventListener('touchstart', this.onTouchStart);
      c.removeEventListener('touchmove', this.onTouchMove);
      c.removeEventListener('touchend', this.onMouseUp);
    }
    this.renderer?.dispose();
    this.globeMaterial?.map?.dispose();
    this.globeMaterial?.dispose();
    this.globe?.geometry?.dispose();
    for (const m of this.atmosphereMeshes) {
      m.geometry?.dispose();
      (m.material as THREE.Material)?.dispose();
    }
    this.atmosphereMeshes = [];
    if (this.starField) {
      this.starField.geometry?.dispose();
      (this.starField.material as THREE.Material)?.dispose();
    }
  }

  // Mouse handlers
  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.globe) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.velocity.y = dx * 0.005;
    this.velocity.x = dy * 0.005;
    this.globe.rotation.y += this.velocity.y;
    this.globe.rotation.x += this.velocity.x;
    this.globe.rotation.x = Math.max(-1.2, Math.min(1.2, this.globe.rotation.x));
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    // velocity is preserved for inertia effect
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const z = this.camera.position.z + e.deltaY * 0.002;
    this.camera.position.z = Math.max(1.8, Math.min(5, z));
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDragging || !this.globe || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.previousMouse.x;
    const dy = e.touches[0].clientY - this.previousMouse.y;
    this.velocity.y = dx * 0.005;
    this.velocity.x = dy * 0.005;
    this.globe.rotation.y += this.velocity.y;
    this.globe.rotation.x += this.velocity.x;
    this.globe.rotation.x = Math.max(-1.2, Math.min(1.2, this.globe.rotation.x));
    this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  /** Apply high-quality filtering to a texture */
  private applyTextureQuality(tex: THREE.Texture): void {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = this.maxAnisotropy;
    tex.generateMipmaps = true;
  }

  /** Load a base Earth texture so the globe shows continents before forecast data */
  private loadBaseEarthTexture(): void {
    // Use NASA Blue Marble from a public CDN
    const earthUrl = 'https://unpkg.com/three-globe@2.35.0/example/img/earth-blue-marble.jpg';
    this.textureLoader.load(earthUrl, (tex) => {
      this.applyTextureQuality(tex);
      tex.needsUpdate = true;
      // Only apply if no forecast texture has been set yet
      if (!this.globeMaterial.map || !this.globeMaterial.userData?.['hasForecast']) {
        if (this.globeMaterial.map) this.globeMaterial.map.dispose();
        this.globeMaterial.map = tex;
        this.globeMaterial.needsUpdate = true;
      }
    });
  }

  /** Update the globe texture from a base64 equirectangular PNG */
  private updateGlobeTexture(base64Png: string): void {
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      this.applyTextureQuality(tex);
      tex.needsUpdate = true;

      // Dispose old texture
      if (this.globeMaterial.map) {
        this.globeMaterial.map.dispose();
      }
      this.globeMaterial.map = tex;
      this.globeMaterial.userData = { hasForecast: true };
      this.globeMaterial.needsUpdate = true;
    };
    img.src = 'data:image/png;base64,' + base64Png;
  }

  // ==========================================
  //  CONFIG
  // ==========================================

  loadConfig(): void {
    const saved = localStorage.getItem('nvidia-fourcastnet-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.apiKey = config.apiKey || '';
    }
  }

  saveConfig(): void {
    localStorage.setItem('nvidia-fourcastnet-config', JSON.stringify({
      apiKey: this.apiKey,
    }));
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  // ==========================================
  //  DEFAULT DATE
  // ==========================================

  setDefaultDate(): void {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    this.initialDate = now.toISOString().slice(0, 16);
  }

  // ==========================================
  //  MODEL INFO
  // ==========================================

  async loadModelInfo(): Promise<void> {
    try {
      const info = await firstValueFrom(
        this.http.get<any>(`${environment.api.nvidiaFourcastnet}/api/v1/nvidia-fourcastnet/info`)
      );
      this.variableGroups = info.variable_groups || {};
      this.variableGroupKeys = Object.keys(this.variableGroups);
      this.presets = info.presets || [];
      this.allVariables = info.supported_variables || [];
      this.totalVariables = info.total_variables || 0;
    } catch {
      this.presets = [
        { id: 'surface', label: 'Meteo de surface', icon: 'wb_sunny', variables: ['t2m', 'u10m', 'v10m', 'msl', 'tcwv'] },
        { id: 'upper', label: 'Atmosphere haute', icon: 'cloud', variables: ['z500', 't500', 'u500', 'v500'] },
      ];
    }
  }

  // ==========================================
  //  VARIABLE SELECTION
  // ==========================================

  toggleVariable(varId: string): void {
    const idx = this.selectedVariables.indexOf(varId);
    if (idx >= 0) {
      this.selectedVariables.splice(idx, 1);
    } else {
      this.selectedVariables.push(varId);
    }
  }

  isVariableSelected(varId: string): boolean {
    return this.selectedVariables.includes(varId);
  }

  applyPreset(preset: Preset): void {
    this.selectedVariables = [...preset.variables];
  }

  selectGroup(groupKey: string): void {
    const group = this.variableGroups[groupKey];
    if (group) {
      this.selectedVariables = group.variables.map(v => v.id);
    }
  }

  clearSelection(): void {
    this.selectedVariables = [];
  }

  // ==========================================
  //  QUICK DATES
  // ==========================================

  setQuickDate(offset: number): void {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    d.setUTCHours(0, 0, 0, 0);
    this.initialDate = d.toISOString().slice(0, 16);
  }

  // ==========================================
  //  INFERENCE
  // ==========================================

  async runInference(): Promise<void> {
    if (!this.initialDate || this.isProcessing) return;

    if (!this.apiKey) {
      this.errorMessage = this.translate.instant('nvidia_fourcastnet.errors.api_key_missing');
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.currentResult = null;
    this.processingStage = this.translate.instant('nvidia_fourcastnet.stages.sending');
    this.cdr.detectChanges();

    try {
      this.processingStage = this.translate.instant('nvidia_fourcastnet.stages.forecasting');
      this.cdr.detectChanges();

      const payload: any = {
        date: new Date(this.initialDate).toISOString(),
        simulation_length: this.simulationLength,
      };
      if (this.selectedVariables.length > 0) {
        payload.selected_variables = this.selectedVariables;
      }

      const result = await firstValueFrom(
        this.http.post<InferenceResult>(
          `${environment.api.nvidiaFourcastnet}/api/v1/nvidia-fourcastnet/inference`,
          payload,
          { headers: { 'X-Api-Key': this.apiKey } }
        ).pipe(timeout(600000))
      );

      this.currentResult = result;

      if (result.success) {
        this.processingStage = this.translate.instant('nvidia_fourcastnet.stages.complete');
        this.currentStepIndex = 0;
        this.currentVariableIndex = 0;

        // Initialize 3D globe after result arrives
        this.cdr.detectChanges();
        setTimeout(() => {
          this.initGlobe();
          this.applyCurrentTexture();
        }, 100);

        this.history.unshift({
          id: Date.now().toString(),
          timestamp: new Date(),
          date: this.initialDate,
          simulationLength: this.simulationLength,
          variables: this.selectedVariables.length > 0 ? [...this.selectedVariables] : ['default'],
          result: result,
        });
      } else {
        this.errorMessage = result.error || 'Erreur inconnue';
      }
    } catch (error: any) {
      const errMsg = error.status === 0
        ? this.translate.instant('nvidia_fourcastnet.errors.backend_unreachable')
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

  get currentStep(): ForecastStep | null {
    if (!this.currentResult?.forecasts?.length) return null;
    return this.currentResult.forecasts[this.currentStepIndex] || null;
  }

  get currentPreview(): VariablePreview | null {
    const step = this.currentStep;
    if (!step?.variables?.length) return null;
    return step.variables[this.currentVariableIndex] || step.variables[0];
  }

  get maxStepIndex(): number {
    return Math.max(0, (this.currentResult?.forecasts?.length || 1) - 1);
  }

  onStepChange(value: number): void {
    this.currentStepIndex = value;
    this.applyCurrentTexture();
  }

  selectVariable(idx: number): void {
    this.currentVariableIndex = idx;
    this.applyCurrentTexture();
  }

  private applyCurrentTexture(): void {
    const preview = this.currentPreview;
    if (preview?.image && this.globeReady) {
      this.updateGlobeTexture(preview.image);
    }
  }

  // ==========================================
  //  HELPERS
  // ==========================================

  get canRun(): boolean {
    return this.initialDate.length > 0 && !this.isProcessing && this.apiKey.length > 0;
  }

  get forecastHorizon(): string {
    const hours = this.simulationLength * 6;
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const rem = hours % 24;
      return rem > 0 ? `${days}j ${rem}h` : `${days}j`;
    }
    return `${hours}h`;
  }

  clearHistory(): void {
    this.history = [];
  }

  formatDate(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleString();
    } catch {
      return isoDate;
    }
  }
}
