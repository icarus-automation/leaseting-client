import { Routes } from '@angular/router';

export const BILLS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./bills').then(m => m.Bills) },
  { path: 'soa', loadComponent: () => import('./pages/soa-list/soa-list').then(m => m.SoaList) },
  { path: 'utility-run', loadComponent: () => import('./pages/utility-run/utility-run').then(m => m.UtilityRun) },
  {
    path: 'submissions',
    loadComponent: () =>
      import('./pages/payment-submissions/payment-submissions').then(m => m.PaymentSubmissions),
  },
];
