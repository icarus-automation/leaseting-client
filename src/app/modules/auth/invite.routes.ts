import { Routes } from '@angular/router';

/** Public: the invitation email links to `/accept-invite?token=…`, signed in or not. */
export const INVITE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./accept-invite/accept-invite').then(m => m.AcceptInvite),
  },
];
