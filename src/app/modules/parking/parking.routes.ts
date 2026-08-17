import { Routes } from '@angular/router';

export const PARKING_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./parking').then(m => m.Parking) },
];
