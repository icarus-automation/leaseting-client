import { Routes } from '@angular/router';

export const PROPERTIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./properties').then(m => m.Properties),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/property-detail/property-detail').then(m => m.PropertyDetailPage),
  },
];
