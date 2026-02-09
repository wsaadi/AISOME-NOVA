import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type ProgressSize = 'small' | 'medium' | 'large';

/**
 * Composant de barre de progression
 *
 * @example
 * ```html
 * <app-progress-bar
 *   [value]="75"
 *   [max]="100"
 *   variant="primary"
 *   size="medium"
 *   [showLabel]="true"
 *   [animated]="true">
 * </app-progress-bar>
 * ```
 */
@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent {
  @Input() value: number = 0;
  @Input() max: number = 100;
  @Input() variant: ProgressVariant = 'primary';
  @Input() size: ProgressSize = 'medium';
  @Input() showLabel: boolean = true;
  @Input() animated: boolean = false;
  @Input() striped: boolean = false;
  @Input() label: string = '';
  @Input() labelPosition: 'inside' | 'outside' = 'inside';

  get percentage(): number {
    if (this.max === 0) return 0;
    return Math.min(100, Math.max(0, (this.value / this.max) * 100));
  }

  get displayLabel(): string {
    if (this.label) return this.label;
    return `${Math.round(this.percentage)}%`;
  }

  get progressBarClasses(): string {
    return [
      'progress-bar',
      `progress-bar--${this.size}`,
      this.striped ? 'progress-bar--striped' : '',
      this.animated ? 'progress-bar--animated' : ''
    ].filter(Boolean).join(' ');
  }

  get fillClasses(): string {
    return [
      'progress-bar__fill',
      `progress-bar__fill--${this.variant}`
    ].filter(Boolean).join(' ');
  }
}
