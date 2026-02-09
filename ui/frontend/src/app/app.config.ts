import { ApplicationConfig, APP_INITIALIZER, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { importProvidersFrom } from '@angular/core';

import { routes } from './app.routes';
import { tokenTrackingInterceptorProvider } from './core/interceptors/token-tracking.interceptor';

// Initializer pour la langue par défaut
function initializeTranslation(translate: TranslateService) {
  return () => {
    const savedLang = localStorage.getItem('app-lang') || 'fr';
    translate.setDefaultLang('fr');
    return translate.use(savedLang).toPromise();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    tokenTrackingInterceptorProvider,
    importProvidersFrom(
      TranslateModule.forRoot()
    ),
    provideTranslateHttpLoader({
      prefix: '/assets/i18n/',
      suffix: '.json'
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslation,
      multi: true,
      deps: [TranslateService]
    }
  ]
};
