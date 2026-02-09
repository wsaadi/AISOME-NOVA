import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

/**
 * Composant de liste déroulante personnalisable
 *
 * @example
 * ```html
 * <app-select
 *   [options]="myOptions"
 *   [label]="'Choisir une option'"
 *   [placeholder]="'Sélectionnez...'"
 *   [disabled]="false"
 *   [required]="true"
 *   [(ngModel)]="selectedValue"
 *   (valueChange)="handleChange($event)">
 * </app-select>
 * ```
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ]
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() label: string = '';
  @Input() placeholder: string = 'Sélectionnez une option';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() error: string = '';
  @Input() helpText: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

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

  handleChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const newValue = selectElement.value;

    this.value = newValue;
    this.onChange(newValue);
    this.onTouched();
    this.valueChange.emit(newValue);
  }

  get selectClasses(): string {
    return [
      'select-input',
      `select-input--${this.size}`,
      this.error ? 'select-input--error' : '',
      this.disabled ? 'select-input--disabled' : ''
    ].filter(Boolean).join(' ');
  }
}
