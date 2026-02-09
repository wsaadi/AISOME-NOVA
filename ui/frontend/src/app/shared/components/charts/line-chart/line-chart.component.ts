import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartService, ChartData, ChartOptions } from '../../../services/chart.service';

/**
 * Composant de graphique en ligne
 *
 * @example
 * ```html
 * <app-line-chart
 *   [data]="chartData"
 *   [options]="chartOptions"
 *   [height]="400"
 *   [showLegend]="true">
 * </app-line-chart>
 * ```
 *
 * @example
 * ```typescript
 * chartData: ChartData = {
 *   labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
 *   datasets: [{
 *     label: 'Ventes 2024',
 *     data: [65, 59, 80, 81, 56, 55],
 *     borderColor: '#3b82f6',
 *     backgroundColor: 'rgba(59, 130, 246, 0.1)',
 *     tension: 0.4
 *   }]
 * };
 * ```
 */
@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() data!: ChartData;
  @Input() options?: ChartOptions;
  @Input() height: number = 400;
  @Input() showLegend: boolean = true;
  @Input() animate: boolean = true;

  private chart: any;
  private chartInstance: any;

  constructor(private chartService: ChartService) {}

  ngOnInit(): void {
    if (!this.options) {
      this.options = this.chartService.getDefaultLineChartOptions();
    }

    // Appliquer les préférences d'affichage
    if (this.options.plugins) {
      if (this.options.plugins.legend) {
        this.options.plugins.legend.display = this.showLegend;
      }
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
    // Import dynamique de Chart.js pour réduire la taille du bundle initial
    try {
      const Chart = (await import('chart.js/auto')).default;

      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      // Préparer les datasets avec les couleurs par défaut si nécessaire
      const processedData = { ...this.data };
      processedData.datasets = processedData.datasets.map((dataset, index) => {
        if (!dataset.borderColor) {
          const colors = this.chartService.generateColors(processedData.datasets.length);
          dataset.borderColor = colors[index];
        }
        if (!dataset.backgroundColor) {
          const colors = this.chartService.generateColorsWithAlpha(processedData.datasets.length, 0.1);
          dataset.backgroundColor = colors[index];
        }
        if (dataset.tension === undefined) {
          dataset.tension = 0.4; // Courbes lisses par défaut
        }
        return dataset;
      });

      this.chartInstance = new Chart(ctx, {
        type: 'line',
        data: processedData,
        options: {
          ...this.options,
          animation: this.animate ? {} : false
        } as any
      });
    } catch (error) {
      console.error('Erreur lors du chargement de Chart.js:', error);
      // Fallback: afficher un message d'erreur
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
