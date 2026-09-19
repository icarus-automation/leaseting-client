import { Routes } from '@angular/router';

export const KIT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./kit-chat').then((m) => m.KitChat) },
  { path: 'usage', loadComponent: () => import('./kit-usage').then((m) => m.KitUsage) },
  { path: ':id', loadComponent: () => import('./kit-chat').then((m) => m.KitChat) },
];
