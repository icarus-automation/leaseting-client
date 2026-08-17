import { Routes } from '@angular/router';

export const WORK_ORDERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./work-orders').then(m => m.WorkOrders) },
];
