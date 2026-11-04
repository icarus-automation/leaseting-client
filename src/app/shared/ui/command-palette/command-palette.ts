import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { A11yModule } from '@angular/cdk/a11y';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import Fuse from 'fuse.js';
import hotkeys from 'hotkeys-js';

import { AuthService } from '../../../core/auth/auth.service';
import type { Permission } from '../../../core/auth/permissions';
import { visibleSettingsGroups } from '../../../modules/settings/settings-nav';
import { ResidentsService } from '../../../modules/residents/services/residents.service';
import { CommandPaletteService } from './command-palette.service';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: 'Go to' | 'Actions';
  keywords: string;
  route: string;
  queryParams?: Record<string, string>;
  /** Every code the destination asks for. Without them the command isn't offered. */
  permissions?: Permission[];
  /** It reaches every property (adding one), so it isn't offered to someone limited to some. */
  needsEveryProperty?: boolean;
}

interface PaletteItem {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: string;
  run: () => void;
}

const COMMANDS: Command[] = [
  { id: 'nav-dashboard', label: 'Dashboard', icon: 'home', group: 'Go to', keywords: 'home overview start', route: '/dashboard' },
  { id: 'nav-calendar', label: 'Calendar', icon: 'calendar', group: 'Go to', keywords: 'schedule agenda dates lease expiry bills due onboarding move in', route: '/calendar', permissions: ['leases:view', 'bills:view'] },
  { id: 'nav-properties', label: 'Properties', icon: 'building', group: 'Go to', keywords: 'buildings portfolio floors units', route: '/properties', permissions: ['properties:view'] },
  { id: 'nav-residents', label: 'Tenants', icon: 'users', group: 'Go to', keywords: 'people renters residents', route: '/residents', permissions: ['residents:view'] },
  { id: 'nav-leases', label: 'Leases', icon: 'file-edit', group: 'Go to', keywords: 'contracts agreements rent', route: '/leases', permissions: ['leases:view'] },
  { id: 'nav-kit', label: 'Ask Kit', icon: 'comments', group: 'Go to', keywords: 'kit chat ask', route: '/kit', permissions: ['kit:use'] },
  { id: 'nav-bills', label: 'Bills', icon: 'wallet', group: 'Go to', keywords: 'payments charges rent utilities invoices', route: '/bills', permissions: ['bills:view'] },
  { id: 'nav-submissions', label: 'Payment submissions', icon: 'inbox', group: 'Go to', keywords: 'payment reviews residence care proof', route: '/bills/submissions', permissions: ['payment_submissions:view'] },
  { id: 'nav-work-orders', label: 'Work Orders', icon: 'wrench', group: 'Go to', keywords: 'maintenance repairs tickets', route: '/work-orders', permissions: ['maintenance_requests:view'] },
  { id: 'nav-parking', label: 'Parking Overview', icon: 'car', group: 'Go to', keywords: 'parking monitoring occupancy spaces vehicles attendants activity void shift cash', route: '/parking', permissions: ['parking:view'] },
  { id: 'nav-parking-passes', label: 'Parking passes', icon: 'ticket', group: 'Go to', keywords: 'monthly pass plate holder renew refund', route: '/parking-passes', permissions: ['parking:view'] },
  { id: 'nav-reports', label: 'Reports', icon: 'chart-bar', group: 'Go to', keywords: 'analytics occupancy export catalog', route: '/reports', permissions: ['reports:view'] },
  { id: 'nav-revenue-by-resident', label: 'Revenue by Tenant', hint: 'Report', icon: 'users', group: 'Go to', keywords: 'revenue by tenant sales by customer details billed collected ledger money in', route: '/reports/revenue-by-resident', permissions: ['reports:view'] },
  { id: 'nav-portfolio-overview', label: 'Portfolio Overview', hint: 'Report', icon: 'chart-bar', group: 'Go to', keywords: 'collections aging occupancy dashboard', route: '/reports/portfolio-overview', permissions: ['reports:view'] },
  { id: 'nav-ar-aging-summary', label: 'AR Aging', hint: 'Report', icon: 'chart-pie', group: 'Go to', keywords: 'ar aging who owes you receivables arrears overdue buckets by tenant', route: '/reports/ar-aging-summary', permissions: ['reports:view'] },
  { id: 'nav-ar-aging-detail', label: 'Unpaid Bills', hint: 'Report', icon: 'exclamation-circle', group: 'Go to', keywords: 'ar aging detail who owes you unpaid bills overdue days late worklist', route: '/reports/ar-aging-detail', permissions: ['reports:view'] },
  { id: 'nav-delinquency', label: 'Delinquency', hint: 'Report', icon: 'bell', group: 'Go to', keywords: 'delinquency late payers chronic sms reminders chase collections', route: '/reports/delinquency', permissions: ['reports:view'] },
  { id: 'nav-kb', label: 'Knowledge Base', icon: 'book', group: 'Go to', keywords: 'articles help docs', route: '/knowledge-base' },
  { id: 'nav-settings', label: 'Settings', icon: 'cog', group: 'Go to', keywords: 'organization team preferences', route: '/settings' },
  { id: 'nav-users', label: 'Users', hint: 'Settings', icon: 'users', group: 'Go to', keywords: 'team staff people members invite roles access deactivate', route: '/settings/users', permissions: ['members:view'] },
  { id: 'nav-audit-log', label: 'Audit log', hint: 'Settings', icon: 'history', group: 'Go to', keywords: 'audit history changes who changed roles invitations property access', route: '/settings/users', queryParams: { tab: 'audit' }, permissions: ['members:view', 'audit_log:view'] },
  { id: 'act-new-property', label: 'New property', hint: 'Create', icon: 'plus', group: 'Actions', keywords: 'add create building register', route: '/properties', queryParams: { create: '1' }, permissions: ['properties:manage'], needsEveryProperty: true },
  { id: 'act-new-resident', label: 'Onboard tenant', hint: 'Create', icon: 'user-plus', group: 'Actions', keywords: 'add create renter person new tenant onboarding move in', route: '/residents', queryParams: { create: '1' }, permissions: ['leases:manage', 'residents:manage'] },
  { id: 'act-new-bill', label: 'New bill', hint: 'Create', icon: 'plus-circle', group: 'Actions', keywords: 'add create charge rent utility invoice', route: '/bills', queryParams: { create: '1' }, permissions: ['bills:manage'] },
  { id: 'act-unpaid-bills', label: 'View unpaid bills', hint: 'Filter', icon: 'exclamation-circle', group: 'Actions', keywords: 'overdue outstanding due money', route: '/bills', queryParams: { status: 'UNPAID' }, permissions: ['bills:view'] },
];

