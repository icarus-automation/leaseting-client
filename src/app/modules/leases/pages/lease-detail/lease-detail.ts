import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type { LeaseBillItem, LeaseDetail } from '../../../../core/models/lease.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, type BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { isPastDue, leaseTermLabel, ordinal } from '../../../../shared/utils/date.util';
import { leaseStatus } from '../../../../shared/utils/lease-status.util';
import { LeasesService } from '../../services/leases.service';

@Component({
  selector: 'app-lease-detail',
  imports: [DatePipe, RouterLink, PIcon, PhpCurrencyPipe, Skeleton, StatusBadge],
  templateUrl: './lease-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaseDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly leases = inject(LeasesService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly lease = signal<LeaseDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly billTypeLabels = BILL_TYPE_LABELS;
  readonly ordinal = ordinal;

  readonly status = computed(() => {
    const lease = this.lease();
    return lease ? leaseStatus(lease) : null;
  });

  readonly term = computed(() => {
    const lease = this.lease();
    return lease ? leaseTermLabel(lease.startDate, lease.endDate) : '';
  });

  constructor() {
    effect(() => {
      const id = this.params().get('id');
      if (id) this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.leases
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lease) => {
          this.lease.set(lease);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load this lease.'));
        },
      });
  }

  reload(): void {
    const id = this.params().get('id');
    if (id) this.load(id);
  }

  billStatus(bill: LeaseBillItem): { label: string; tone: BadgeTone } {
    if (bill.status === 'PAID') return { label: 'Paid', tone: 'success' };
    return isPastDue(bill.dueDate)
      ? { label: 'Overdue', tone: 'destructive' }
      : { label: 'Unpaid', tone: 'warning' };
  }
}
