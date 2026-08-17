import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { KitService } from '../../../../core/kit/kit.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type { UnitDetail, UnitOutstandingBill } from '../../../../core/models/property.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { isPastDue, leaseTermLabel, ordinal } from '../../../../shared/utils/date.util';
import { unitTone, unitToneLabel } from '../../../../shared/utils/unit-tone.util';
import { BillsService } from '../../../bills/services/bills.service';
import { LeasesService } from '../../../leases/services/leases.service';
import { OnboardingsService } from '../../../tenants/services/onboardings.service';
import { UnitsService } from '../../services/units.service';

@Component({
  selector: 'app-unit-panel',
  imports: [DatePipe, PIcon, PhpCurrencyPipe, Skeleton, StatusBadge],
  templateUrl: './unit-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitPanel {
  private readonly units = inject(UnitsService);
  private readonly leasesService = inject(LeasesService);
  private readonly bills = inject(BillsService);
  private readonly kit = inject(KitService);
  private readonly onboardings = inject(OnboardingsService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly unitId = input.required<string | null>();
  /** Any mutation that changes floor colors / summaries happened. */
  readonly changed = output<void>();
  readonly editRequested = output<UnitDetail>();
  readonly closeRequested = output<void>();
  readonly archived = output<void>();

  readonly unit = signal<UnitDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly startingOnboarding = signal(false);

  readonly billTypeLabels = BILL_TYPE_LABELS;

  readonly statusTone = computed(() => {
    const unit = this.unit();
    return unit ? unitTone(unit) : ('vacant' as const);
  });

  readonly statusLabel = computed(() => {
    const unit = this.unit();
    return unit ? unitToneLabel(unit) : 'Vacant';
  });

  /** Lease term derived client-side from start/end dates, e.g. "5 years". */
  readonly leaseTerm = computed(() => {
    const lease = this.unit()?.activeLease;
    return lease ? leaseTermLabel(lease.startDate, lease.endDate) : null;
  });

  constructor() {
    effect(() => {
      const id = this.unitId();
      if (id) {
        this.fetch(id);
      } else {
        this.unit.set(null);
        this.error.set(null);
      }
    });
  }

  refetch(): void {
    const id = this.unitId();
    if (id) this.fetch(id);
  }

  readonly ordinal = ordinal;

  isOverdue(bill: UnitOutstandingBill): boolean {
    return isPastDue(bill.dueDate);
  }

  markPaid(bill: UnitOutstandingBill): void {
    this.confirmation.confirm({
      header: 'Mark bill paid',
      message: `Mark this ${BILL_TYPE_LABELS[bill.type]} bill as paid?`,
      acceptButtonProps: { label: 'Mark paid' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.bills
          .pay(bill.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Bill marked paid' });
              // Kit reacts to the action, then re-reads what's left to worry
              // about — the celebration is transient and never persisted.
              this.kit.celebrate();
              this.kit.load();
              this.refetch();
              this.changed.emit();
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Could not mark as paid',
                detail: apiErrorMessage(error),
              });
            },
          });
      },
    });
  }

  confirmEndLease(): void {
    const lease = this.unit()?.activeLease;
    if (!lease) return;
    this.confirmation.confirm({
      header: 'End lease',
      message: 'End this lease now? The unit becomes vacant.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'End lease', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.leasesService
          .terminate(lease.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Lease ended' });
              this.refetch();
              this.changed.emit();
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

  confirmArchive(): void {
    const unit = this.unit();
    if (!unit) return;
    this.confirmation.confirm({
      header: 'Archive unit',
      message: `Archive unit ${unit.unitNo}? It disappears from the floor plan and lists.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Archive', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.units
          .archive(unit.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Unit archived' });
              this.archived.emit();
              this.changed.emit();
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Cannot archive',
                detail: apiErrorMessage(error, 'This unit still has an active lease.'),
              });
            },
          });
      },
    });
  }

  /** Guided move-in — the only way tenants get a lease. */
  startOnboarding(): void {
    const unit = this.unit();
    if (!unit) return;
    this.startingOnboarding.set(true);
    this.onboardings
      .create({ unitId: unit.id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (onboarding) => {
          this.startingOnboarding.set(false);
          void this.router.navigate(['/tenants/onboarding', onboarding.id]);
        },
        error: (error: unknown) => {
          this.startingOnboarding.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not start onboarding',
            detail: apiErrorMessage(error, 'Try again.'),
          });
        },
      });
  }

  private fetch(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.units
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (unit) => {
          this.unit.set(unit);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load this unit.'));
        },
      });
  }
}
