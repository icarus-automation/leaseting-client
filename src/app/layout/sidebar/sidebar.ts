import { Component, ChangeDetectionStrategy, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../core/auth/auth.service';
import type { Permission } from '../../core/auth/permissions';
import { PendingPaymentSubmissionsService } from '../../core/payment-submissions/pending-payment-submissions.service';
import { OpenRequestsService } from '../../core/work-orders/open-requests.service';
import { visibleSettingsGroups } from '../../modules/settings/settings-nav';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';
import { navLinkIsActive } from './nav-active.util';

type NavCount = 'openWorkOrders' | 'pendingPaymentSubmissions';

interface InternalNavItem {
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

type NavItem = InternalNavItem | ExternalNavItem;

interface NavSection {
  label: string;
  type: 'core' | 'apps';
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
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
      { label: 'Tenants', route: '/tenants', icon: 'users', permissions: ['tenants:view'] },
      { label: 'Leases', route: '/leases', icon: 'file-edit', permissions: ['leases:view'] },
    ],
  },
  {
    label: 'Money',
    type: 'core',
    items: [
      { label: 'Bills', route: '/bills', icon: 'wallet', permissions: ['bills:view'] },
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
    ],
  },
  {
    label: 'Analytics',
    type: 'core',
    items: [
      { label: 'Reports', route: '/reports', icon: 'chart-bar', permissions: ['reports:view'] },
      { label: 'Knowledge Base', route: '/knowledge-base', icon: 'book' },
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

const SETTINGS_NAV: InternalNavItem = {
  label: 'Settings',
  route: '/settings',
  icon: 'cog',
};

@Component({
  selector: 'app-sidebar',
  imports: [BrandLogo, RouterLink, PIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly openRequests = inject(OpenRequestsService);
  private readonly pendingPaymentSubmissions = inject(PendingPaymentSubmissionsService);

  /** Links the session's permissions open; a section with none left is dropped. */
  readonly sections = computed(() =>
    NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => this.auth.canAll(item.permissions ?? [])),
    })).filter((section) => section.items.length > 0),
  );
  readonly settingsNav = SETTINGS_NAV;
  readonly showSettings = computed(() => visibleSettingsGroups((code) => this.auth.can(code)).length > 0);
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    effect(() => {
      this.currentUrl();
      const countWorkOrders = this.auth.can('maintenance_requests:view');
      const countSubmissions = this.auth.can('payment_submissions:view');
      untracked(() => {
        if (countWorkOrders) this.openRequests.refresh();
        if (countSubmissions) this.pendingPaymentSubmissions.refresh();
      });
    });
  }

  isActive(route: string): boolean {
    return navLinkIsActive(this.currentUrl(), route);
  }

  countFor(item: NavItem): number | null {
    switch (item.count) {
      case 'openWorkOrders':
        return this.openRequests.count();
      case 'pendingPaymentSubmissions':
        return this.pendingPaymentSubmissions.count();
      default:
        return null;
    }
  }

  countLabel(item: NavItem): string | null {
    const count = this.countFor(item);
    if (!count) return null;
    switch (item.count) {
      case 'openWorkOrders':
        return `${item.label}, ${count} open`;
      case 'pendingPaymentSubmissions':
        return `${item.label}, ${count} pending review`;
      default:
        return null;
    }
  }
}
