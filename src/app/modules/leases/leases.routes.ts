import { Routes } from '@angular/router';

export const LEASES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./leases').then(m => m.Leases) },
];
