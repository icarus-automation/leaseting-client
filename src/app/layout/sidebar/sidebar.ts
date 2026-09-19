import { Component, ChangeDetectionStrategy, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { PendingPaymentSubmissionsService } from '../../core/payment-submissions/pending-payment-submissions.service';
import { OpenRequestsService } from '../../core/work-orders/open-requests.service';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';
import { navLinkIsActive } from './nav-active.util';

type NavCount = 'openWorkOrders' | 'pendingPaymentSubmissions';

interface InternalNavItem {
  label: string;
  icon: string;
  route: string;
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
      { label: 'Calendar', route: '/calendar', icon: 'calendar' },
      { label: 'Ask Kit', route: '/kit', icon: 'comments' },
    ],
  },
  {
    label: 'Portfolio',
    type: 'core',
    items: [
      { label: 'Properties', route: '/properties', icon: 'building' },
      { label: 'Tenants', route: '/tenants', icon: 'users' },
      { label: 'Leases', route: '/leases', icon: 'file-edit' },
    ],
  },
  {
    label: 'Money',
    type: 'core',
    items: [
      { label: 'Bills', route: '/bills', icon: 'wallet' },
      {
        label: 'Payment submissions',
        route: '/bills/submissions',
        icon: 'inbox',
        count: 'pendingPaymentSubmissions',
      },
    ],
  },
  {
    label: 'Operations',
    type: 'core',
    items: [
      { label: 'Work Orders', route: '/work-orders', icon: 'wrench', count: 'openWorkOrders' },
      { label: 'Parking Overview', route: '/parking', icon: 'car' },
    ],
  },
  {
    label: 'Analytics',
    type: 'core',
    items: [
      { label: 'Reports', route: '/reports', icon: 'chart-bar' },
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
  private readonly openRequests = inject(OpenRequestsService);
  private readonly pendingPaymentSubmissions = inject(PendingPaymentSubmissionsService);

  readonly sections = NAV_SECTIONS;
  readonly settingsNav = SETTINGS_NAV;
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
      untracked(() => {
        this.openRequests.refresh();
        this.pendingPaymentSubmissions.refresh();
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
