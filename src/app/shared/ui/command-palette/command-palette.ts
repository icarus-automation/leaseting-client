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

import { TenantsService } from '../../../modules/tenants/services/tenants.service';
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
  { id: 'nav-calendar', label: 'Calendar', icon: 'calendar', group: 'Go to', keywords: 'schedule agenda dates lease expiry bills due onboarding move in', route: '/calendar' },
  { id: 'nav-properties', label: 'Properties', icon: 'building', group: 'Go to', keywords: 'buildings portfolio floors units', route: '/properties' },
  { id: 'nav-tenants', label: 'Tenants', icon: 'users', group: 'Go to', keywords: 'people renters residents', route: '/tenants' },
  { id: 'nav-leases', label: 'Leases', icon: 'file-edit', group: 'Go to', keywords: 'contracts agreements rent', route: '/leases' },
  { id: 'nav-bills', label: 'Bills', icon: 'wallet', group: 'Go to', keywords: 'payments charges rent utilities invoices', route: '/bills' },
  { id: 'nav-work-orders', label: 'Work Orders', icon: 'wrench', group: 'Go to', keywords: 'maintenance repairs tickets', route: '/work-orders' },
  { id: 'nav-parking', label: 'Parking Overview', hint: 'Soon', icon: 'car', group: 'Go to', keywords: 'parking monitoring occupancy spaces vehicles guards activity', route: '/parking' },
  { id: 'nav-reports', label: 'Reports', icon: 'chart-bar', group: 'Go to', keywords: 'analytics occupancy export catalog', route: '/reports' },
  { id: 'nav-revenue-by-tenant', label: 'Money In, by Tenant', hint: 'Report', icon: 'users', group: 'Go to', keywords: 'revenue by tenant sales by customer details billed collected ledger', route: '/reports/revenue-by-tenant' },
  { id: 'nav-portfolio-overview', label: 'Portfolio Overview', hint: 'Report', icon: 'chart-bar', group: 'Go to', keywords: 'collections aging occupancy dashboard', route: '/reports/portfolio-overview' },
  { id: 'nav-ar-aging-summary', label: 'Who Owes What', hint: 'Report', icon: 'chart-pie', group: 'Go to', keywords: 'ar aging who owes you receivables arrears overdue buckets by tenant', route: '/reports/ar-aging-summary' },
  { id: 'nav-ar-aging-detail', label: 'Unpaid Bills', hint: 'Report', icon: 'exclamation-circle', group: 'Go to', keywords: 'ar aging detail who owes you unpaid bills overdue days late worklist', route: '/reports/ar-aging-detail' },
  { id: 'nav-delinquency', label: 'Late Payers & Reminders', hint: 'Report', icon: 'bell', group: 'Go to', keywords: 'delinquency late payers chronic sms reminders chase collections', route: '/reports/delinquency' },
  { id: 'nav-kb', label: 'Knowledge Base', icon: 'book', group: 'Go to', keywords: 'articles help docs', route: '/knowledge-base' },
  { id: 'nav-settings', label: 'Settings', icon: 'cog', group: 'Go to', keywords: 'organization team preferences', route: '/settings' },
  { id: 'act-new-property', label: 'New property', hint: 'Create', icon: 'plus', group: 'Actions', keywords: 'add create building register', route: '/properties', queryParams: { create: '1' } },
  { id: 'act-new-tenant', label: 'Onboard tenant', hint: 'Create', icon: 'user-plus', group: 'Actions', keywords: 'add create renter person new tenant onboarding move in', route: '/tenants', queryParams: { create: '1' } },
  { id: 'act-new-bill', label: 'New bill', hint: 'Create', icon: 'plus-circle', group: 'Actions', keywords: 'add create charge rent utility invoice', route: '/bills', queryParams: { create: '1' } },
  { id: 'act-unpaid-bills', label: 'View unpaid bills', hint: 'Filter', icon: 'exclamation-circle', group: 'Actions', keywords: 'overdue outstanding due money', route: '/bills', queryParams: { status: 'UNPAID' } },
];

/**
 * Global ⌘K / Ctrl+K palette: fuzzy navigation (fuse.js), quick create
 * actions, and live tenant search against the API. Keyboard-first per the
 * design principles — the fastest path to any entity or action.
 */
@Component({
  selector: 'app-command-palette',
  imports: [A11yModule, PIcon],
  templateUrl: './command-palette.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPalette {
  private readonly palette = inject(CommandPaletteService);
  private readonly router = inject(Router);
  private readonly tenants = inject(TenantsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fuse = new Fuse(COMMANDS, {
    keys: [
      { name: 'label', weight: 0.7 },
      { name: 'keywords', weight: 0.3 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  });

  readonly isOpen = this.palette.isOpen;
  readonly query = signal('');
  readonly activeIndex = signal(0);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /** Live tenant results for queries of 2+ characters. */
  private readonly tenantResults = toSignal(
    toObservable(this.query).pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) => {
        const trimmed = q.trim();
        if (trimmed.length < 2) return of([]);
        return this.tenants.list({ q: trimmed, limit: 5 }).pipe(
          map((result) => result.data),
        );
      }),
    ),
    { initialValue: [] },
  );

  readonly items = computed<PaletteItem[]>(() => {
    const q = this.query().trim();
    const commands = q ? this.fuse.search(q).map((hit) => hit.item) : COMMANDS;

    const commandItems: PaletteItem[] = commands.map((command) => ({
      id: command.id,
      label: command.label,
      hint: command.hint,
      icon: command.icon,
      group: command.group,
      run: () => void this.router.navigate([command.route], { queryParams: command.queryParams }),
    }));

    const tenantItems: PaletteItem[] = this.tenantResults().map((tenant) => ({
      id: `tenant-${tenant.id}`,
      label: `${tenant.firstName} ${tenant.lastName}`,
      hint: tenant.contactNo,
      icon: 'user',
      group: 'Tenants',
      run: () => void this.router.navigate(['/tenants', tenant.id]),
    }));

    return [...tenantItems, ...commandItems];
  });

  /** Group headers are derived per-row: show when the group changes. */
  showGroupHeader(index: number): boolean {
    const items = this.items();
    return index === 0 || items[index].group !== items[index - 1].group;
  }

  constructor() {
    hotkeys.filter = () => true; // fire inside inputs too — palette is global
    hotkeys('ctrl+k,command+k', (event) => {
      event.preventDefault();
      this.palette.toggle();
    });
    this.destroyRef.onDestroy(() => hotkeys.unbind('ctrl+k,command+k'));

    // Reset when opening. Focus is deferred to onOpenAnimationEnd() — focusing
    // immediately races the 200ms pop-in transform and feels like the input
    // "grabs" you mid-animation. Reduced-motion skips the animation entirely
    // (no animationend to wait for), so focus right away in that case.
    effect(() => {
      if (!this.isOpen()) return;
      this.query.set('');
      this.activeIndex.set(0);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.searchInput()?.nativeElement.focus();
      }
    });

    // Clamp the active row whenever results change.
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
