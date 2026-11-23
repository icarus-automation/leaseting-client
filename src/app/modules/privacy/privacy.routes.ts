import { Routes } from '@angular/router';

/** Public: `/privacy/:slug` opens an organization's current privacy notice, signed in or not. */
export const PRIVACY_ROUTES: Routes = [
  {
    path: ':slug',
    loadComponent: () => import('./public-privacy-notice').then(m => m.PublicPrivacyNoticePage),
  },
];
