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
  {
    path: 'payment-destinations',
    loadComponent: () =>
      import('./pages/payment-destinations-settings/payment-destinations-settings').then(
        m => m.PaymentDestinationsSettingsPage,
      ),
  },
  {
    path: 'vehicle-types',
    loadComponent: () =>
      import('./pages/vehicle-types-settings/vehicle-types-settings').then(m => m.VehicleTypesSettingsPage),
  },
  {
    path: 'rate-plans',
    loadComponent: () =>
      import('./pages/rate-plans-settings/rate-plans-settings').then(m => m.RatePlansSettingsPage),
  },
  {
    path: 'parking-attendants',
    loadComponent: () =>
      import('./pages/parking-attendants-settings/parking-attendants-settings').then(
        m => m.ParkingAttendantsSettingsPage,
      ),
  },
  { path: '**', redirectTo: '' },
];
