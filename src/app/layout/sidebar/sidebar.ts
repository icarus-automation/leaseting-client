import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';
import { navLinkIsActive } from './nav-active.util';

export interface NavItem {
  label: string;
  icon: string;
  route?: string;
  href?: string;
  external?: true;
}

export interface NavSection {
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
      { label: 'Tenants',    route: '/tenants',    icon: 'users' },
      { label: 'Leases',     route: '/leases',     icon: 'file-edit' },
      { label: 'Bills',      route: '/bills',      icon: 'wallet' },
      { label: 'Submissions', route: '/bills/submissions', icon: 'inbox' },
    ],
  },
  {
    label: 'Operations',
    type: 'core',
    items: [
      { label: 'Work Orders', route: '/work-orders', icon: 'wrench' },
    ],
  },
  {
    label: 'Analytics',
    type: 'core',
    items: [
      { label: 'Reports',        route: '/reports',        icon: 'chart-bar' },
      { label: 'Knowledge Base', route: '/knowledge-base', icon: 'book' },
    ],
  },
  {
    label: 'Connected Apps',
    type: 'apps',
    items: [
      {
        label: 'Parking',
        href: 'https://parking.leaseting.com',
        icon: 'car',
        external: true,
      },
    ],
  },
];

const SETTINGS_NAV: NavItem = {
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

  isActive(route: string | undefined): boolean {
    return Boolean(route && navLinkIsActive(this.currentUrl(), route));
  }
}
