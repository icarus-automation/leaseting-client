import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'accept-invite',
    loadChildren: () =>
      import('./modules/auth/invite.routes').then(m => m.INVITE_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./modules/home/home.routes').then(m => m.HOME_ROUTES),
      },
      {
        path: 'calendar',
        canActivate: [permissionGuard('leases:view', 'bills:view')],
        loadComponent: () => import('./modules/calendar/calendar').then(m => m.OpsCalendar),
      },
      {
        path: 'kit',
        canActivate: [permissionGuard('kit:use')],
        loadChildren: () => import('./modules/kit/kit.routes').then(m => m.KIT_ROUTES),
      },
      {
        path: 'properties',
        canActivate: [permissionGuard('properties:view')],
        loadChildren: () =>
          import('./modules/properties/properties.routes').then(m => m.PROPERTIES_ROUTES),
      },
      {
        path: 'tenants',
        loadChildren: () =>
          import('./modules/tenants/tenants.routes').then(m => m.TENANTS_ROUTES),
      },
      {
        path: 'leases',
        canActivate: [permissionGuard('leases:view')],
        loadChildren: () =>
          import('./modules/leases/leases.routes').then(m => m.LEASES_ROUTES),
      },
      {
        path: 'bills',
        loadChildren: () =>
          import('./modules/bills/bills.routes').then(m => m.BILLS_ROUTES),
      },
      {
        path: 'work-orders',
        canActivate: [permissionGuard('maintenance_requests:view')],
        loadChildren: () =>
          import('./modules/work-orders/work-orders.routes').then(m => m.WORK_ORDERS_ROUTES),
      },
      { path: 'maintenance', redirectTo: 'work-orders' },
      {
        path: 'parking',
        canActivate: [permissionGuard('parking:view')],
        loadChildren: () =>
          import('./modules/parking/parking.routes').then(m => m.PARKING_ROUTES),
      },
      {
        path: 'knowledge-base',
        data: { contentWidth: 'standard' },
        loadChildren: () =>
          import('./modules/knowledge-base/knowledge-base.routes').then(m => m.KB_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard('reports:view')],
        loadChildren: () =>
          import('./modules/reports/reports.routes').then(m => m.REPORTS_ROUTES),
      },
      {
        path: 'settings',
        data: { contentWidth: 'standard' },
        loadChildren: () =>
          import('./modules/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
      },
      {
        path: 'no-access',
        loadComponent: () => import('./modules/no-access/no-access').then(m => m.NoAccess),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./modules/not-found/not-found').then(m => m.NotFound),
  },
];
