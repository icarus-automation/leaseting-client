import { NgOptimizedImage } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

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
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, PIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly sections = NAV_SECTIONS;
  readonly settingsNav = SETTINGS_NAV;
}
