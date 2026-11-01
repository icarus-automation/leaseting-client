import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission.guard';

export const RESIDENTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard('residents:view')],
    loadComponent: () => import('./residents').then(m => m.Residents),
  },
  {
    path: 'onboarding/:id',
    // The wizard writes the resident and their documents as well as the lease.
    canActivate: [permissionGuard('leases:manage', 'residents:manage')],
    data: { contentWidth: 'standard' },
    loadComponent: () => import('./onboarding/onboarding-wizard').then(m => m.OnboardingWizard),
  },
  {
    path: ':id',
    canActivate: [permissionGuard('residents:view')],
    loadComponent: () => import('./pages/resident-detail/resident-detail').then(m => m.ResidentDetailPage),
  },
];
