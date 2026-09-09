import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./reports').then(m => m.Reports) },
  {
    path: 'portfolio-overview',
    loadComponent: () =>
      import('./pages/portfolio-overview/portfolio-overview').then(m => m.PortfolioOverview),
  },
  {
    path: 'revenue-by-tenant',
    loadComponent: () =>
      import('./pages/revenue-by-tenant/revenue-by-tenant').then(m => m.RevenueByTenant),
  },
  {
    path: 'ar-aging-summary',
    loadComponent: () =>
      import('./pages/ar-aging-summary/ar-aging-summary').then(m => m.ArAgingSummaryPage),
  },
  {
    path: 'ar-aging-detail',
    loadComponent: () => import('./pages/ar-aging-detail/ar-aging-detail').then(m => m.ArAgingDetailPage),
  },
  {
    path: 'delinquency',
    loadComponent: () => import('./pages/delinquency/delinquency').then(m => m.Delinquency),
  },
  {
    path: 'parking-revenue',
    loadComponent: () => import('./pages/parking-revenue/parking-revenue').then(m => m.ParkingRevenue),
  },
  {
    path: 'shift-cash-variance',
    loadComponent: () =>
      import('./pages/shift-cash-variance/shift-cash-variance').then(m => m.ShiftCashVariance),
  },
  {
    path: 'void-audit',
    loadComponent: () => import('./pages/void-audit/void-audit').then(m => m.VoidAudit),
  },
];