@Component({
  selector: 'app-command-palette',
  imports: [A11yModule, PIcon],
  templateUrl: './command-palette.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPalette {
  private readonly palette = inject(CommandPaletteService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly residents = inject(ResidentsService);
  private readonly destroyRef = inject(DestroyRef);

  /** The commands the session's permissions open; Settings only while one of its pages is open. */
  private readonly commands = computed(() => {
    const showSettings = visibleSettingsGroups((code) => this.auth.can(code)).length > 0;
    return COMMANDS.filter(
      (command) =>
        this.auth.canAll(command.permissions ?? []) &&
        (!command.needsEveryProperty || this.auth.hasEveryProperty()) &&
        (command.id !== 'nav-settings' || showSettings),
    );
  });

  private readonly fuse = computed(
    () =>
      new Fuse(this.commands(), {
        keys: [
          { name: 'label', weight: 0.7 },
          { name: 'keywords', weight: 0.3 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
  );

  private readonly canSearchResidents = computed(() => this.auth.can('residents:view'));

  readonly isOpen = this.palette.isOpen;
  readonly query = signal('');
  readonly activeIndex = signal(0);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly residentResults = toSignal(
    toObservable(this.query).pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) => {
        const trimmed = q.trim();
        if (trimmed.length < 2 || !this.canSearchResidents()) return of([]);
        return this.residents.list({ q: trimmed, limit: 5 }).pipe(
          map((result) => result.data),
        );
      }),
    ),
    { initialValue: [] },
  );

  readonly items = computed<PaletteItem[]>(() => {
    const q = this.query().trim();
    const commands = q ? this.fuse().search(q).map((hit) => hit.item) : this.commands();

    const commandItems: PaletteItem[] = commands.map((command) => ({
      id: command.id,
      label: command.label,
      hint: command.hint,
      icon: command.icon,
      group: command.group,
      run: () => void this.router.navigate([command.route], { queryParams: command.queryParams }),
    }));

    const residentItems: PaletteItem[] = this.residentResults().map((resident) => ({
      id: `resident-${resident.id}`,
      label: `${resident.firstName} ${resident.lastName}`,
      hint: resident.contactNo,
      icon: 'user',
      group: 'Tenants',
      run: () => void this.router.navigate(['/residents', resident.id]),
    }));

    return [...residentItems, ...commandItems];
  });

  showGroupHeader(index: number): boolean {
    const items = this.items();
    return index === 0 || items[index].group !== items[index - 1].group;
  }

  constructor() {
    hotkeys.filter = () => true;
    hotkeys('ctrl+k,command+k', (event) => {
      event.preventDefault();
      this.palette.toggle();
    });
    this.destroyRef.onDestroy(() => hotkeys.unbind('ctrl+k,command+k'));

    effect(() => {
      if (!this.isOpen()) return;
      this.query.set('');
      this.activeIndex.set(0);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.searchInput()?.nativeElement.focus();
      }
    });

    effect(() => {
      const count = this.items().length;
      if (this.activeIndex() >= count) this.activeIndex.set(Math.max(0, count - 1));
    });
  }

  close(): void {
    this.palette.hide();
  }

  onOpenAnimationEnd(event: AnimationEvent): void {
    if (event.animationName !== 'pop-in') return;
    this.searchInput()?.nativeElement.focus();
  }

  onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.activeIndex.set(0);
  }

  onKeydown(event: KeyboardEvent): void {
    const items = this.items();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter': {
        event.preventDefault();
        const item = items[this.activeIndex()];
        if (item) this.execute(item);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  execute(item: PaletteItem): void {
    this.close();
    item.run();
  }
}
