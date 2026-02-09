import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface DashboardCard {
  titleKey: string;
  value: string;
  icon: string;
  gradient: string;
  trend: string;
  progress: number;
}

interface Activity {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  descriptionParams?: any;
  timeKey: string;
  timeParams?: any;
  color: string;
}

interface QuickAction {
  icon: string;
  labelKey: string;
  gradient: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    TranslateModule
  ],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div class="header-content">
          <h1>{{ 'menu.dashboard' | translate }}</h1>
          <p class="header-subtitle">{{ 'dashboard.subtitle' | translate }}</p>
        </div>
        <button mat-raised-button color="primary" class="refresh-button">
          <mat-icon>refresh</mat-icon>
          {{ 'dashboard.refresh' | translate }}
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <mat-card
          class="stat-card"
          *ngFor="let card of cards(); let i = index"
          [style.animation-delay]="(i * 0.1) + 's'"
        >
          <div class="card-header">
            <div class="icon-container" [style.background]="card.gradient">
              <mat-icon>{{ card.icon }}</mat-icon>
            </div>
            <span class="trend" [class.positive]="card.trend.includes('+')">
              <mat-icon>{{ card.trend.includes('+') ? 'trending_up' : 'trending_down' }}</mat-icon>
              {{ card.trend }}
            </span>
          </div>
          <div class="card-body">
            <h2 class="card-title">{{ card.titleKey | translate }}</h2>
            <p class="card-value">{{ card.value }}</p>
            <mat-progress-bar
              mode="determinate"
              [value]="card.progress"
              [style.--progress-color]="card.gradient"
            ></mat-progress-bar>
          </div>
        </mat-card>
      </div>

      <!-- Activity Section -->
      <div class="activity-section">
        <mat-card class="activity-card">
          <mat-card-header>
            <div class="activity-header">
              <div>
                <mat-card-title>{{ 'dashboard.activity.title' | translate }}</mat-card-title>
                <mat-card-subtitle>{{ 'dashboard.activity.subtitle' | translate }}</mat-card-subtitle>
              </div>
              <button mat-icon-button>
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div class="activity-list">
              <div class="activity-item" *ngFor="let activity of activities">
                <div class="activity-icon" [style.background]="activity.color">
                  <mat-icon>{{ activity.icon }}</mat-icon>
                </div>
                <div class="activity-content">
                  <h4>{{ activity.titleKey | translate }}</h4>
                  <p>{{ activity.descriptionKey | translate:activity.descriptionParams }}</p>
                  <span class="activity-time">{{ activity.timeKey | translate:activity.timeParams }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions -->
        <mat-card class="quick-actions-card">
          <mat-card-header>
            <mat-card-title>{{ 'dashboard.quick_actions.title' | translate }}</mat-card-title>
            <mat-card-subtitle>{{ 'dashboard.quick_actions.subtitle' | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="actions-grid">
              <button mat-raised-button class="action-button" *ngFor="let action of quickActions">
                <div class="action-icon" [style.background]="action.gradient">
                  <mat-icon>{{ action.icon }}</mat-icon>
                </div>
                <span>{{ action.labelKey | translate }}</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      animation: fadeIn 0.6s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    // Header
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
      animation: slideDown 0.6s ease;

      .header-content {
        h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: var(--text-primary);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-subtitle {
          color: var(--text-secondary);
          margin: 0;
          font-size: 14px;
        }
      }

      .refresh-button {
        border-radius: 12px;
        padding: 8px 24px;
        text-transform: none;
        font-weight: 500;

        mat-icon {
          margin-right: 8px;
        }

        &:hover {
          transform: scale(1.05);
          transition: transform 0.2s ease;
        }
      }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    // Stats Grid
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      animation: scaleIn 0.6s ease both;
      cursor: pointer;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, transparent 0%, rgba(102, 126, 234, 0.05) 100%);
        opacity: 0;
        transition: opacity 0.4s ease;
      }

      &:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);

        &::before {
          opacity: 1;
        }

        .icon-container {
          transform: scale(1.1) rotate(5deg);
        }

        .card-value {
          transform: scale(1.05);
        }
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        .icon-container {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s ease;

          mat-icon {
            font-size: 32px;
            width: 32px;
            height: 32px;
            color: white;
          }
        }

        .trend {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          background: rgba(244, 67, 54, 0.1);
          color: #f44336;

          &.positive {
            background: rgba(76, 175, 80, 0.1);
            color: #4caf50;
          }

          mat-icon {
            font-size: 18px;
            width: 18px;
            height: 18px;
          }
        }
      }

      .card-body {
        .card-title {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .card-value {
          font-size: 36px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 16px 0;
          transition: transform 0.3s ease;
        }

        mat-progress-bar {
          height: 6px;
          border-radius: 3px;

          ::ng-deep .mdc-linear-progress__bar-inner {
            background: var(--progress-color, linear-gradient(90deg, #667eea 0%, #764ba2 100%));
          }
        }
      }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    // Activity Section
    .activity-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    .activity-card {
      padding: 0;
      animation: slideRight 0.6s ease 0.3s both;

      mat-card-header {
        padding: 24px 24px 16px;
        border-bottom: 1px solid var(--border-color);

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;

          mat-card-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }

          mat-card-subtitle {
            color: var(--text-secondary);
            font-size: 13px;
            margin: 4px 0 0;
          }
        }
      }

      mat-card-content {
        padding: 24px;
      }

      .activity-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .activity-item {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        padding: 16px;
        border-radius: 12px;
        transition: all 0.3s ease;

        &:hover {
          background: var(--hover-bg);
          transform: translateX(8px);
        }

        .activity-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          mat-icon {
            color: white;
            font-size: 24px;
            width: 24px;
            height: 24px;
          }
        }

        .activity-content {
          flex: 1;

          h4 {
            margin: 0 0 4px;
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
          }

          p {
            margin: 0 0 8px;
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.5;
          }

          .activity-time {
            font-size: 12px;
            color: var(--text-secondary);
            opacity: 0.7;
          }
        }
      }
    }

    @keyframes slideRight {
      from { opacity: 0; transform: translateX(-30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    // Quick Actions
    .quick-actions-card {
      animation: slideLeft 0.6s ease 0.3s both;

      mat-card-header {
        padding: 24px 24px 16px;
        border-bottom: 1px solid var(--border-color);

        mat-card-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }

        mat-card-subtitle {
          color: var(--text-secondary);
          font-size: 13px;
        }
      }

      mat-card-content {
        padding: 24px;
      }

      .actions-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .action-button {
        width: 100%;
        padding: 16px;
        text-align: left;
        border-radius: 12px;
        text-transform: none;
        justify-content: flex-start;
        transition: all 0.3s ease;

        &:hover {
          transform: translateX(8px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .action-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;

          mat-icon {
            font-size: 20px;
            width: 20px;
            height: 20px;
            color: white;
          }
        }

        span {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
      }
    }

    @keyframes slideLeft {
      from { opacity: 0; transform: translateX(30px); }
      to { opacity: 1; transform: translateX(0); }
    }

    // Responsive
    @media (max-width: 1024px) {
      .activity-section {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 16px;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;

        .refresh-button {
          width: 100%;
        }
      }

      .stats-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private translate = inject(TranslateService);

  cards = signal<DashboardCard[]>([
    {
      titleKey: 'dashboard.cards.active_users',
      value: '2,543',
      icon: 'people',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      trend: '+12.5%',
      progress: 75
    },
    {
      titleKey: 'dashboard.cards.monthly_revenue',
      value: '45.2K€',
      icon: 'attach_money',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      trend: '+8.3%',
      progress: 60
    },
    {
      titleKey: 'dashboard.cards.conversion_rate',
      value: '3.48%',
      icon: 'trending_up',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      trend: '+2.1%',
      progress: 85
    },
    {
      titleKey: 'dashboard.cards.customer_satisfaction',
      value: '4.8/5',
      icon: 'star',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      trend: '+0.3',
      progress: 96
    }
  ]);

  activities: Activity[] = [
    {
      icon: 'person_add',
      titleKey: 'dashboard.activity.new_user',
      descriptionKey: 'dashboard.activity.new_user_desc',
      descriptionParams: { name: 'Jean Dupont' },
      timeKey: 'time.minutes_ago',
      timeParams: { count: 5 },
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      icon: 'shopping_cart',
      titleKey: 'dashboard.activity.new_order',
      descriptionKey: 'dashboard.activity.new_order_desc',
      descriptionParams: { id: '12345', amount: '156€' },
      timeKey: 'time.minutes_ago',
      timeParams: { count: 12 },
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      icon: 'rate_review',
      titleKey: 'dashboard.activity.new_review',
      descriptionKey: 'dashboard.activity.new_review_desc',
      descriptionParams: { name: 'Marie Martin', rating: 5 },
      timeKey: 'time.hours_ago',
      timeParams: { count: 1 },
      color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      icon: 'warning',
      titleKey: 'dashboard.activity.system_alert',
      descriptionKey: 'dashboard.activity.system_alert_desc',
      timeKey: 'time.hours_ago',
      timeParams: { count: 2 },
      color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    }
  ];

  quickActions: QuickAction[] = [
    { icon: 'person_add', labelKey: 'dashboard.quick_actions.add_user', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'assessment', labelKey: 'dashboard.quick_actions.generate_report', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { icon: 'mail', labelKey: 'dashboard.quick_actions.send_message', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { icon: 'settings', labelKey: 'dashboard.quick_actions.system_settings', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
  ];

  ngOnInit() {
    // Animation des compteurs au chargement
    this.animateCounters();
  }

  private animateCounters() {
    // Logique d'animation des compteurs (optionnelle)
  }
}
