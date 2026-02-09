import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';

import { PieChartComponent } from '../../shared/components/charts/pie-chart/pie-chart.component';
import { LineChartComponent } from '../../shared/components/charts/line-chart/line-chart.component';
import { DolibarrStatsService, StatsResponse, StatsData, AIRecommendations } from './dolibarr-stats.service';

@Component({
  selector: 'app-dolibarr-stats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatChipsModule,
    TranslateModule,
    PieChartComponent,
    LineChartComponent
  ],
  template: `
    <div class="dolibarr-stats-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>
            <mat-icon class="page-icon">analytics</mat-icon>
            Statistiques Dolibarr
          </h1>
          <p class="header-subtitle">Analyse des opportunités commerciales avec recommandations IA</p>
        </div>
      </div>

      <!-- Date Selection Card -->
      <mat-card class="date-selection-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>date_range</mat-icon>
            Sélection de la période
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="date-selector">
            <mat-form-field appearance="outline">
              <mat-label>Date de début</mat-label>
              <input matInput [matDatepicker]="startPicker" [(ngModel)]="startDate" placeholder="Début">
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Date de fin</mat-label>
              <input matInput [matDatepicker]="endPicker" [(ngModel)]="endDate" placeholder="Fin">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              (click)="loadStats()"
              [disabled]="loading() || !startDate || !endDate"
              class="load-button"
            >
              <mat-icon>search</mat-icon>
              Charger les statistiques
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Loading Spinner -->
      <div *ngIf="loading()" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Chargement des statistiques Dolibarr...</p>
      </div>

      <!-- Error Message -->
      <mat-card *ngIf="error()" class="error-card">
        <mat-icon color="warn">error</mat-icon>
        <div>
          <h3>Erreur</h3>
          <p>{{ error() }}</p>
        </div>
      </mat-card>

      <!-- Stats Content -->
      <div *ngIf="stats() && !loading()" class="stats-content">
        <!-- Summary Cards -->
        <div class="summary-cards">
          <mat-card class="summary-card">
            <div class="card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
              <mat-icon>receipt_long</mat-icon>
            </div>
            <div class="card-content">
              <h3>{{ stats()!.total_count }}</h3>
              <p>Opportunités</p>
            </div>
          </mat-card>

          <mat-card class="summary-card">
            <div class="card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
              <mat-icon>euro</mat-icon>
            </div>
            <div class="card-content">
              <h3>{{ formatCurrency(stats()!.total_amount_ht) }}</h3>
              <p>Montant HT</p>
            </div>
          </mat-card>

          <mat-card class="summary-card">
            <div class="card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
            <div class="card-content">
              <h3>{{ formatCurrency(stats()!.total_amount_ttc) }}</h3>
              <p>Montant TTC</p>
            </div>
          </mat-card>
        </div>

        <!-- Charts Section -->
        <div class="charts-section">
          <!-- Pie Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>pie_chart</mat-icon>
                Répartition par statut
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <app-pie-chart
                [data]="stats()!.status_pie_chart"
                [height]="350"
              ></app-pie-chart>
            </mat-card-content>
          </mat-card>

          <!-- Line Chart -->
          <mat-card class="chart-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>show_chart</mat-icon>
                Évolution des montants
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <app-line-chart
                [data]="stats()!.amount_line_chart"
                [height]="350"
              ></app-line-chart>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- AI Recommendations -->
        <mat-card *ngIf="aiRecommendations()" class="ai-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>psychology</mat-icon>
              Recommandations IA
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <!-- Summary -->
            <div class="ai-section">
              <h3>
                <mat-icon>summarize</mat-icon>
                Synthèse
              </h3>
              <p class="ai-summary">{{ aiRecommendations()!.summary }}</p>
            </div>

            <!-- Key Insights -->
            <div class="ai-section">
              <h3>
                <mat-icon>lightbulb</mat-icon>
                Insights clés
              </h3>
              <ul class="ai-list">
                <li *ngFor="let insight of aiRecommendations()!.key_insights">
                  {{ insight }}
                </li>
              </ul>
            </div>

            <!-- Recommendations -->
            <div class="ai-section">
              <h3>
                <mat-icon>recommend</mat-icon>
                Recommandations
              </h3>
              <ul class="ai-list recommendations">
                <li *ngFor="let rec of aiRecommendations()!.recommendations">
                  {{ rec }}
                </li>
              </ul>
            </div>

            <!-- Alerts -->
            <div *ngIf="aiRecommendations()!.risk_alerts && aiRecommendations()!.risk_alerts!.length > 0" class="ai-section">
              <h3>
                <mat-icon color="warn">warning</mat-icon>
                Alertes
              </h3>
              <ul class="ai-list alerts">
                <li *ngFor="let alert of aiRecommendations()!.risk_alerts">
                  {{ alert }}
                </li>
              </ul>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Opportunities Table -->
        <mat-card class="table-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>table_chart</mat-icon>
              Tableau récapitulatif des opportunités ({{ stats()!.opportunities.length }})
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="table-container">
              <table mat-table [dataSource]="stats()!.opportunities" class="opportunities-table">
                <!-- Ref Column -->
                <ng-container matColumnDef="ref">
                  <th mat-header-cell *matHeaderCellDef>Référence</th>
                  <td mat-cell *matCellDef="let opp">
                    <strong>{{ opp.ref }}</strong>
                  </td>
                </ng-container>

                <!-- Client Column -->
                <ng-container matColumnDef="client">
                  <th mat-header-cell *matHeaderCellDef>Client</th>
                  <td mat-cell *matCellDef="let opp">{{ opp.client_name }}</td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Statut</th>
                  <td mat-cell *matCellDef="let opp">
                    <mat-chip [class]="getStatusClass(opp.status)">
                      {{ opp.status }}
                    </mat-chip>
                  </td>
                </ng-container>

                <!-- Amount HT Column -->
                <ng-container matColumnDef="amount_ht">
                  <th mat-header-cell *matHeaderCellDef>Montant HT</th>
                  <td mat-cell *matCellDef="let opp">
                    <strong>{{ formatCurrency(opp.amount_ht) }}</strong>
                  </td>
                </ng-container>

                <!-- Amount TTC Column -->
                <ng-container matColumnDef="amount_ttc">
                  <th mat-header-cell *matHeaderCellDef>Montant TTC</th>
                  <td mat-cell *matCellDef="let opp">{{ formatCurrency(opp.amount_ttc) }}</td>
                </ng-container>

                <!-- Date Column -->
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date de création</th>
                  <td mat-cell *matCellDef="let opp">{{ formatDate(opp.date_creation) }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Processing Time -->
        <div class="processing-time" *ngIf="processingTime()">
          <mat-icon>schedule</mat-icon>
          Temps de traitement: {{ processingTime() }}s
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dolibarr-stats-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content h1 {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .page-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #667eea;
    }

    .header-subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .date-selection-card {
      margin-bottom: 24px;
    }

    .date-selection-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .date-selector {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .date-selector mat-form-field {
      flex: 1;
      min-width: 200px;
    }

    .load-button {
      height: 56px;
      padding: 0 24px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      gap: 16px;
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: #fff3e0;
      border-left: 4px solid #ff9800;
    }

    .error-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
    }

    .card-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .card-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .card-content h3 {
      margin: 0 0 4px 0;
      font-size: 28px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .card-content p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .charts-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .chart-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ai-card {
      margin-bottom: 24px;
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    }

    .ai-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #667eea;
    }

    .ai-section {
      margin-bottom: 24px;
    }

    .ai-section:last-child {
      margin-bottom: 0;
    }

    .ai-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .ai-summary {
      padding: 16px;
      background: white;
      border-radius: 8px;
      line-height: 1.6;
      color: #333;
    }

    .ai-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .ai-list li {
      padding: 12px 16px;
      margin-bottom: 8px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      line-height: 1.5;
    }

    .ai-list.recommendations li {
      border-left-color: #4caf50;
    }

    .ai-list.alerts li {
      border-left-color: #ff9800;
      background: #fff3e0;
    }

    .table-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .table-container {
      overflow-x: auto;
    }

    .opportunities-table {
      width: 100%;
    }

    .opportunities-table th {
      background: #f5f5f5;
      font-weight: 600;
      color: #1a1a1a;
    }

    .opportunities-table td,
    .opportunities-table th {
      padding: 12px 16px;
    }

    mat-chip {
      font-size: 12px;
      padding: 4px 8px;
    }

    mat-chip.status-validated {
      background: #e8f5e9;
      color: #2e7d32;
    }

    mat-chip.status-signed {
      background: #e3f2fd;
      color: #1565c0;
    }

    mat-chip.status-billed {
      background: #f3e5f5;
      color: #6a1b9a;
    }

    mat-chip.status-draft {
      background: #fff3e0;
      color: #e65100;
    }

    mat-chip.status-not-signed {
      background: #ffebee;
      color: #c62828;
    }

    .processing-time {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      padding: 16px;
      color: #666;
      font-size: 14px;
    }
  `]
})
export class DolibarrStatsComponent implements OnInit {
  startDate: Date | null = null;
  endDate: Date | null = null;

