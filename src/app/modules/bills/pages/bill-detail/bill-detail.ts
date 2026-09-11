import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { BillDetail, UtilityDetail } from '../../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PaymentWorkspace } from '../../components/payment-workspace/payment-workspace';
import { paymentTargetFromRow, type PaymentTarget } from '../../components/payment-workspace/payment-target';
import { BillsService } from '../../services/bills.service';
import { billStatusBadge } from '../../utils/bill-status.util';

@Component({
  selector: 'app-bill-detail',
  imports: [DatePipe, RouterLink, PIcon, PhpCurrencyPipe, Skeleton, StatusBadge, PaymentWorkspace],
  templateUrl: './bill-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly bills = inject(BillsService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly canMutateFinance = inject(AuthService).isFinancialAdmin;

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly bill = signal<BillDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly billTypeLabels = BILL_TYPE_LABELS;

  readonly badge = computed(() => {
    const bill = this.bill();
    return bill ? billStatusBadge(bill) : null;
  });

  readonly target = computed<PaymentTarget | null>(() => {
    const bill = this.bill();
    return bill ? paymentTargetFromRow(bill) : null;
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
    this.bills
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bill) => {
          this.bill.set(bill);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.bill.set(null);
          this.error.set(apiErrorMessage(error, 'Could not load this bill.'));
        },
      });
  }

  refresh(): void {
    const id = this.params().get('id');
    if (!id) return;
    this.bills
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (bill) => this.bill.set(bill),
        error: (error: unknown) => {
          this.toast.add({
            severity: 'error',
            summary: 'Could not refresh bill',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  reload(): void {
    const id = this.params().get('id');
    if (id) this.load(id);
  }

  asPercent(fraction: string): string {
    const value = Number(fraction) * 100;
    if (!Number.isFinite(value)) return fraction;
    return `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
  }

  utilityRows(detail: UtilityDetail): { label: string; value: string }[] {
    const rows: { label: string; value: string }[] = [
      { label: 'Previous reading', value: detail.previousReading },
      { label: 'Present reading', value: detail.presentReading },
      { label: 'Rate', value: detail.multiplier },
    ];
    if (detail.adminFeeRate) rows.push({ label: 'Admin fee', value: this.asPercent(detail.adminFeeRate) });
    rows.push({ label: 'VAT', value: this.asPercent(detail.vatRate) });
    rows.push({ label: 'Withholding tax', value: this.asPercent(detail.whtRate) });
    if (detail.totalBillAmount) rows.push({ label: 'Provider bill', value: detail.totalBillAmount });
    if (detail.totalConsumption) rows.push({ label: 'Provider consumption', value: detail.totalConsumption });
    return rows;
  }
}
