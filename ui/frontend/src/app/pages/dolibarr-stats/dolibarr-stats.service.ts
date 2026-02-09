import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StatsRequest {
  start_date: string;
  end_date: string;
  generate_recommendations?: boolean;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string[];
  borderColor?: string[];
  fill?: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface OpportunitySummary {
  id: string;
  ref: string;
  client_name: string;
  status: string;
  amount_ht: number;
  amount_ttc: number;
  date_creation?: string;
}

export interface StatsData {
  status_pie_chart: ChartData;
  amount_line_chart: ChartData;
  opportunities: OpportunitySummary[];
  total_count: number;
  total_amount_ht: number;
  total_amount_ttc: number;
  by_status: { [key: string]: number };
  by_status_amount: { [key: string]: number };
  period_start: string;
  period_end: string;
}

export interface AIRecommendations {
  summary: string;
  key_insights: string[];
  recommendations: string[];
  risk_alerts?: string[];
}

export interface StatsResponse {
  success: boolean;
  stats?: StatsData;
  ai_recommendations?: AIRecommendations;
  error?: string;
  processing_time_seconds?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DolibarrStatsService {
  // Note: Stats endpoint not yet implemented. Using dolibarr-connector port for now.
  private apiUrl = 'http://localhost:8015/api/v1/stats';

  constructor(private http: HttpClient) {}

  getStats(request: StatsRequest): Observable<StatsResponse> {
    return this.http.post<StatsResponse>(this.apiUrl, request);
  }
}
