import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Composant de champ texte personnalisable
 *
 * @example
 * ```html
 * <app-text-input
 *   [label]="'Email'"
 *   [placeholder]="'vous@exemple.com'"
 *   [type]="'email'"
 *   [required]="true"
 *   [maxLength]="100"
 *   [icon]="'fa fa-envelope'"
 *   [(ngModel)]="email"
 *   (valueChange)="handleChange($event)">
 * </app-text-input>
 * ```
 */
@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true
    }
  ]
})
export class TextInputComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() placeholder: string = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' = 'text';
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;
  @Input() error: string = '';
  @Input() helpText: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() icon: string = '';
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() maxLength?: number;
  @Input() minLength?: number;
  @Input() pattern?: string;
  @Input() autocomplete: string = 'off';
  @Input() showCharacterCount: boolean = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() onBlur = new EventEmitter<void>();
  @Output() onFocus = new EventEmitter<void>();

  value: string = '';
  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: string): void {
    this.value = value || '';
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

  handleInput(event: Event): void {
    if (this.disabled) return;

    const inputElement = event.target as HTMLInputElement;
    this.value = inputElement.value;

    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  handleBlur(): void {
    this.onTouched();
    this.onBlur.emit();
  }

  handleFocus(): void {
    this.onFocus.emit();
  }

  get inputClasses(): string {
    return [
      'text-input',
      `text-input--${this.size}`,
      this.icon ? `text-input--with-icon-${this.iconPosition}` : '',
      this.error ? 'text-input--error' : '',
      this.disabled ? 'text-input--disabled' : ''
    ].filter(Boolean).join(' ');
  }

  get characterCount(): string {
    if (!this.showCharacterCount) return '';
    const current = this.value?.length || 0;
    return this.maxLength ? `${current}/${this.maxLength}` : `${current}`;
  }
}
