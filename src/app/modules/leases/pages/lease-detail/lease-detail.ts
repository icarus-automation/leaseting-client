import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type { LeaseBillItem, LeaseDetail, LeaseUtilityBilling } from '../../../../core/models/lease.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, type BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { isPastDue, leaseTermLabel, ordinal } from '../../../../shared/utils/date.util';
import { formatStoredPerSqmRent } from '../../../../shared/utils/per-sqm-quote';
import { leaseStatus } from '../../../../shared/utils/lease-status.util';
import { LeaseUtilityBillingDialog } from '../../components/lease-utility-billing-dialog/lease-utility-billing-dialog';
import { LeasesService } from '../../services/leases.service';

@Component({
  selector: 'app-lease-detail',
  imports: [DatePipe, RouterLink, PIcon, PhpCurrencyPipe, Skeleton, StatusBadge, LeaseUtilityBillingDialog],
  templateUrl: './lease-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaseDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly leases = inject(LeasesService);
  private readonly auth = inject(AuthService);
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

  readonly rentBreakdown = computed(() => {
    const lease = this.lease();
    return lease ? formatStoredPerSqmRent(lease) : null;
  });

  readonly utilities = computed(() => {
    const lease = this.lease();
    if (!lease) return [];
    return [
      { label: 'Electricity', billed: lease.billsElectricity },
      { label: 'Water', billed: lease.billsWater },
    ];
  });

  /** The API refuses changes to a terminated lease. */
  readonly canEditUtilities = computed(() => this.auth.can('leases:manage') && this.lease()?.terminatedAt === null);
  readonly editingUtilities = signal(false);

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

  onUtilitiesSaved(billing: LeaseUtilityBilling): void {
    this.lease.update((lease) => (lease ? { ...lease, ...billing } : lease));
  }

  billStatus(bill: LeaseBillItem): { label: string; tone: BadgeTone } {
    if (bill.status === 'PAID') return { label: 'Paid', tone: 'success' };
    return isPastDue(bill.dueDate)
      ? { label: 'Overdue', tone: 'destructive' }
      : { label: 'Unpaid', tone: 'warning' };
  }
}
