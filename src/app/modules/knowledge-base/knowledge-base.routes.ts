import { Routes } from '@angular/router';

export const KB_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./knowledge-base').then(m => m.KnowledgeBase) },
  {
    path: 'utility-billing',
    loadComponent: () =>
      import('./articles/utility-billing/utility-billing').then(m => m.UtilityBillingGuide),
  },
];
