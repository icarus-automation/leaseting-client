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
];
