import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { TranslateModule } from '@ngx-translate/core';
import { RoleService } from '../../core/services/role.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule, TranslateModule],
  template: `
    <div class="profile-container">
      <!-- Profile Header Card -->
      <mat-card class="profile-header-card">
        <div class="profile-banner"></div>
        <div class="profile-info">
          <div class="avatar-container">
            <mat-icon class="profile-avatar">account_circle</mat-icon>
            <div class="status-indicator"></div>
          </div>
          <div class="user-details">
            <h1>{{ username }}</h1>
            <p>{{ email }}</p>
          </div>
        </div>
      </mat-card>

      <!-- Role Cards -->
      <div class="cards-grid">
        <mat-card class="info-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <mat-icon>security</mat-icon>
          </div>
          <div class="card-content">
            <h3>{{ 'common.roles' | translate }}</h3>
            <mat-chip-set class="roles-chips">
              @for (role of roles; track role) {
                <mat-chip class="role-chip">
                  <mat-icon>verified</mat-icon>
                  {{ role }}
                </mat-chip>
              }
            </mat-chip-set>
          </div>
        </mat-card>

        <mat-card class="info-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <mat-icon>email</mat-icon>
          </div>
          <div class="card-content">
            <h3>Contact</h3>
            <p class="info-value">{{ email || 'Non renseigné' }}</p>
          </div>
        </mat-card>

        <mat-card class="info-card">
          <div class="card-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="card-content">
            <h3>Dernière connexion</h3>
            <p class="info-value">Aujourd'hui</p>
          </div>
        </mat-card>
      </div>

      <!-- Stats Section -->
      <mat-card class="stats-card">
        <h2>Statistiques</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-content">
              <p class="stat-label">Sessions</p>
              <h3 class="stat-value">24</h3>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
              <mat-icon>access_time</mat-icon>
            </div>
            <div class="stat-content">
              <p class="stat-label">Temps total</p>
              <h3 class="stat-value">12h</h3>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%)">
              <mat-icon>task_alt</mat-icon>
            </div>
            <div class="stat-content">
              <p class="stat-label">Tâches</p>
              <h3 class="stat-value">156</h3>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      animation: fadeIn 0.6s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .profile-header-card {
      padding: 0;
      overflow: hidden;
      margin-bottom: 24px;
      animation: slideDown 0.6s ease;

      .profile-banner {
        height: 140px;
        background: linear-gradient(135deg,
          rgba(102, 126, 234, 0.8) 0%,
          rgba(118, 75, 162, 0.8) 50%,
          rgba(240, 147, 251, 0.8) 100%
        );
        position: relative;
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120"><path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="rgba(255,255,255,0.1)"></path></svg>') no-repeat bottom;
          background-size: cover;
          opacity: 0.3;
        }
      }

      .profile-info {
        padding: 0 32px 32px;
        display: flex;
        align-items: flex-end;
        gap: 24px;
        margin-top: -50px;
        position: relative;

        .avatar-container {
          position: relative;
          animation: scaleIn 0.6s ease 0.2s both;

          .profile-avatar {
            width: 120px;
            height: 120px;
            font-size: 120px;
            background: var(--card-bg);
            border-radius: 50%;
            border: 4px solid var(--card-bg);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .status-indicator {
            position: absolute;
            bottom: 8px;
            right: 8px;
            width: 20px;
            height: 20px;
            background: #4caf50;
            border: 3px solid var(--card-bg);
            border-radius: 50%;
            animation: pulse 2s infinite;
          }
        }

        .user-details {
          padding-bottom: 8px;
          animation: slideUp 0.6s ease 0.4s both;

          h1 {
            margin: 0 0 8px;
            font-size: 28px;
            font-weight: 700;
            color: var(--text-primary);
          }

          p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 14px;
          }
        }
      }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
      50% { box-shadow: 0 0 0 8px rgba(76, 175, 80, 0); }
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    .info-card {
      padding: 24px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      transition: all 0.4s ease;
      animation: fadeInUp 0.6s ease both;

      &:nth-child(1) { animation-delay: 0.1s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.3s; }

      &:hover {
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);

        .card-icon {
          transform: scale(1.1) rotate(5deg);
        }
      }

      .card-icon {
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

      .card-content {
        flex: 1;

        h3 {
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .roles-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;

          .role-chip {
            background: linear-gradient(135deg,
              rgba(102, 126, 234, 0.1) 0%,
              rgba(118, 75, 162, 0.1) 100%
            );
            border: 1px solid rgba(102, 126, 234, 0.3);
            font-weight: 500;

            mat-icon {
              font-size: 16px;
              width: 16px;
              height: 16px;
              margin-right: 4px;
              color: var(--primary-color);
            }
          }
        }
      }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .stats-card {
      padding: 32px;
      animation: fadeInUp 0.6s ease 0.4s both;

      h2 {
        margin: 0 0 24px;
        font-size: 24px;
        font-weight: 700;
        color: var(--text-primary);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 24px;
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: var(--hover-bg);
        border-radius: 16px;
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;

          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
            color: white;
          }
        }

        .stat-content {
          .stat-label {
            margin: 0 0 4px;
            font-size: 12px;
            color: var(--text-secondary);
            text-transform: uppercase;
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          .stat-value {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            color: var(--text-primary);
          }
        }
      }
    }

    @media (max-width: 768px) {
      .profile-container {
        padding: 16px;
      }

      .profile-header-card .profile-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 0 16px 24px;
      }

      .cards-grid {
        grid-template-columns: 1fr;
      }

      .stats-card .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  username = '';
  email = '';
  roles: string[] = [];

  constructor(private roleService: RoleService) {}

  async ngOnInit() {
    try {
      const profile = await this.roleService.getUserProfile();
      this.username = profile.username || 'User';
      this.email = profile.email || '';
      this.roles = this.roleService.getUserRoles();
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }
}
