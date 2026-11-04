import { Routes } from '@angular/router';

import { permissionGuard } from '../../core/auth/permission.guard';

export const SETTINGS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./settings').then(m => m.Settings) },
  {
    path: 'organization',
    canActivate: [permissionGuard('organization:view')],
    loadComponent: () =>
      import('./pages/organization-settings/organization-settings').then(m => m.OrganizationSettingsPage),
  },
  {
    path: 'users',
    canActivate: [permissionGuard('members:view')],
    loadComponent: () => import('./pages/users-settings/users-settings').then(m => m.UsersSettingsPage),
  },
  {
    path: 'property-types',
    canActivate: [permissionGuard('properties:view')],
    loadComponent: () =>
      import('./pages/property-types-settings/property-types-settings').then(m => m.PropertyTypesSettingsPage),
  },
  {
    path: 'charge-items',
    canActivate: [permissionGuard('bills:view')],
    loadComponent: () =>
      import('./pages/charge-items-settings/charge-items-settings').then(m => m.ChargeItemsSettingsPage),
  },
  {
    path: 'late-fees',
    canActivate: [permissionGuard('bills:view')],
    loadComponent: () =>
      import('./pages/late-fee-settings/late-fee-settings').then(m => m.LateFeeSettingsPage),
  },
  {
    path: 'payment-destinations',
    canActivate: [permissionGuard('payments:view')],
    loadComponent: () =>
      import('./pages/payment-destinations-settings/payment-destinations-settings').then(
        m => m.PaymentDestinationsSettingsPage,
      ),
  },
  {
    path: 'vehicle-types',
    canActivate: [permissionGuard('parking:view')],
    loadComponent: () =>
      import('./pages/vehicle-types-settings/vehicle-types-settings').then(m => m.VehicleTypesSettingsPage),
  },
  {
    path: 'rate-plans',
    canActivate: [permissionGuard('parking:view')],
    loadComponent: () =>
      import('./pages/rate-plans-settings/rate-plans-settings').then(m => m.RatePlansSettingsPage),
  },
  {
    path: 'parking-rules',
    canActivate: [permissionGuard('parking:view')],
    loadComponent: () =>
      import('./pages/parking-rules-settings/parking-rules-settings').then(m => m.ParkingRulesSettingsPage),
  },
  {
    path: 'parking-pass-prices',
    canActivate: [permissionGuard('parking:view')],
    loadComponent: () =>
      import('./pages/parking-pass-prices-settings/parking-pass-prices-settings').then(
        m => m.ParkingPassPricesSettingsPage,
      ),
  },
  {
    path: 'parking-terminals',
    canActivate: [permissionGuard('parking:view')],
    loadComponent: () =>
      import('./pages/parking-terminals-settings/parking-terminals-settings').then(
        m => m.ParkingTerminalsSettingsPage,
      ),
  },
  // Attendants live on Users now; the old address lands on that filter.
  { path: 'parking-attendants', redirectTo: '/settings/users?audience=attendants', pathMatch: 'full' },
  {
    path: 'roles',
    canActivate: [permissionGuard('roles:view')],
    loadComponent: () => import('./pages/roles-settings/roles-settings').then(m => m.RolesSettingsPage),
  },
  {
    path: 'roles/new',
    canActivate: [permissionGuard('roles:view')],
    loadComponent: () =>
      import('./pages/role-editor-settings/role-editor-settings').then(m => m.RoleEditorSettingsPage),
  },
  {
    path: 'roles/:roleId',
    canActivate: [permissionGuard('roles:view')],
    loadComponent: () =>
      import('./pages/role-editor-settings/role-editor-settings').then(m => m.RoleEditorSettingsPage),
  },
  { path: '**', redirectTo: '' },
];
