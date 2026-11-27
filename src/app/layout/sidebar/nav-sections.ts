import type { Permission } from '../../core/auth/permissions';
import { DOCS_URL } from '../../core/config/docs';
import { visibleSettingsGroups } from '../../modules/settings/settings-nav';

/** The staff app's sidebar: its sections, their pages, and the permissions each page needs. */
export type NavCount = 'openWorkOrders' | 'pendingPaymentSubmissions';

export interface InternalNavItem {
  label: string;
  icon: string;
  route: string;
  /** Every code the page's route asks for. Without them the link is hidden. */
  permissions?: Permission[];
  comingSoon?: true;
  count?: NavCount;
  external?: never;
}

interface ExternalNavItem {
  label: string;
  icon: string;
  href: string;
  external: true;
  route?: never;
  permissions?: never;
  comingSoon?: never;
  count?: never;
}

export type NavItem = InternalNavItem | ExternalNavItem;

export interface NavSection {
  label: string;
  type: 'core' | 'apps';
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Today',
    type: 'core',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: 'home' },
      { label: 'Calendar', route: '/calendar', icon: 'calendar', permissions: ['leases:view', 'bills:view'] },
      { label: 'Ask Kit', route: '/kit', icon: 'comments', permissions: ['kit:use'] },
    ],
  },
  {
    label: 'Portfolio',
    type: 'core',
    items: [
      { label: 'Properties', route: '/properties', icon: 'building', permissions: ['properties:view'] },
      { label: 'Tenants', route: '/residents', icon: 'users', permissions: ['residents:view'] },
      { label: 'Leases', route: '/leases', icon: 'file-edit', permissions: ['leases:view'] },
    ],
  },
  {
    label: 'Money',
    type: 'core',
    items: [
      { label: 'Bills', route: '/bills', icon: 'wallet', permissions: ['bills:view'] },
      { label: 'Statements', route: '/bills/soa', icon: 'receipt', permissions: ['soa:view'] },
      {
        label: 'Payment submissions',
        route: '/bills/submissions',
        icon: 'inbox',
        permissions: ['payment_submissions:view'],
        count: 'pendingPaymentSubmissions',
      },
    ],
  },
  {
    label: 'Operations',
    type: 'core',
    items: [
      {
        label: 'Work Orders',
        route: '/work-orders',
        icon: 'wrench',
        permissions: ['maintenance_requests:view'],
        count: 'openWorkOrders',
      },
      { label: 'Parking Overview', route: '/parking', icon: 'car', permissions: ['parking:view'] },
      { label: 'Parking passes', route: '/parking-passes', icon: 'ticket', permissions: ['parking:view'] },
    ],
  },
  {
    label: 'Analytics',
    type: 'core',
    items: [
      { label: 'Reports', route: '/reports', icon: 'chart-bar', permissions: ['reports:view'] },
      { label: 'Audit log', route: '/audit-log', icon: 'history', permissions: ['audit_log:view'] },
      { label: 'Knowledge Base', href: DOCS_URL, icon: 'book', external: true },
    ],
  },
  {
    label: 'Connected Apps',
    type: 'apps',
    items: [
      {
        label: 'Website CMS',
        href: 'https://admin.aleeviacarterresidences.com/',
        icon: 'globe',
        external: true,
      },
    ],
  },
];

export const SETTINGS_NAV: InternalNavItem = {
  label: 'Settings',
  route: '/settings',
  icon: 'cog',
};

/**
 * The sidebar page at `route`, Settings included, or null for any other route.
 * Kit's app chips draw a page with its own icon and label from here.
 */
export function findNavPage(route: string): InternalNavItem | null {
  if (route === SETTINGS_NAV.route) return SETTINGS_NAV;
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      if (!item.external && item.route === route) return item;
    }
  }
  return null;
}

/**
 * Whether a session holding `can` may open the sidebar page at `route`: the
 * same rule that shows its link. Settings opens with any card it can show.
 */
export function canOpenNavPage(route: string, can: (code: Permission) => boolean): boolean {
  if (route === SETTINGS_NAV.route) return visibleSettingsGroups(can).length > 0;
  const page = findNavPage(route);
  return page !== null && (page.permissions ?? []).every(can);
}
