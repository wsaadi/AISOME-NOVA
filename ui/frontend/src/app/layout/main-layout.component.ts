import { Component, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService, Theme } from '../core/services/theme.service';
import { RoleService } from '../core/services/role.service';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  roles?: string[];
  permissions?: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatTooltipModule,
    MatSliderModule,
    MatDividerModule,
    TranslateModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit {
  sidenavOpened = signal(true);
  currentLang = signal(localStorage.getItem('app-lang') || 'fr');
  username = signal('');

  menuItems: MenuItem[] = [
    { icon: 'home', label: 'menu.home', route: '/home' },
    { icon: 'dashboard', label: 'menu.dashboard', route: '/dashboard' },
    { icon: 'apps', label: 'menu.catalog', route: '/agents-catalog' },
    { icon: 'auto_awesome', label: 'menu.create_agent', route: '/create-agent' },
    { icon: 'inventory_2', label: 'menu.catalog_management', route: '/catalog-management', permissions: ['agent:manage-own'] },
    { icon: 'people', label: 'menu.user_management', route: '/user-management', permissions: ['admin:users'] },
    { icon: 'psychology', label: 'menu.llm_settings', route: '/llm-settings', permissions: ['admin:llm-settings'] },
    { icon: 'data_usage', label: 'menu.token_consumption', route: '/token-consumption', permissions: ['admin:token-consumption'] },
    { icon: 'security', label: 'menu.moderation', route: '/moderation-settings', permissions: ['admin:moderation'] },
    { icon: 'verified', label: 'menu.iso9001_audit', route: '/iso9001-audit' },
    { icon: 'smart_toy', label: 'menu.nvidia_multimodal', route: '/nvidia-multimodal' },
    { icon: 'biotech', label: 'menu.nvidia_vista3d', route: '/nvidia-vista3d' },
    { icon: 'cloud', label: 'menu.nvidia_fourcastnet', route: '/nvidia-fourcastnet' },
    { icon: 'science', label: 'menu.nvidia_openfold3', route: '/nvidia-openfold3' },
    { icon: 'target', label: 'menu.nvidia_grounding_dino', route: '/nvidia-grounding-dino' },
    { icon: 'visibility', label: 'menu.webgpu_local_agent', route: '/webgpu-local-agent' },
    { icon: 'settings', label: 'menu.settings', route: '/settings', permissions: ['admin:settings'] }
  ];

  // Computed pour filtrer les items du menu selon les permissions et roles
  filteredMenuItems = computed(() => {
    return this.menuItems.filter(item => {
      // Check permissions first
      if (item.permissions && item.permissions.length > 0) {
        if (!this.roleService.hasAnyPermission(item.permissions)) {
          return false;
        }
      }
      // Then check roles if specified
      if (item.roles && item.roles.length > 0) {
        if (!this.roleService.hasAnyRole(item.roles)) {
          return false;
        }
      }
      return true;
    });
  });

  currentTheme = computed(() => this.themeService.currentTheme());
  accessibilitySettings = computed(() => this.themeService.accessibilitySettings());

  themeIcon = computed(() => {
    switch (this.currentTheme()) {
      case 'dark':
        return 'dark_mode';
      case 'colorblind':
        return 'visibility';
      default:
        return 'light_mode';
    }
  });

  zoomPercent = computed(() => Math.round(this.accessibilitySettings().zoomLevel * 100));

  constructor(
    public themeService: ThemeService,
    public roleService: RoleService,
    public translate: TranslateService
  ) {
    // Initialiser la langue depuis le localStorage
    const savedLang = localStorage.getItem('app-lang') || 'fr';
    this.translate.use(savedLang);
    this.currentLang.set(savedLang);
  }

  async ngOnInit(): Promise<void> {
    // Charger le nom d'utilisateur
    await this.loadUsername();
  }

  private async loadUsername(): Promise<void> {
    try {
      const profile = await this.roleService.getUserProfile();
      if (profile) {
        // Afficher username ou email comme identifiant
        this.username.set(profile.username || profile.email || '');
      }
    } catch (error) {
      console.error('Error loading username:', error);
    }
  }

  toggleSidenav(): void {
    this.sidenavOpened.update(value => !value);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('app-lang', lang);
  }

  logout(): void {
    this.roleService.logout();
  }

  // Methodes d'accessibilite
  increaseZoom(): void {
    this.themeService.increaseZoom();
  }

  decreaseZoom(): void {
    this.themeService.decreaseZoom();
  }

  resetZoom(): void {
    this.themeService.resetZoom();
  }

  toggleHighContrast(): void {
    this.themeService.toggleHighContrast();
  }

  toggleLargeText(): void {
    this.themeService.toggleLargeText();
  }

  toggleReducedMotion(): void {
    this.themeService.toggleReducedMotion();
  }

  resetAccessibility(): void {
    this.themeService.resetAccessibility();
  }
}
