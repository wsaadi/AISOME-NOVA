import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';

import {
  QuotaConfig,
  QuotaType,
  QuotaPeriod,
  AIProvider,
  AI_PROVIDERS
} from '../../core/models/token-consumption.model';

interface DialogData {
  quota?: QuotaConfig;
  users: { id: string; name: string }[];
  agents: { id: string; name: string }[];
}

@Component({
  selector: 'app-quota-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatSliderModule,
    MatDividerModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      @if (isEditing) {
        {{ 'token_consumption.edit_quota' | translate }}
      } @else {
        {{ 'token_consumption.create_quota' | translate }}
      }
    </h2>

    <mat-dialog-content>
      <div class="form-grid">
        <!-- Type de quota -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.quota_type' | translate }}</mat-label>
          <mat-select [(ngModel)]="formData.type" (selectionChange)="onTypeChange()">
            <mat-option value="global">
              <mat-icon>public</mat-icon>
              {{ 'token_consumption.quota_type_global' | translate }}
            </mat-option>
            <mat-option value="user">
              <mat-icon>person</mat-icon>
              {{ 'token_consumption.quota_type_user' | translate }}
            </mat-option>
            <mat-option value="role">
              <mat-icon>groups</mat-icon>
              {{ 'token_consumption.quota_type_role' | translate }}
            </mat-option>
            <mat-option value="agent">
              <mat-icon>smart_toy</mat-icon>
              {{ 'token_consumption.quota_type_agent' | translate }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Cible (si pas global) -->
        @if (formData.type === 'user') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'token_consumption.select_user' | translate }}</mat-label>
            <mat-select [(ngModel)]="formData.targetId" (selectionChange)="onTargetChange()">
              @for (user of data.users; track user.id) {
                <mat-option [value]="user.id">{{ user.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (formData.type === 'role') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'token_consumption.select_role' | translate }}</mat-label>
            <mat-select [(ngModel)]="formData.targetId" (selectionChange)="onTargetChange()">
              <mat-option value="admin">Administrateur</mat-option>
              <mat-option value="user">Utilisateur</mat-option>
              <mat-option value="viewer">Lecteur</mat-option>
            </mat-select>
          </mat-form-field>
        }

        @if (formData.type === 'agent') {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>{{ 'token_consumption.select_agent' | translate }}</mat-label>
            <mat-select [(ngModel)]="formData.targetId" (selectionChange)="onTargetChange()">
              @for (agent of data.agents; track agent.id) {
                <mat-option [value]="agent.id">{{ agent.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <mat-divider></mat-divider>

        <!-- Provider -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.provider' | translate }}</mat-label>
          <mat-select [(ngModel)]="formData.provider">
            <mat-option value="all">
              <mat-icon>all_inclusive</mat-icon>
              {{ 'token_consumption.all_providers' | translate }}
            </mat-option>
            @for (provider of providers; track provider.id) {
              <mat-option [value]="provider.id">
                <mat-icon>{{ provider.icon }}</mat-icon>
                {{ provider.name }}
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Période -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.period' | translate }}</mat-label>
          <mat-select [(ngModel)]="formData.period">
            <mat-option value="daily">{{ 'token_consumption.period_daily' | translate }}</mat-option>
            <mat-option value="weekly">{{ 'token_consumption.period_weekly' | translate }}</mat-option>
            <mat-option value="monthly">{{ 'token_consumption.period_monthly' | translate }}</mat-option>
            <mat-option value="unlimited">{{ 'token_consumption.period_unlimited' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-divider></mat-divider>

        <!-- Limite de tokens -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.max_tokens' | translate }}</mat-label>
          <input matInput type="number" [(ngModel)]="formData.maxTokens" min="1000" step="1000">
          <mat-hint>{{ 'token_consumption.max_tokens_hint' | translate }}</mat-hint>
        </mat-form-field>

        <!-- Limite de coût (optionnel) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'token_consumption.max_cost' | translate }}</mat-label>
          <input matInput type="number" [(ngModel)]="formData.maxCost" min="0" step="0.01">
          <span matTextSuffix>EUR</span>
          <mat-hint>{{ 'token_consumption.max_cost_hint' | translate }}</mat-hint>
        </mat-form-field>

        <!-- Seuil d'alerte -->
        <div class="slider-field">
          <label>{{ 'token_consumption.alert_threshold' | translate }}: {{ formData.alertThreshold }}%</label>
          <mat-slider min="50" max="99" step="5" discrete>
            <input matSliderThumb [(ngModel)]="formData.alertThreshold">
          </mat-slider>
          <mat-hint>{{ 'token_consumption.alert_threshold_hint' | translate }}</mat-hint>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'common.cancel' | translate }}</button>
      <button mat-raised-button color="primary" [disabled]="!isValid()" (click)="save()">
        {{ 'common.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 400px;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    mat-divider {
      margin: 8px 0;
    }

    .slider-field {
      display: flex;
      flex-direction: column;
      gap: 8px;

      label {
        font-size: 14px;
        color: var(--text-secondary);
      }

      mat-slider {
        width: 100%;
      }

      mat-hint {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    mat-option mat-icon {
      margin-right: 8px;
    }
  `]
})
export class QuotaDialogComponent implements OnInit {
  isEditing = false;
  providers = AI_PROVIDERS;

  formData: {
    type: QuotaType;
    targetId?: string;
    targetName?: string;
    provider: AIProvider | 'all';
    period: QuotaPeriod;
    maxTokens: number;
    maxCost?: number;
    alertThreshold: number;
  } = {
    type: 'global',
    provider: 'all',
    period: 'monthly',
    maxTokens: 1000000,
    alertThreshold: 80
  };

  constructor(
    public dialogRef: MatDialogRef<QuotaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    if (this.data.quota) {
      this.isEditing = true;
      this.formData = {
        type: this.data.quota.type,
        targetId: this.data.quota.targetId,
        targetName: this.data.quota.targetName,
        provider: this.data.quota.provider,
        period: this.data.quota.period,
        maxTokens: this.data.quota.maxTokens,
        maxCost: this.data.quota.maxCost,
        alertThreshold: this.data.quota.alertThreshold
      };
    }
  }

  onTypeChange(): void {
    this.formData.targetId = undefined;
    this.formData.targetName = undefined;
  }

  onTargetChange(): void {
    switch (this.formData.type) {
      case 'user':
        const user = this.data.users.find(u => u.id === this.formData.targetId);
        this.formData.targetName = user?.name;
        break;
      case 'agent':
        const agent = this.data.agents.find(a => a.id === this.formData.targetId);
        this.formData.targetName = agent?.name;
        break;
      case 'role':
        const roleNames: Record<string, string> = {
          admin: 'Administrateur',
          user: 'Utilisateur',
          viewer: 'Lecteur'
        };
        this.formData.targetName = roleNames[this.formData.targetId || ''];
        break;
    }
  }

  isValid(): boolean {
    if (this.formData.maxTokens <= 0) return false;

    if (this.formData.type !== 'global' && !this.formData.targetId) {
      return false;
    }

    return true;
  }

  save(): void {
    if (this.isValid()) {
      this.dialogRef.close(this.formData);
    }
  }
}
