import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Composant de case à cocher personnalisable
 *
 * @example
 * ```html
 * <app-checkbox
 *   [label]="'J\'accepte les conditions'"
 *   [description]="'En cochant cette case, vous acceptez nos CGU'"
 *   [disabled]="false"
 *   [required]="true"
 *   [(ngModel)]="isAccepted"
 *   (valueChange)="handleChange($event)">
 * </app-checkbox>
 * ```
 */
@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true
    }
  ]
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() description: string = '';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() error: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() indeterminate: boolean = false;

  @Output() valueChange = new EventEmitter<boolean>();

  checked: boolean = false;
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: boolean): void {
    this.checked = value;
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
    if (this.disabled) return;

    const inputElement = event.target as HTMLInputElement;
    this.checked = inputElement.checked;
    this.indeterminate = false;

    this.onChange(this.checked);
    this.onTouched();
    this.valueChange.emit(this.checked);
  }

  get checkboxClasses(): string {
    return [
      'checkbox-input',
      `checkbox-input--${this.size}`,
      this.error ? 'checkbox-input--error' : '',
      this.indeterminate ? 'checkbox-input--indeterminate' : ''
    ].filter(Boolean).join(' ');
  }
}
