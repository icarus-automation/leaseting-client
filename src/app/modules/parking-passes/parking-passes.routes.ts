import { Routes } from '@angular/router';

export const PARKING_PASS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./parking-passes').then((m) => m.ParkingPasses),
  },
];
