import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import type { LeaseListItem } from '../../core/models/lease.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { StatusBadge, BadgeTone } from '../../shared/ui/status-badge/status-badge';
import { daysUntil, isPastDue } from '../../shared/utils/date.util';
import { leaseStatus } from '../../shared/utils/lease-status.util';
import { LeasesService } from './services/leases.service';

@Component({
  selector: 'app-leases',
  imports: [DatePipe, RouterLink, PIcon, PhpCurrencyPipe, EmptyState, Pagination, Skeleton, StatusBadge],
  templateUrl: './leases.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Leases {
  private readonly leases = inject(LeasesService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<LeaseListItem[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeOnly = signal(true);

  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.leases
      .list({ page, limit: 10, active: this.activeOnly() ? true : undefined })
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
    this.load(1);
  }

  status(lease: LeaseListItem): { label: string; tone: BadgeTone } {
    return leaseStatus(lease);
  }

  /** Days until the lease ends — used to surface "expiring soon" inline. */
  daysLeft(lease: LeaseListItem): number | null {
    if (lease.terminatedAt) return null;
    const days = daysUntil(lease.endDate);
    return days >= 0 && days <= 60 ? days : null;
  }

  canTerminate(lease: LeaseListItem): boolean {
    return !lease.terminatedAt && !isPastDue(lease.endDate);
  }

  confirmTerminate(lease: LeaseListItem): void {
    this.confirmation.confirm({
      header: 'End lease',
      message: `End the lease for Unit ${lease.unit.unitNo} (${lease.tenant.firstName} ${lease.tenant.lastName})? The unit becomes vacant immediately.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'End lease', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
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
