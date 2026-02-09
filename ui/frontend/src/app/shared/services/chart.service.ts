import { Injectable } from '@angular/core';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display?: boolean;
      text?: string;
    };
    tooltip?: {
      enabled?: boolean;
    };
  };
  scales?: any;
}

/**
 * Service pour la gestion des graphiques
 * Fournit des utilitaires et configurations pour Chart.js
 */
@Injectable({
  providedIn: 'root'
})
export class ChartService {
  // Palette de couleurs par défaut
  private defaultColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];

  constructor() {}

  /**
   * Génère des couleurs pour les datasets
   */
  generateColors(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.defaultColors[i % this.defaultColors.length]);
    }
    return colors;
  }

  /**
   * Génère des couleurs avec transparence
   */
  generateColorsWithAlpha(count: number, alpha: number = 0.5): string[] {
    return this.generateColors(count).map(color => {
      const rgb = this.hexToRgb(color);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    });
  }

  /**
   * Convertit hex en RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Options par défaut pour les graphiques en ligne
   */
  getDefaultLineChartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };
  }

  /**
   * Options par défaut pour les graphiques en barres
   */
  getDefaultBarChartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };
  }

  /**
   * Options par défaut pour les graphiques circulaires (Pie/Donut)
   */
  getDefaultPieChartOptions(): ChartOptions {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right'
        },
        tooltip: {
          enabled: true
        }
      }
    };
  }
}
