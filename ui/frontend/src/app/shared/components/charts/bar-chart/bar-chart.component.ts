import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartService, ChartData, ChartOptions } from '../../../services/chart.service';

/**
 * Composant de graphique en barres
 *
 * @example
 * ```html
 * <app-bar-chart
 *   [data]="chartData"
 *   [options]="chartOptions"
 *   [height]="400"
 *   [orientation]="'vertical'"
 *   [showLegend]="true">
 * </app-bar-chart>
 * ```
 *
 * @example
 * ```typescript
 * chartData: ChartData = {
 *   labels: ['Produit A', 'Produit B', 'Produit C', 'Produit D'],
 *   datasets: [{
 *     label: 'Ventes Q1',
 *     data: [12, 19, 3, 5],
 *     backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
 *   }, {
 *     label: 'Ventes Q2',
 *     data: [15, 12, 8, 7],
 *     backgroundColor: ['#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
 *   }]
 * };
 * ```
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() data!: ChartData;
  @Input() options?: ChartOptions;
  @Input() height: number = 400;
  @Input() orientation: 'vertical' | 'horizontal' = 'vertical';
  @Input() showLegend: boolean = true;
  @Input() animate: boolean = true;
  @Input() stacked: boolean = false;

  private chartInstance: any;

  constructor(private chartService: ChartService) {}

  ngOnInit(): void {
    if (!this.options) {
      this.options = this.chartService.getDefaultBarChartOptions();
    }

    // Appliquer les préférences d'affichage
    if (this.options.plugins) {
      if (this.options.plugins.legend) {
        this.options.plugins.legend.display = this.showLegend;
      }
    }

    // Configurer le mode empilé si nécessaire
    if (this.stacked && this.options.scales) {
      this.options.scales.x = { ...this.options.scales.x, stacked: true };
      this.options.scales.y = { ...this.options.scales.y, stacked: true };
    }
  }

  ngAfterViewInit(): void {
    this.renderChart();
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  private async renderChart(): Promise<void> {
    try {
      const Chart = (await import('chart.js/auto')).default;

      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      // Préparer les datasets avec les couleurs par défaut si nécessaire
      const processedData = { ...this.data };
      processedData.datasets = processedData.datasets.map((dataset, index) => {
        if (!dataset.backgroundColor) {
          const colors = this.chartService.generateColors(
            Array.isArray(dataset.data) ? dataset.data.length : 1
          );
          dataset.backgroundColor = colors;
        }
        if (!dataset.borderColor) {
          dataset.borderColor = 'transparent';
        }
        if (dataset.borderWidth === undefined) {
          dataset.borderWidth = 0;
        }
        return dataset;
      });

      const chartType = this.orientation === 'horizontal' ? 'bar' : 'bar';
      const indexAxis = this.orientation === 'horizontal' ? 'y' : 'x';

      this.chartInstance = new Chart(ctx, {
        type: chartType,
        data: processedData,
        options: {
          ...this.options,
          indexAxis: indexAxis as any,
          animation: this.animate ? {} : false
        } as any
      });
    } catch (error) {
      console.error('Erreur lors du chargement de Chart.js:', error);
    }
  }

  /**
   * Met à jour les données du graphique
   */
  updateChart(newData: ChartData): void {
    if (this.chartInstance) {
      this.chartInstance.data = newData;
      this.chartInstance.update();
    }
  }

  /**
   * Rafraîchit le graphique
   */
  refresh(): void {
    if (this.chartInstance) {
      this.chartInstance.update();
    }
  }
}
