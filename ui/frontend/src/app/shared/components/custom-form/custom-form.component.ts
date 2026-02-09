import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: any;
  options?: { value: any; label: string }[];
  validators?: any[];
  rows?: number; // Pour textarea
  min?: number; // Pour number
  max?: number; // Pour number
  pattern?: string;
  helpText?: string;
}

export interface FormConfig {
  fields: FormField[];
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
  layout?: 'vertical' | 'horizontal';
}

/**
 * Composant de formulaire personnalisable multi-champs
 *
 * @example
 * ```typescript
 * formConfig: FormConfig = {
 *   fields: [
 *     { name: 'email', label: 'Email', type: 'email', required: true },
 *     { name: 'password', label: 'Mot de passe', type: 'password', required: true },
 *     { name: 'age', label: 'Âge', type: 'number', min: 18, max: 100 }
 *   ],
 *   submitLabel: 'Envoyer',
 *   showReset: true
 * };
 *
 * onFormSubmit(data: any) {
 *   console.log('Form data:', data);
 * }
 * ```
 *
 * ```html
 * <app-custom-form
 *   [config]="formConfig"
 *   (onSubmit)="onFormSubmit($event)">
 * </app-custom-form>
 * ```
 */
@Component({
  selector: 'app-custom-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './custom-form.component.html',
  styleUrls: ['./custom-form.component.scss']
})
export class CustomFormComponent implements OnInit {
  @Input() config!: FormConfig;
  @Output() onSubmit = new EventEmitter<any>();
  @Output() onReset = new EventEmitter<void>();
  @Output() onChange = new EventEmitter<any>();

  form!: FormGroup;
  isSubmitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    const formControls: any = {};

    this.config.fields.forEach(field => {
      const validators = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      if (field.type === 'email') {
        validators.push(Validators.email);
      }

      if (field.min !== undefined) {
        validators.push(Validators.min(field.min));
      }

      if (field.max !== undefined) {
        validators.push(Validators.max(field.max));
      }

      if (field.pattern) {
        validators.push(Validators.pattern(field.pattern));
      }

      if (field.validators) {
        validators.push(...field.validators);
      }

      formControls[field.name] = [
        { value: field.value || '', disabled: field.disabled || false },
        validators
      ];
    });

    this.form = this.fb.group(formControls);

    // Émettre les changements
    this.form.valueChanges.subscribe(value => {
      this.onChange.emit(value);
    });
  }

  handleSubmit(): void {
    if (this.form.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.onSubmit.emit(this.form.value);
      setTimeout(() => this.isSubmitting = false, 500);
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.form.controls).forEach(key => {
        this.form.controls[key].markAsTouched();
      });
    }
  }

  handleReset(): void {
    this.form.reset();
    this.onReset.emit();
  }

  getFieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);

    if (control && control.touched && control.errors) {
      if (control.errors['required']) {
        return 'Ce champ est requis';
      }
      if (control.errors['email']) {
        return 'Email invalide';
      }
      if (control.errors['min']) {
        return `La valeur minimale est ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `La valeur maximale est ${control.errors['max'].max}`;
      }
      if (control.errors['pattern']) {
        return 'Format invalide';
      }
    }

    return null;
  }

  getField(name: string): FormField | undefined {
    return this.config.fields.find(f => f.name === name);
  }
}
