import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartService, ChartData, ChartOptions } from '../../../services/chart.service';

/**
 * Composant de graphique en donut (anneau)
 *
 * @example
 * ```html
 * <app-donut-chart
 *   [data]="chartData"
 *   [options]="chartOptions"
 *   [height]="400"
 *   [showLegend]="true"
 *   [legendPosition]="'right'"
 *   [cutout]="70"
 *   [centerText]="'Total'">
 * </app-donut-chart>
 * ```
 *
 * @example
 * ```typescript
 * chartData: ChartData = {
 *   labels: ['Complété', 'En cours', 'À faire', 'Bloqué'],
 *   datasets: [{
 *     label: 'Statut des tâches',
 *     data: [45, 25, 20, 10],
 *     backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
 *   }]
 * };
 * ```
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './donut-chart.component.html',
  styleUrls: ['./donut-chart.component.scss']
})
export class DonutChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() data!: ChartData;
  @Input() options?: ChartOptions;
  @Input() height: number = 400;
  @Input() showLegend: boolean = true;
  @Input() legendPosition: 'top' | 'bottom' | 'left' | 'right' = 'right';
  @Input() animate: boolean = true;
  @Input() showPercentage: boolean = true;
  @Input() cutout: number = 70; // Pourcentage du trou au centre (0-100)
  @Input() centerText: string = ''; // Texte à afficher au centre

  private chartInstance: any;

  constructor(private chartService: ChartService) {}

  ngOnInit(): void {
    if (!this.options) {
      this.options = this.chartService.getDefaultPieChartOptions();
    }

    // Appliquer les préférences d'affichage
    if (this.options.plugins) {
      if (this.options.plugins.legend) {
        this.options.plugins.legend.display = this.showLegend;
        this.options.plugins.legend.position = this.legendPosition;
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
    try {
      const Chart = (await import('chart.js/auto')).default;

      const ctx = this.chartCanvas.nativeElement.getContext('2d');
      if (!ctx) return;

      // Préparer les datasets avec les couleurs par défaut si nécessaire
      const processedData = { ...this.data };
      processedData.datasets = processedData.datasets.map((dataset) => {
        if (!dataset.backgroundColor) {
          const colors = this.chartService.generateColors(
            Array.isArray(dataset.data) ? dataset.data.length : 1
          );
          dataset.backgroundColor = colors;
        }
        if (!dataset.borderColor) {
          dataset.borderColor = '#ffffff';
        }
        if (dataset.borderWidth === undefined) {
          dataset.borderWidth = 2;
        }
        return dataset;
      });

      // Options avec pourcentages
      const chartOptions = { ...this.options };
      if (this.showPercentage && chartOptions.plugins && chartOptions.plugins.tooltip) {
        chartOptions.plugins.tooltip = {
          ...chartOptions.plugins.tooltip,
          callbacks: {
            label: function(context: any) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        } as any;
      }

      // Plugin pour afficher le texte au centre
      const centerTextPlugin = this.centerText ? {
        id: 'centerText',
        beforeDraw: (chart: any) => {
          if (this.centerText) {
            const { width, height, ctx } = chart;
            ctx.restore();
            const fontSize = (height / 114).toFixed(2);
            ctx.font = `bold ${fontSize}em sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1f2937';

            const textX = Math.round((width - ctx.measureText(this.centerText).width) / 2);
            const textY = height / 2;

            ctx.fillText(this.centerText, textX, textY);
            ctx.save();
          }
        }
      } : undefined;

      this.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: processedData,
        options: {
          ...chartOptions,
          cutout: `${this.cutout}%`,
          animation: this.animate ? {} : false
        } as any,
        plugins: centerTextPlugin ? [centerTextPlugin] : []
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
   * Met à jour le texte au centre
   */
  updateCenterText(text: string): void {
    this.centerText = text;
    if (this.chartInstance) {
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
