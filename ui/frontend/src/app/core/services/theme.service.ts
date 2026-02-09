import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'colorblind';

export interface AccessibilitySettings {
  zoomLevel: number; // 1 = normal, 1.25 = 125%, 1.5 = 150%, etc.
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  private readonly ACCESSIBILITY_KEY = 'app-accessibility';

  // Signal pour le theme actuel
  currentTheme = signal<Theme>(this.getInitialTheme());

  // Signal pour les parametres d'accessibilite
  accessibilitySettings = signal<AccessibilitySettings>(this.getInitialAccessibility());

  constructor() {
    // Effet pour appliquer le theme au DOM
    effect(() => {
      this.applyTheme(this.currentTheme());
    });

    // Effet pour appliquer les parametres d'accessibilite
    effect(() => {
      this.applyAccessibility(this.accessibilitySettings());
    });
  }

  private getInitialTheme(): Theme {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    if (savedTheme && ['light', 'dark', 'colorblind'].includes(savedTheme)) {
      return savedTheme;
    }

    // Detecter la preference systeme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  private getInitialAccessibility(): AccessibilitySettings {
    const saved = localStorage.getItem(this.ACCESSIBILITY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Ignore parse errors
      }
    }

    // Detecter les preferences systeme
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      zoomLevel: 1,
      highContrast: false,
      largeText: false,
      reducedMotion: prefersReducedMotion
    };
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;
    body.classList.remove('light-theme', 'dark-theme', 'colorblind-theme');
    body.classList.add(`${theme}-theme`);
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private applyAccessibility(settings: AccessibilitySettings): void {
    const html = document.documentElement;
    const body = document.body;

    // Appliquer le zoom
    html.style.fontSize = `${settings.zoomLevel * 100}%`;

    // Appliquer le contraste eleve
    body.classList.toggle('high-contrast', settings.highContrast);

    // Appliquer les grands textes
    body.classList.toggle('large-text', settings.largeText);

    // Appliquer la reduction des animations
    body.classList.toggle('reduced-motion', settings.reducedMotion);

    // Sauvegarder
    localStorage.setItem(this.ACCESSIBILITY_KEY, JSON.stringify(settings));
  }

  toggleTheme(): void {
    const themes: Theme[] = ['light', 'dark', 'colorblind'];
    const currentIndex = themes.indexOf(this.currentTheme());
    const nextIndex = (currentIndex + 1) % themes.length;
    this.currentTheme.set(themes[nextIndex]);
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  // Methodes pour l'accessibilite
  setZoomLevel(level: number): void {
    const settings = this.accessibilitySettings();
    this.accessibilitySettings.set({
      ...settings,
      zoomLevel: Math.max(0.75, Math.min(2, level))
    });
  }

  increaseZoom(): void {
    const current = this.accessibilitySettings().zoomLevel;
    this.setZoomLevel(current + 0.25);
  }

  decreaseZoom(): void {
    const current = this.accessibilitySettings().zoomLevel;
    this.setZoomLevel(current - 0.25);
  }

  resetZoom(): void {
    this.setZoomLevel(1);
  }

  toggleHighContrast(): void {
    const settings = this.accessibilitySettings();
    this.accessibilitySettings.set({
      ...settings,
      highContrast: !settings.highContrast
    });
  }

  toggleLargeText(): void {
    const settings = this.accessibilitySettings();
    this.accessibilitySettings.set({
      ...settings,
      largeText: !settings.largeText
    });
  }

  toggleReducedMotion(): void {
    const settings = this.accessibilitySettings();
    this.accessibilitySettings.set({
      ...settings,
      reducedMotion: !settings.reducedMotion
    });
  }

  resetAccessibility(): void {
    this.accessibilitySettings.set({
      zoomLevel: 1,
      highContrast: false,
      largeText: false,
      reducedMotion: false
    });
  }

  // Obtenir l'icone du theme actuel
  getThemeIcon(): string {
    switch (this.currentTheme()) {
      case 'dark':
        return 'dark_mode';
      case 'colorblind':
        return 'visibility';
      default:
        return 'light_mode';
    }
  }

  // Obtenir le nom du theme actuel
  getThemeName(): string {
    switch (this.currentTheme()) {
      case 'dark':
        return 'theme.dark';
      case 'colorblind':
        return 'theme.colorblind';
      default:
        return 'theme.light';
    }
  }
}
