import { Routes } from '@angular/router';

export const TENANTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./tenants').then(m => m.Tenants) },
  // Before ':id' so "onboarding" is never swallowed as a tenant id.
  {
    path: 'onboarding/:id',
    loadComponent: () => import('./onboarding/onboarding-wizard').then(m => m.OnboardingWizard),
  },
  { path: ':id', loadComponent: () => import('./pages/tenant-detail/tenant-detail').then(m => m.TenantDetailPage) },
];
