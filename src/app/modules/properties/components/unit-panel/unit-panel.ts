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
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { KitService } from '../../../../core/kit/kit.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type { BillListItem } from '../../../../core/models/bill.types';
import type { ResaleWarning } from '../../../../core/models/ownership.types';
import type { OwnershipResponse } from '../../../../core/models/ownership.types';
import type { UnitDetail, UnitOutstandingBill } from '../../../../core/models/property.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { isPastDue, leaseTermLabel, ordinal } from '../../../../shared/utils/date.util';
import { unitTone, unitToneLabel } from '../../../../shared/utils/unit-tone.util';
import { RecordPaymentDialog } from '../../../bills/components/record-payment-dialog/record-payment-dialog';
import { LeasesService } from '../../../leases/services/leases.service';
import { OwnershipsService } from '../../../ownerships/services/ownerships.service';
import { OnboardingsService } from '../../../residents/services/onboardings.service';
import { UnitsService } from '../../services/units.service';
import { billFromUnit } from '../../utils/bill-from-unit.util';
import { SellUnitDialog } from '../sell-unit-dialog/sell-unit-dialog';

@Component({
  selector: 'app-unit-panel',
  imports: [DatePipe, PIcon, PhpCurrencyPipe, Skeleton, StatusBadge, RecordPaymentDialog, SellUnitDialog],
  templateUrl: './unit-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitPanel {
  private readonly units = inject(UnitsService);
  private readonly leasesService = inject(LeasesService);
  private readonly ownershipApi = inject(OwnershipsService);
  private readonly kit = inject(KitService);
  private readonly onboardings = inject(OnboardingsService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);

  readonly unitId = input.required<string | null>();
  readonly billsElectricityByDefault = input(true);
  readonly billsWaterByDefault = input(true);
  readonly changed = output<void>();
  readonly editRequested = output<UnitDetail>();
  readonly closeRequested = output<void>();
  readonly archived = output<void>();

  readonly unit = signal<UnitDetail | null>(null);
  readonly ownerships = signal<OwnershipResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly startingOnboarding = signal(false);
  readonly saleDialogVisible = signal(false);
  readonly resaleWarning = signal<ResaleWarning | null>(null);
  readonly paymentDialogVisible = signal(false);
  readonly paymentTarget = signal<BillListItem | null>(null);
  readonly canRecordPayments = computed(() => this.auth.can('payments:record'));
  readonly canViewPayments = computed(() => this.auth.can('payments:view'));
  readonly canManageUnits = computed(() => this.auth.can('units:manage'));
  readonly canManageLeases = computed(() => this.auth.can('leases:manage'));
  /** The onboarding wizard writes the resident as well as the lease. */
  readonly canOnboard = computed(() => this.auth.canAll(['leases:manage', 'residents:manage']));

  readonly billTypeLabels = BILL_TYPE_LABELS;

  readonly statusTone = computed(() => {
    const unit = this.unit();
    return unit ? unitTone(unit) : ('vacant' as const);
  });

  readonly statusLabel = computed(() => {
    const unit = this.unit();
    return unit ? unitToneLabel(unit) : 'Vacant';
  });

  readonly leaseTerm = computed(() => {
    const lease = this.unit()?.activeLease;
    return lease ? leaseTermLabel(lease.startDate, lease.endDate) : null;
  });

  constructor() {
    effect(() => {
      const id = this.unitId();
      if (id) {
        this.resaleWarning.set(null);
        this.fetch(id);
      } else {
        this.unit.set(null);
        this.ownerships.set([]);
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

  openPaymentDialog(bill: UnitOutstandingBill): void {
    const unit = this.unit();
    if (!unit) return;
    const target = billFromUnit(unit, bill);
    if (!target) return;
    this.paymentTarget.set(target);
    this.paymentDialogVisible.set(true);
  }

  onPaymentsChanged(): void {
    this.kit.celebrate();
    this.kit.load();
    this.refetch();
    this.changed.emit();
  }

  openSale(): void {
    this.saleDialogVisible.set(true);
  }

  onSaleSaved(warning: ResaleWarning | null): void {
    this.resaleWarning.set(warning);
    this.refetch();
    this.changed.emit();
  }

  confirmEndLease(): void {
    const lease = this.unit()?.activeLease;
    if (!lease) return;
    this.confirm.danger({
      header: 'End lease',
      message: 'End this lease now? The unit becomes vacant.',
      acceptLabel: 'End lease',
      onAccept: () => {
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
    this.confirm.danger({
      header: 'Archive unit',
      message: `Archive unit ${unit.unitNo}? It disappears from the floor plan and lists.`,
      acceptLabel: 'Archive',
      onAccept: () => {
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
          void this.router.navigate(['/residents/onboarding', onboarding.id]);
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
          if (unit.mode === 'CONDO') this.loadOwnerships(unit.id);
          else this.ownerships.set([]);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load this unit.'));
        },
      });
  }

  private loadOwnerships(unitId: string): void {
    this.ownershipApi
      .list(unitId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.ownerships.set(rows),
        error: () => this.ownerships.set([]),
      });
  }
}
