import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';

import { CustomButtonComponent } from '../../shared/components/custom-button/custom-button.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    CustomButtonComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
  ) {
    // Si déjà connecté, rediriger vers home
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  async login(): Promise<void> {
    if (!this.username() || !this.password()) {
      this.errorMessage.set(this.translate.instant('login.errors.fill_fields'));
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const success = await this.authService.login(this.username(), this.password());

      if (success) {
        this.router.navigate(['/home']);
      } else {
        this.errorMessage.set(this.translate.instant('login.errors.invalid_credentials'));
      }
    } catch (error) {
      this.errorMessage.set(this.translate.instant('login.errors.login_failed'));
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.login();
    }
  }
}
