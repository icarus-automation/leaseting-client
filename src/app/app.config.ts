import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';

import { routes } from './app.routes';
import { AppPreset } from './app.preset';
import {
  credentialsInterceptor,
  envelopeInterceptor,
  sessionExpiredInterceptor,
} from './core/http/api.interceptors';
import { cacheInterceptor } from './core/http/cache.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      // cacheInterceptor is last so it sits innermost: it stores the raw
      // enveloped body and replays it back out through envelopeInterceptor,
      // making a cache hit indistinguishable from a live response.
      withInterceptors([
        credentialsInterceptor,
        envelopeInterceptor,
        sessionExpiredInterceptor,
        cacheInterceptor,
      ]),
    ),
    MessageService,
    ConfirmationService,
    providePrimeNG({
      // Keep overlays (selects, datepickers) ABOVE modal drawers/dialogs —
      // PrimeNG's defaults put overlay (1000) under modal (1100), which made
      // dropdowns inside drawers unclickable. Mirrors the --z-* scale in styles.css.
      zIndex: {
        modal: 1300,
        overlay: 1400,
        menu: 1400,
        tooltip: 1500,
      },
      theme: {
        preset: AppPreset,
        options: {
          darkModeSelector: '.p-dark',
          cssLayer: {
            name: 'primeng',
            order: 'base, primeng, utilities',
          },
        },
      },
    }),
  ],
};
