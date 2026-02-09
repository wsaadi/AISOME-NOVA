import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface RadioOption {
  label: string;
  value: any;
  disabled?: boolean;
  description?: string;
}

/**
 * Composant de boutons radio personnalisable
 *
 * @example
 * ```html
 * <app-radio-button
 *   [options]="radioOptions"
 *   [name]="'payment-method'"
 *   [label]="'Méthode de paiement'"
 *   [layout]="'vertical'"
 *   [(ngModel)]="selectedMethod"
 *   (valueChange)="handleChange($event)">
 * </app-radio-button>
 * ```
 */
@Component({
  selector: 'app-radio-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio-button.component.html',
  styleUrls: ['./radio-button.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioButtonComponent),
      multi: true
    }
  ]
})
export class RadioButtonComponent implements ControlValueAccessor {
  @Input() options: RadioOption[] = [];
  @Input() name: string = '';
  @Input() label: string = '';
  @Input() layout: 'horizontal' | 'vertical' = 'vertical';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() error: string = '';

  @Output() valueChange = new EventEmitter<any>();

  value: any = null;
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  handleChange(optionValue: any): void {
    if (this.disabled) return;

    this.value = optionValue;
    this.onChange(optionValue);
    this.onTouched();
    this.valueChange.emit(optionValue);
  }

  isChecked(optionValue: any): boolean {
    return this.value === optionValue;
  }

  get containerClasses(): string {
    return [
      'radio-group',
      `radio-group--${this.layout}`,
      this.error ? 'radio-group--error' : ''
    ].filter(Boolean).join(' ');
  }
}
