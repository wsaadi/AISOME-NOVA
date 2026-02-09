import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, TranslateModule, RouterLink],
  template: `
    <div class="home-container">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <mat-icon>stars</mat-icon>
            <span>{{ 'home.hero.badge' | translate }}</span>
          </div>
          <h1 class="hero-title">
            <span class="gradient-text">{{ 'app.welcome' | translate }}</span>
            <br/>
            {{ 'app.title' | translate }}
          </h1>
          <p class="hero-subtitle">
            {{ 'home.hero.subtitle' | translate }}
          </p>
          <div class="hero-actions">
            <button mat-raised-button color="primary" class="hero-button" routerLink="/dashboard">
              <mat-icon>dashboard</mat-icon>
              {{ 'home.hero.dashboard_button' | translate }}
            </button>
            <button mat-stroked-button class="hero-button-outline" routerLink="/profile">
              <mat-icon>person</mat-icon>
              {{ 'home.hero.profile_button' | translate }}
            </button>
          </div>
        </div>
        <div class="hero-decoration">
          <div class="floating-icon icon-1">
            <mat-icon>security</mat-icon>
          </div>
          <div class="floating-icon icon-2">
            <mat-icon>speed</mat-icon>
          </div>
          <div class="floating-icon icon-3">
            <mat-icon>devices</mat-icon>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="features-section">
        <h2 class="section-title">{{ 'home.features.title' | translate }}</h2>
        <div class="features-grid">
          <mat-card class="feature-card" *ngFor="let feature of features">
            <div class="feature-icon" [style.background]="feature.gradient">
              <mat-icon>{{ feature.icon }}</mat-icon>
            </div>
            <h3>{{ feature.titleKey | translate }}</h3>
            <p>{{ feature.descriptionKey | translate }}</p>
          </mat-card>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="stats-section">
        <mat-card class="stats-card">
          <div class="stat-item" *ngFor="let stat of stats">
            <div class="stat-icon">
              <mat-icon>{{ stat.icon }}</mat-icon>
            </div>
            <div class="stat-content">
              <h3>{{ stat.valueKey | translate }}</h3>
              <p>{{ stat.labelKey | translate }}</p>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      padding: 0;
      animation: fadeIn 0.6s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    // Hero Section
    .hero-section {
      position: relative;
      padding: 80px 40px;
      background: linear-gradient(135deg,
        rgba(63, 81, 181, 0.1) 0%,
        rgba(121, 134, 203, 0.05) 50%,
        rgba(255, 64, 129, 0.05) 100%
      );
      overflow: hidden;
      border-radius: 24px;
      margin: 24px;
      backdrop-filter: blur(10px);

      &::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(121, 134, 203, 0.2) 0%, transparent 70%);
        animation: pulse 4s ease-in-out infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.2); opacity: 0.3; }
    }

    .hero-content {
      position: relative;
      z-index: 2;
      max-width: 700px;
      margin: 0 auto;
      text-align: center;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      background: var(--card-bg);
      border-radius: 24px;
      box-shadow: var(--card-shadow);
      margin-bottom: 24px;
      animation: slideDown 0.8s ease;

      mat-icon {
        color: #FFD700;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      span {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 14px;
      }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hero-title {
      font-size: 48px;
      font-weight: 800;
      margin: 0 0 24px 0;
      line-height: 1.2;
      color: var(--text-primary);
      animation: slideUp 0.8s ease 0.2s both;

      .gradient-text {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hero-subtitle {
      font-size: 18px;
      color: var(--text-secondary);
      margin-bottom: 32px;
      line-height: 1.6;
      animation: slideUp 0.8s ease 0.4s both;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      animation: slideUp 0.8s ease 0.6s both;

      .hero-button, .hero-button-outline {
        padding: 12px 32px;
        font-size: 16px;
        font-weight: 500;
        border-radius: 12px;
        text-transform: none;
        transition: all 0.3s ease;

        mat-icon {
          margin-right: 8px;
        }

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(63, 81, 181, 0.3);
        }
      }
    }

    .hero-decoration {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }

    .floating-icon {
      position: absolute;
      width: 80px;
      height: 80px;
      background: var(--card-bg);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      animation: float 6s ease-in-out infinite;

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      &.icon-1 {
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }

      &.icon-2 {
        top: 20%;
        right: 15%;
        animation-delay: 2s;
      }

      &.icon-3 {
        bottom: 15%;
        left: 15%;
        animation-delay: 4s;
      }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(5deg); }
    }

    // Features Section
    .features-section {
      padding: 60px 40px;
      margin: 0 24px;
    }

    .section-title {
      text-align: center;
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 48px;
      color: var(--text-primary);
      position: relative;

      &::after {
        content: '';
        position: absolute;
        bottom: -12px;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 4px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        border-radius: 2px;
      }
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }

    .feature-card {
      padding: 32px 24px;
      text-align: center;
      transition: all 0.4s ease;
      cursor: pointer;
      animation: fadeInUp 0.6s ease both;

      &:nth-child(1) { animation-delay: 0.1s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.3s; }
      &:nth-child(4) { animation-delay: 0.4s; }
      &:nth-child(5) { animation-delay: 0.5s; }
      &:nth-child(6) { animation-delay: 0.6s; }

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);

        .feature-icon {
          transform: scale(1.1) rotate(5deg);
        }
      }

      .feature-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.4s ease;

        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
          color: white;
        }
      }

      h3 {
        font-size: 20px;
        font-weight: 600;
        margin: 16px 0 12px;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        font-size: 14px;
      }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    // Stats Section
    .stats-section {
      padding: 0 40px 60px;
      margin: 0 24px;
    }

    .stats-card {
      padding: 40px;
      background: linear-gradient(135deg,
        rgba(102, 126, 234, 0.1) 0%,
        rgba(118, 75, 162, 0.1) 100%
      );
      border-radius: 24px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 32px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: var(--card-bg);
      border-radius: 16px;
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      }

      .stat-icon {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: white;
        }
      }

      .stat-content {
        h3 {
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        p {
          margin: 4px 0 0;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
        }
      }
    }

    // Responsive
    @media (max-width: 768px) {
      .hero-section {
        padding: 60px 24px;
        margin: 16px;
      }

      .hero-title {
        font-size: 36px;
      }

      .floating-icon {
        width: 60px;
        height: 60px;

        mat-icon {
          font-size: 30px;
          width: 30px;
          height: 30px;
        }
      }

      .features-section {
        padding: 40px 24px;
        margin: 0 16px;
      }

      .section-title {
        font-size: 28px;
      }

      .stats-section {
        padding: 0 24px 40px;
        margin: 0 16px;
      }

      .stats-card {
        padding: 24px;
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .hero-actions {
        flex-direction: column;

        .hero-button, .hero-button-outline {
          width: 100%;
        }
      }
    }
  `]
})
export class HomeComponent {
  constructor(private translate: TranslateService) {}

  features = [
    {
      icon: 'security',
      titleKey: 'home.features.security.title',
      descriptionKey: 'home.features.security.description',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      icon: 'palette',
      titleKey: 'home.features.themes.title',
      descriptionKey: 'home.features.themes.description',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      icon: 'language',
      titleKey: 'home.features.multilang.title',
      descriptionKey: 'home.features.multilang.description',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      icon: 'devices',
      titleKey: 'home.features.responsive.title',
      descriptionKey: 'home.features.responsive.description',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    },
    {
      icon: 'speed',
      titleKey: 'home.features.performance.title',
      descriptionKey: 'home.features.performance.description',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    },
    {
      icon: 'auto_awesome',
      titleKey: 'home.features.modern.title',
      descriptionKey: 'home.features.modern.description',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)'
    }
  ];

  stats = [
    { icon: 'verified_user', valueKey: 'home.stats.security.value', labelKey: 'home.stats.security.label' },
    { icon: 'speed', valueKey: 'home.stats.speed.value', labelKey: 'home.stats.speed.label' },
    { icon: 'thumb_up', valueKey: 'home.stats.experience.value', labelKey: 'home.stats.experience.label' }
  ];
}
