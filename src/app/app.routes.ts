import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadChildren: () =>
      import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES),
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
        loadComponent: () => import('./modules/calendar/calendar').then(m => m.OpsCalendar),
      },
      {
        path: 'kit',
        loadChildren: () => import('./modules/kit/kit.routes').then(m => m.KIT_ROUTES),
      },
      {
        path: 'properties',
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
        loadChildren: () =>
          import('./modules/work-orders/work-orders.routes').then(m => m.WORK_ORDERS_ROUTES),
      },
      { path: 'maintenance', redirectTo: 'work-orders' },
      {
        path: 'parking',
        loadChildren: () =>
          import('./modules/parking/parking.routes').then(m => m.PARKING_ROUTES),
      },
      {
        path: 'knowledge-base',
        loadChildren: () =>
          import('./modules/knowledge-base/knowledge-base.routes').then(m => m.KB_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./modules/reports/reports.routes').then(m => m.REPORTS_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./modules/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./modules/not-found/not-found').then(m => m.NotFound),
  },
];
