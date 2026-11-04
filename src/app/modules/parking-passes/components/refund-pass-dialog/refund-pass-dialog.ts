import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import type { ParkingPass } from '../../../../core/models/parking-pass.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { formatPhp } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ParkingPassesService } from '../../services/parking-passes.service';
import {
  BILL_PAID_REFUND_MESSAGE,
  formatPassDay,
  paymentRemainingCents,
  paymentsWithRemainder,
  refundErrorMessage,
} from '../../utils/parking-pass.util';

@Component({
  selector: 'app-refund-pass-dialog',
  imports: [ReactiveFormsModule, PIcon, Select, ErrorBanner, FormDialog],
  templateUrl: './refund-pass-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundPassDialog {
  private readonly fb = inject(FormBuilder);
  private readonly passes = inject(ParkingPassesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly pass = input<ParkingPass | null>(null);
  readonly saved = output<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.group({
    paymentId: this.fb.nonNullable.control('', Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    reason: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]),
  });
  readonly errors = createFormErrors(this.form);

  /** Every month with money left. A month paid through a bill is listed so staff see why it can't be refunded. */
  readonly paymentOptions = computed(() => {
    const pass = this.pass();
    if (!pass) return [];
    return paymentsWithRemainder(pass).map((payment) => {
      const range = `${formatPassDay(payment.periodStart)} to ${formatPassDay(payment.periodEnd)}`;
      const billPaid = payment.billId !== null;
      return {
        value: payment.id,
        billPaid,
        label: billPaid
          ? `${range} · paid through a bill`
          : `${range} · ${formatPhp(paymentRemainingCents(payment) / 100)} left`,
      };
    });
  });

  private readonly selectedPaymentId = toSignal(this.form.controls.paymentId.valueChanges, {
    initialValue: this.form.controls.paymentId.value,
  });

  /** Shown in place of the form's action when the picked month was paid through a bill. */
  readonly billPaidNotice = computed(() => {
    const option = this.paymentOptions().find((row) => row.value === this.selectedPaymentId());
    return option?.billPaid ? BILL_PAID_REFUND_MESSAGE : null;
  });

  constructor() {
    effect(() => {
      const options = this.paymentOptions();
      if (!this.visible()) return;
      untracked(() => {
        const first = options.find((option) => !option.billPaid) ?? options[0];
        this.form.reset({ paymentId: first?.value ?? '', amount: null, reason: '' });
        this.error.set(null);
        this.errors.reset();
      });
    });
  }

  submit(): void {
    this.errors.submitted.set(true);
    if (this.billPaidNotice()) return;
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const { paymentId, amount, reason } = this.form.getRawValue();
    if (amount === null) return;
    this.saving.set(true);
    this.error.set(null);
    this.passes
      .refund(paymentId, Math.round(amount * 100) / 100, reason.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(refundErrorMessage(error));
        },
      });
  }
}
