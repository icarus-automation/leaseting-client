import { Routes } from '@angular/router';

export const AUDIT_LOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./audit-log').then((m) => m.AuditLog),
  },
];
