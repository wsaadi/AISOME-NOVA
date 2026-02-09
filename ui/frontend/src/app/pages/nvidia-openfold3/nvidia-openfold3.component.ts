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
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, timeout } from 'rxjs';

import * as THREE from 'three';

import { environment } from '../../../environments/environment';

// ==========================================
//  INTERFACES
// ==========================================

interface AtomInfo {
  index: number;
  residue: string;
  one_letter: string;
  chain: string;
  x: number;
  y: number;
  z: number;
  b_factor: number;
  name: string;
  abbr: string;
  type: string;
  color: number[];
}

interface SampleSequence {
  id: string;
  name: string;
  description: string;
  sequence: string;
  length: number;
}

interface InferenceResult {
  success: boolean;
  message?: string;
  pdb_data?: string;
  atoms?: AtomInfo[];
  sequence?: string;
  num_residues?: number;
  error?: string;
  demo_mode?: boolean;
}

interface HistoryEntry {
  id: string;
  timestamp: Date;
  sequence: string;
  numResidues: number;
  result: InferenceResult;
}

@Component({
  selector: 'app-nvidia-openfold3',
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
    MatTabsModule,
    TranslateModule,
  ],
  templateUrl: './nvidia-openfold3.component.html',
  styleUrls: ['./nvidia-openfold3.component.scss'],
})
export class NvidiaOpenfold3Component implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('proteinCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Config
  apiKey: string = '';
  showSettings: boolean = false;

  // Input
  sequenceInput: string = '';
  sampleSequences: SampleSequence[] = [];

  // State
  isProcessing: boolean = false;
  processingStage: string = '';
  errorMessage: string = '';
  currentResult: InferenceResult | null = null;
  history: HistoryEntry[] = [];
  selectedAtom: AtomInfo | null = null;

  // Three.js
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private backboneGroup!: THREE.Group;
  private atomMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animFrameId: number = 0;
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private velocity = { x: 0, y: 0 };
  private autoRotateSpeed = 0.003;
  viewerReady = false;

  // Color modes
  colorMode: 'residue' | 'chain' | 'bfactor' | 'secondary' = 'residue';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadModelInfo();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.disposeViewer();
  }

  // ==========================================
  //  THREE.JS 3D PROTEIN VIEWER
  // ==========================================

  private initViewer(): void {
    if (!this.canvasRef?.nativeElement) return;
    // Dispose previous renderer since canvas is recreated by @if block
    if (this.renderer) {
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.renderer.dispose();
      this.renderer = null as any;
    }

    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement!;
    const w = container.clientWidth || 800;
    const h = Math.max(450, Math.min(w * 0.75, 650));

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();

    // Fog for depth
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 80);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(30, 30, 30);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.4);
    fillLight.position.set(-20, -10, -20);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff6644, 0.2);
    rimLight.position.set(0, -20, 10);
    this.scene.add(rimLight);

    // Backbone group
    this.backboneGroup = new THREE.Group();
    this.scene.add(this.backboneGroup);

    // Events
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('click', this.onClick);

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onMouseUp);

    this.viewerReady = true;

    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildProteinMesh(atoms: AtomInfo[]): void {
    // Clear previous
    while (this.backboneGroup.children.length > 0) {
      const child = this.backboneGroup.children[0];
      this.backboneGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }
    }
    this.atomMeshes = [];

    if (!atoms || atoms.length === 0) return;

    // Center the molecule
    let cx = 0, cy = 0, cz = 0;
    for (const a of atoms) { cx += a.x; cy += a.y; cz += a.z; }
    cx /= atoms.length; cy /= atoms.length; cz /= atoms.length;

    // Atom spheres (CA atoms)
    const sphereGeo = new THREE.SphereGeometry(0.6, 16, 12);

    for (const atom of atoms) {
      const color = new THREE.Color(
        atom.color[0] / 255,
        atom.color[1] / 255,
        atom.color[2] / 255
      );

      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: 80,
        specular: 0x444444,
        emissive: color.clone().multiplyScalar(0.1),
      });

      const mesh = new THREE.Mesh(sphereGeo, material);
      mesh.position.set(atom.x - cx, atom.y - cy, atom.z - cz);
      mesh.userData = { atom };
      this.backboneGroup.add(mesh);
      this.atomMeshes.push(mesh);
    }

    // Backbone bonds (tubes between consecutive CA atoms)
    for (let i = 0; i < atoms.length - 1; i++) {
      const a1 = atoms[i];
      const a2 = atoms[i + 1];
      const start = new THREE.Vector3(a1.x - cx, a1.y - cy, a1.z - cz);
      const end = new THREE.Vector3(a2.x - cx, a2.y - cy, a2.z - cz);

      const dist = start.distanceTo(end);
      if (dist > 10) continue; // skip chain breaks

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(end, start);

      const tubeGeo = new THREE.CylinderGeometry(0.2, 0.2, dist, 8, 1);
      const tubeMat = new THREE.MeshPhongMaterial({
        color: 0x667788,
        shininess: 30,
        transparent: true,
        opacity: 0.7,
      });

      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      tube.position.copy(mid);

      // Orient cylinder along the bond direction
      const axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir.clone().normalize());
      tube.quaternion.copy(quaternion);

      this.backboneGroup.add(tube);
    }

    // Adjust camera distance based on molecule size
    let maxDist = 0;
    for (const atom of atoms) {
      const d = Math.sqrt(
        (atom.x - cx) ** 2 + (atom.y - cy) ** 2 + (atom.z - cz) ** 2
      );
      if (d > maxDist) maxDist = d;
    }
    this.camera.position.z = maxDist * 2.5 + 20;
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    if (this.backboneGroup) {
      if (this.isDragging) {
        // no auto-rotation
      } else {
        this.velocity.x *= 0.95;
        this.velocity.y *= 0.95;

        if (Math.abs(this.velocity.y) < 0.0005) {
          this.velocity.y = this.autoRotateSpeed;
        }

        this.backboneGroup.rotation.y += this.velocity.y;
        this.backboneGroup.rotation.x += this.velocity.x;
        this.backboneGroup.rotation.x = Math.max(-1.5, Math.min(1.5, this.backboneGroup.rotation.x));
      }
    }

    this.renderer?.render(this.scene, this.camera);
  };

  private disposeViewer(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.canvasRef?.nativeElement) {
      const c = this.canvasRef.nativeElement;
      c.removeEventListener('mousedown', this.onMouseDown);
      c.removeEventListener('mousemove', this.onMouseMove);
      c.removeEventListener('mouseup', this.onMouseUp);
      c.removeEventListener('mouseleave', this.onMouseUp);
      c.removeEventListener('wheel', this.onWheel);
      c.removeEventListener('click', this.onClick);
      c.removeEventListener('touchstart', this.onTouchStart);
      c.removeEventListener('touchmove', this.onTouchMove);
      c.removeEventListener('touchend', this.onMouseUp);
    }
    this.renderer?.dispose();
  }

  // Mouse handlers
  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.backboneGroup) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.velocity.y = dx * 0.005;
    this.velocity.x = dy * 0.005;
    this.backboneGroup.rotation.y += this.velocity.y;
    this.backboneGroup.rotation.x += this.velocity.x;
    this.backboneGroup.rotation.x = Math.max(-1.5, Math.min(1.5, this.backboneGroup.rotation.x));
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const z = this.camera.position.z + e.deltaY * 0.1;
    this.camera.position.z = Math.max(10, Math.min(300, z));
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
    if (!this.isDragging || !this.backboneGroup || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.previousMouse.x;
    const dy = e.touches[0].clientY - this.previousMouse.y;
    this.velocity.y = dx * 0.005;
    this.velocity.x = dy * 0.005;
    this.backboneGroup.rotation.y += this.velocity.y;
    this.backboneGroup.rotation.x += this.velocity.x;
    this.backboneGroup.rotation.x = Math.max(-1.5, Math.min(1.5, this.backboneGroup.rotation.x));
    this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  private onClick = (e: MouseEvent): void => {
    if (!this.canvasRef?.nativeElement || !this.camera) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.atomMeshes);

    if (intersects.length > 0) {
      const atom = intersects[0].object.userData['atom'] as AtomInfo;
      this.ngZone.run(() => {
        this.selectedAtom = atom;
        this.highlightAtom(intersects[0].object as THREE.Mesh);
        this.cdr.detectChanges();
      });
    } else {
      this.ngZone.run(() => {
        this.selectedAtom = null;
        this.resetHighlights();
        this.cdr.detectChanges();
      });
    }
  };

  private highlightAtom(mesh: THREE.Mesh): void {
    // Reset all
    this.resetHighlights();
    // Highlight selected
    const mat = mesh.material as THREE.MeshPhongMaterial;
    mat.emissive.set(0xffffff);
    mat.emissiveIntensity = 0.5;
    mesh.scale.set(1.8, 1.8, 1.8);
  }

  private resetHighlights(): void {
    for (const m of this.atomMeshes) {
      const mat = m.material as THREE.MeshPhongMaterial;
      const atom = m.userData['atom'] as AtomInfo;
      mat.emissive.set(
        atom.color[0] / 255 * 0.1,
        atom.color[1] / 255 * 0.1,
        atom.color[2] / 255 * 0.1
      );
      mat.emissiveIntensity = 1.0;
      m.scale.set(1, 1, 1);
    }
  }

  // ==========================================
  //  CONFIG
  // ==========================================

  loadConfig(): void {
    const saved = localStorage.getItem('nvidia-openfold3-config');
    if (saved) {
      const config = JSON.parse(saved);
      this.apiKey = config.apiKey || '';
    }
  }

  saveConfig(): void {
    localStorage.setItem('nvidia-openfold3-config', JSON.stringify({
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
        this.http.get<any>(`${environment.api.nvidiaOpenfold3}/api/v1/nvidia-openfold3/info`)
      );
      this.sampleSequences = info.sample_sequences || [];
    } catch {
      this.sampleSequences = [
        { id: 'hemoglobin_alpha', name: 'Hemoglobine Alpha', description: 'Chaine alpha', sequence: 'MVLSPADKTNVKAAWGKVGAHAGEYGAEALERMFLSFPTTKTYFPHFDLSHGSAQVKGHGKKVADALTNAVAHVDDMPNALSALSDLHAHKLRVDPVNFKLLSHCLLVTLAAHLPAEFTPAVHASLDKFLASVSTVLTSKYR', length: 141 },
        { id: 'insulin', name: 'Insuline', description: 'Hormone peptidique', sequence: 'FVNQHLCGSHLVEALYLVCGERGFFYTPKT', length: 30 },
        { id: 'ubiquitin', name: 'Ubiquitine', description: 'Signalisation cellulaire', sequence: 'MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG', length: 76 },
      ];
    }
  }

  // ==========================================
  //  SAMPLE SEQUENCES
  // ==========================================

  loadSample(sample: SampleSequence): void {
    this.sequenceInput = sample.sequence;
  }

  // ==========================================
  //  INFERENCE
  // ==========================================

  async runInference(): Promise<void> {
    if (!this.sequenceInput.trim() || this.isProcessing) return;

    if (!this.apiKey) {
      this.errorMessage = this.translate.instant('nvidia_openfold3.errors.api_key_missing');
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.currentResult = null;
    this.selectedAtom = null;
    this.processingStage = this.translate.instant('nvidia_openfold3.stages.sending');
    this.cdr.detectChanges();

    try {
      this.processingStage = this.translate.instant('nvidia_openfold3.stages.predicting');
      this.cdr.detectChanges();

      const payload = {
        sequence: this.sequenceInput.trim(),
        algorithm: 'openfold3',
      };

      const result = await firstValueFrom(
        this.http.post<InferenceResult>(
          `${environment.api.nvidiaOpenfold3}/api/v1/nvidia-openfold3/inference`,
          payload,
          { headers: { 'X-Api-Key': this.apiKey } }
        ).pipe(timeout(600000))
      );

      this.currentResult = result;

      if (result.success && result.atoms) {
        this.processingStage = this.translate.instant('nvidia_openfold3.stages.complete');
        this.cdr.detectChanges();

        // Wait for Angular to render the @if block containing the canvas
        this.cdr.detectChanges();
        setTimeout(() => {
          this.initViewer();
          if (this.renderer) {
            this.buildProteinMesh(result.atoms!);
          } else {
            // Retry if canvas not yet in DOM
            setTimeout(() => {
              this.initViewer();
              this.buildProteinMesh(result.atoms!);
            }, 300);
          }
        }, 50);

        this.history.unshift({
          id: Date.now().toString(),
          timestamp: new Date(),
          sequence: this.sequenceInput.trim().substring(0, 30) + '...',
          numResidues: result.num_residues || 0,
          result: result,
        });
      } else {
        this.errorMessage = result.error || 'Erreur inconnue';
      }
    } catch (error: any) {
      const errMsg = error.status === 0
        ? this.translate.instant('nvidia_openfold3.errors.backend_unreachable')
        : (error.error?.detail || error.message || 'Erreur inconnue');
      this.errorMessage = errMsg;
    } finally {
      this.isProcessing = false;
      this.processingStage = '';
      this.cdr.detectChanges();
    }
  }

  // ==========================================
  //  HELPERS
  // ==========================================

  get canRun(): boolean {
    return this.sequenceInput.trim().length >= 10 && !this.isProcessing && this.apiKey.length > 0;
  }

  get sequenceLength(): number {
    const seq = this.sequenceInput.trim().toUpperCase();
    if (seq.startsWith('>')) {
      const lines = seq.split('\n');
      return lines.filter(l => !l.startsWith('>')).join('').length;
    }
    return seq.length;
  }

  getResidueTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'nonpolar': 'Non-polaire (hydrophobe)',
      'polar': 'Polaire',
      'positive': 'Charge positive',
      'negative': 'Charge negative',
      'special': 'Special',
    };
    return labels[type] || type;
  }

  getResidueTypeColor(type: string): string {
    const colors: Record<string, string> = {
      'nonpolar': '#4caf50',
      'polar': '#00bcd4',
      'positive': '#2196f3',
      'negative': '#f44336',
      'special': '#ff9800',
    };
    return colors[type] || '#9e9e9e';
  }

  clearHistory(): void {
    this.history = [];
  }
}
