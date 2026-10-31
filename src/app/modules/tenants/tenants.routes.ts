import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission.guard';

export const TENANTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard('tenants:view')],
    loadComponent: () => import('./tenants').then(m => m.Tenants),
  },
  {
    path: 'onboarding/:id',
    // The wizard writes the tenant and their documents as well as the lease.
    canActivate: [permissionGuard('leases:manage', 'tenants:manage')],
    data: { contentWidth: 'standard' },
    loadComponent: () => import('./onboarding/onboarding-wizard').then(m => m.OnboardingWizard),
  },
  {
    path: ':id',
    canActivate: [permissionGuard('tenants:view')],
    loadComponent: () => import('./pages/tenant-detail/tenant-detail').then(m => m.TenantDetailPage),
  },
];
