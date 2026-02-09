import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Composant de bouton personnalisable
 *
 * @example
 * ```html
 * <app-custom-button
 *   label="Cliquez-moi"
 *   variant="primary"
 *   size="medium"
 *   [disabled]="false"
 *   [loading]="false"
 *   icon="fa fa-check"
 *   (onClick)="handleClick()">
 * </app-custom-button>
 * ```
 */
@Component({
  selector: 'app-custom-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-button.component.html',
  styleUrls: ['./custom-button.component.scss']
})
export class CustomButtonComponent {
  @Input() label: string = 'Button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'medium';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() icon?: string;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() fullWidth: boolean = false;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';

  @Output() onClick = new EventEmitter<MouseEvent>();

  handleClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.onClick.emit(event);
    }
  }

  get buttonClasses(): string {
    return [
      'custom-button',
      `custom-button--${this.variant}`,
      `custom-button--${this.size}`,
      this.fullWidth ? 'custom-button--full-width' : '',
      this.disabled ? 'custom-button--disabled' : '',
      this.loading ? 'custom-button--loading' : ''
    ].filter(Boolean).join(' ');
  }
}
