import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./settings').then(m => m.Settings) },
  {
    path: 'property-types',
    loadComponent: () =>
      import('./pages/property-types-settings/property-types-settings').then(m => m.PropertyTypesSettingsPage),
  },
  {
    path: 'charge-items',
    loadComponent: () =>
      import('./pages/charge-items-settings/charge-items-settings').then(m => m.ChargeItemsSettingsPage),
  },
  { path: '**', redirectTo: '' },
];