  loading = signal(false);
  error = signal<string | null>(null);
  stats = signal<StatsData | null>(null);
  aiRecommendations = signal<AIRecommendations | null>(null);
  processingTime = signal<number | null>(null);

  displayedColumns: string[] = ['ref', 'client', 'status', 'amount_ht', 'amount_ttc', 'date'];

  constructor(private dolibarrService: DolibarrStatsService) {}

  ngOnInit(): void {
    // Set default dates (last 3 months)
    const today = new Date();
    this.endDate = today;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    this.startDate = threeMonthsAgo;
  }

  loadStats(): void {
    if (!this.startDate || !this.endDate) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.stats.set(null);
    this.aiRecommendations.set(null);

    const request = {
      start_date: this.formatDateForApi(this.startDate),
      end_date: this.formatDateForApi(this.endDate),
      generate_recommendations: true
    };

    this.dolibarrService.getStats(request).subscribe({
      next: (response: StatsResponse) => {
        this.loading.set(false);

        if (response.success && response.stats) {
          this.stats.set(response.stats);
          if (response.ai_recommendations) {
            this.aiRecommendations.set(response.ai_recommendations);
          }
          if (response.processing_time_seconds) {
            this.processingTime.set(response.processing_time_seconds);
          }
        } else {
          this.error.set(response.error || 'Erreur inconnue');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(`Erreur lors de la communication avec le serveur: ${err.message}`);
      }
    });
  }

  formatDateForApi(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateStr;
    }
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('validée') || statusLower.includes('validated')) {
      return 'status-validated';
    }
    if (statusLower.includes('signée') || statusLower.includes('signed')) {
      return 'status-signed';
    }
    if (statusLower.includes('facturée') || statusLower.includes('billed')) {
      return 'status-billed';
    }
    if (statusLower.includes('brouillon') || statusLower.includes('draft')) {
      return 'status-draft';
    }
    if (statusLower.includes('non signée') || statusLower.includes('not signed')) {
      return 'status-not-signed';
    }
    return '';
  }
}
