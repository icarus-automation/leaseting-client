import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import type { GridFilters } from '../../core/models/grid-query.types';
import type { LeaseListFilters, LeaseListItem } from '../../core/models/lease.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { NlFilterBar } from '../../shared/ui/nl-filter-bar/nl-filter-bar';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { StatusBadge, BadgeTone } from '../../shared/ui/status-badge/status-badge';
import { daysUntil, isPastDue } from '../../shared/utils/date.util';
import { leaseStatus } from '../../shared/utils/lease-status.util';
import { showPopupMenu } from '../../shared/utils/popup-menu.util';
import { LeasesService } from './services/leases.service';

@Component({
  selector: 'app-leases',
  imports: [
    DatePipe,
    RouterLink,
    PIcon,
    Menu,
    PhpCurrencyPipe,
    EmptyState,
    NlFilterBar,
    Pagination,
    Skeleton,
    StatusBadge,
  ],
  templateUrl: './leases.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Leases {
  private readonly leases = inject(LeasesService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<LeaseListItem[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeOnly = signal(true);

  readonly nlFilters = signal<GridFilters>({});
  readonly isFiltered = computed(() => Object.keys(this.nlFilters()).length > 0);

  readonly skeletons = Array.from({ length: 6 });
  readonly overflowItems = signal<MenuItem[]>([]);
  readonly overflowForId = signal<string | null>(null);
  private readonly overflowMenu = viewChild.required<Menu>('overflowMenu');

  constructor() {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.leases
      .list({
        page,
        limit: 10,
        active: this.activeOnly() ? true : undefined,
        ...(this.nlFilters() as LeaseListFilters),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load leases.'));
        },
      });
  }

  setActiveOnly(active: boolean): void {
    if (this.activeOnly() === active) return;
    this.activeOnly.set(active);
    this.nlFilters.set({});
    this.load(1);
  }

  onFiltersChange(filters: GridFilters): void {
    this.nlFilters.set(filters);
    if (Object.keys(filters).length > 0) this.activeOnly.set(false);
    this.load(1);
  }

  status(lease: LeaseListItem): { label: string; tone: BadgeTone } {
    return leaseStatus(lease);
  }

  daysLeft(lease: LeaseListItem): number | null {
    if (lease.terminatedAt) return null;
    const days = daysUntil(lease.endDate);
    return days >= 0 && days <= 60 ? days : null;
  }

  canTerminate(lease: LeaseListItem): boolean {
    return !lease.terminatedAt && !isPastDue(lease.endDate);
  }

  openOverflow(event: Event, lease: LeaseListItem): void {
    const items: MenuItem[] = [
      {
        label: 'End lease',
        styleClass: 'row-overflow-danger',
        command: () => this.confirmTerminate(lease),
      },
    ];
    this.overflowItems.set(items);
    this.overflowForId.set(lease.id);
    showPopupMenu(this.overflowMenu(), event, items);
  }

  confirmTerminate(lease: LeaseListItem): void {
    this.confirm.danger({
      header: 'End lease',
      message: `End the lease for ${lease.tenant.firstName} ${lease.tenant.lastName} on Unit ${lease.unit.unitNo}? The unit becomes vacant immediately.`,
      acceptLabel: 'End lease',
      onAccept: () => {
        this.leases
          .terminate(lease.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Lease ended' });
              this.load(this.meta()?.page ?? 1);
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Could not end lease',
                detail: apiErrorMessage(error),
              });
            },
          });
      },
    });
  }
}
