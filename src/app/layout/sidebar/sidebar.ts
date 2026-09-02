import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';
import { navLinkIsActive } from './nav-active.util';

interface InternalNavItem {
  label: string;
  icon: string;
  route: string;
  comingSoon?: true;
  external?: never;
}

interface ExternalNavItem {
  label: string;
  icon: string;
  href: string;
  external: true;
  route?: never;
  comingSoon?: never;
}

type NavItem = InternalNavItem | ExternalNavItem;

interface NavSection {
  label: string;
  type: 'core' | 'apps';
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    type: 'core',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: 'home' },
      { label: 'Ask Kit', route: '/kit', icon: 'comments' },
    ],
  },
  {
    label: 'Management',
    type: 'core',
    items: [
      { label: 'Properties', route: '/properties', icon: 'building' },
      { label: 'Tenants', route: '/tenants', icon: 'users' },
      { label: 'Leases', route: '/leases', icon: 'file-edit' },
      { label: 'Bills', route: '/bills', icon: 'wallet' },
      { label: 'Submissions', route: '/bills/submissions', icon: 'inbox' },
    ],
  },
  {
    label: 'Operations',
    type: 'core',
    items: [
      { label: 'Work Orders', route: '/work-orders', icon: 'wrench' },
      { label: 'Parking Overview', route: '/parking', icon: 'car', comingSoon: true },
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

  readonly sections = NAV_SECTIONS;
  readonly settingsNav = SETTINGS_NAV;
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  isActive(route: string): boolean {
    return navLinkIsActive(this.currentUrl(), route);
  }
}
