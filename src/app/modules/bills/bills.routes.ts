import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission.guard';

export const BILLS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard('bills:view')],
    loadComponent: () => import('./bills').then(m => m.Bills),
  },
  {
    path: 'soa',
    canActivate: [permissionGuard('soa:view')],
    loadComponent: () => import('./pages/soa-list/soa-list').then(m => m.SoaList),
  },
  {
    path: 'utility-run',
    canActivate: [permissionGuard('bills:manage')],
    loadComponent: () => import('./pages/utility-run/utility-run').then(m => m.UtilityRun),
  },
  {
    path: 'submissions',
    canActivate: [permissionGuard('payment_submissions:view')],
    loadComponent: () =>
      import('./pages/payment-submissions/payment-submissions').then(m => m.PaymentSubmissions),
  },
  {
    path: ':id',
    canActivate: [permissionGuard('bills:view')],
    loadComponent: () => import('./pages/bill-detail/bill-detail').then(m => m.BillDetailPage),
  },
];
