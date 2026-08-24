import { Routes } from '@angular/router';

export const LEASES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./leases').then(m => m.Leases) },
  {
    path: ':id',
    loadComponent: () => import('./pages/lease-detail/lease-detail').then(m => m.LeaseDetailPage),
  },
];
