import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDividerModule,
    TranslateModule
  ],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <div class="header-content">
          <mat-icon class="header-icon">settings</mat-icon>
          <div>
            <h1>{{ 'menu.settings' | translate }}</h1>
            <p>Personnalisez votre expérience</p>
          </div>
        </div>
      </div>

      <!-- Appearance Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <mat-icon>palette</mat-icon>
          Apparence
        </h2>
        <mat-card class="settings-card">
          <div class="setting-item">
            <div class="setting-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
              <mat-icon>dark_mode</mat-icon>
            </div>
            <div class="setting-info">
              <h3>Mode sombre</h3>
              <p>Activer le thème sombre pour réduire la fatigue oculaire</p>
            </div>
            <mat-slide-toggle
              [checked]="isDarkTheme()"
              (change)="toggleTheme()"
              color="primary"
            ></mat-slide-toggle>
          </div>
        </mat-card>
      </div>

      <!-- Language Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <mat-icon>language</mat-icon>
          Langue & Région
        </h2>
        <mat-card class="settings-card">
          <div class="setting-item">
            <div class="setting-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
              <mat-icon>translate</mat-icon>
            </div>
            <div class="setting-info">
              <h3>Langue de l'interface</h3>
              <p>Choisissez votre langue préférée</p>
            </div>
            <mat-form-field class="lang-select">
              <mat-select
                [value]="getCurrentLang()"
                (selectionChange)="changeLanguage($event.value)"
              >
                <mat-option value="fr">
                  <span class="lang-option">🇫🇷 {{ 'language.fr' | translate }}</span>
                </mat-option>
                <mat-option value="en">
                  <span class="lang-option">🇬🇧 {{ 'language.en' | translate }}</span>
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </mat-card>
      </div>

      <!-- Notifications Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <mat-icon>notifications</mat-icon>
          Notifications
        </h2>
        <mat-card class="settings-card">
          <div class="setting-item">
            <div class="setting-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
              <mat-icon>email</mat-icon>
            </div>
            <div class="setting-info">
              <h3>Notifications par email</h3>
              <p>Recevoir des notifications importantes par email</p>
            </div>
            <mat-slide-toggle color="primary" [checked]="true"></mat-slide-toggle>
          </div>

          <mat-divider></mat-divider>

          <div class="setting-item">
            <div class="setting-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
              <mat-icon>notifications_active</mat-icon>
            </div>
            <div class="setting-info">
              <h3>Notifications push</h3>
              <p>Activer les notifications dans le navigateur</p>
            </div>
            <mat-slide-toggle color="primary" [checked]="false"></mat-slide-toggle>
          </div>
        </mat-card>
      </div>

      <!-- Privacy Section -->
      <div class="settings-section">
        <h2 class="section-title">
          <mat-icon>security</mat-icon>
          Confidentialité & Sécurité
        </h2>
        <mat-card class="settings-card">
          <div class="setting-item">
            <div class="setting-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
              <mat-icon>lock</mat-icon>
            </div>
            <div class="setting-info">
              <h3>Authentification à deux facteurs</h3>
              <p>Renforcez la sécurité de votre compte</p>
            </div>
            <mat-slide-toggle color="primary" [checked]="true"></mat-slide-toggle>
          </div>

          <mat-divider></mat-divider>

          <div class="setting-item">
            <div class="setting-icon" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%)">
              <mat-icon>history</mat-icon>
            </div>
            <div class="setting-info">
              <h3>Historique d'activité</h3>
              <p>Enregistrer l'historique de vos actions</p>
            </div>
            <mat-slide-toggle color="primary" [checked]="true"></mat-slide-toggle>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      animation: fadeIn 0.6s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .settings-header {
      margin-bottom: 40px;
      animation: slideDown 0.6s ease;

      .header-content {
        display: flex;
        align-items: center;
        gap: 20px;

        .header-icon {
          width: 64px;
          height: 64px;
          font-size: 64px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rotate 3s ease-in-out infinite;
        }

        h1 {
          margin: 0;
          font-size: 36px;
          font-weight: 800;
          color: var(--text-primary);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        p {
          margin: 8px 0 0;
          color: var(--text-secondary);
          font-size: 15px;
        }
      }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes rotate {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(10deg); }
    }

    .settings-section {
      margin-bottom: 32px;
      animation: fadeInUp 0.6s ease both;

      &:nth-child(2) { animation-delay: 0.1s; }
      &:nth-child(3) { animation-delay: 0.2s; }
      &:nth-child(4) { animation-delay: 0.3s; }
      &:nth-child(5) { animation-delay: 0.4s; }

      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 16px 0;
        padding: 0 8px;

        mat-icon {
          color: var(--primary-color);
        }
      }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .settings-card {
      padding: 0;
      overflow: hidden;
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .setting-item {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px;
        transition: all 0.3s ease;
        position: relative;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 0;
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
          transition: height 0.3s ease;
        }

        &:hover {
          background: var(--hover-bg);

          &::before {
            height: 100%;
          }

          .setting-icon {
            transform: scale(1.1) rotate(5deg);
          }
        }

        &:not(:last-child) {
          border-bottom: 1px solid var(--border-color);
        }

        .setting-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.4s ease;

          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: white;
          }
        }

        .setting-info {
          flex: 1;

          h3 {
            margin: 0 0 6px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
          }

          p {
            margin: 0;
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.5;
          }
        }

        mat-slide-toggle {
          flex-shrink: 0;
        }

        .lang-select {
          flex-shrink: 0;
          min-width: 180px;

          .lang-option {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 15px;
          }
        }
      }

      mat-divider {
        margin: 0 24px;
      }
    }

    @media (max-width: 768px) {
      .settings-container {
        padding: 16px;
      }

      .settings-header {
        margin-bottom: 24px;

        .header-content {
          flex-direction: column;
          align-items: flex-start;

          .header-icon {
            width: 48px;
            height: 48px;
            font-size: 48px;
          }

          h1 {
            font-size: 28px;
          }
        }
      }

      .settings-card .setting-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding: 20px;

        mat-slide-toggle,
        .lang-select {
          width: 100%;
        }
      }
    }
  `]
})
export class SettingsComponent {
  constructor(
    private themeService: ThemeService,
    private translate: TranslateService
  ) {}

  isDarkTheme(): boolean {
    return this.themeService.currentTheme() === 'dark';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  getCurrentLang(): string {
    return this.translate.currentLang || 'fr';
  }

  changeLanguage(lang: string): void {
    this.translate.use(lang);
    localStorage.setItem('app-lang', lang);
  }
}
