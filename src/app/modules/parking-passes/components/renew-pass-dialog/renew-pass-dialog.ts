import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ParkingPass } from '../../../../core/models/parking-pass.types';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PaymentDestinationsService } from '../../../settings/services/payment-destinations.service';
import { ParkingPassesService } from '../../services/parking-passes.service';
import { destinationIdFromPayment, formatPassDay, passPaymentOptions } from '../../utils/parking-pass.util';

@Component({
  selector: 'app-renew-pass-dialog',
  imports: [ReactiveFormsModule, Select, ErrorBanner, FormDialog],
  templateUrl: './renew-pass-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenewPassDialog {
  private readonly fb = inject(FormBuilder);
  private readonly passes = inject(ParkingPassesService);
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly pass = input<ParkingPass | null>(null);
  readonly saved = output<void>();

  readonly destinations = signal<PaymentDestinationResponse[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ payment: ['cash', Validators.required] });
  readonly errors = createFormErrors(this.form);

  readonly paymentOptions = computed(() => passPaymentOptions(this.destinations(), this.pass()?.propertyId ?? ''));
  readonly paidThrough = computed(() => {
    const paidUntil = this.pass()?.paidUntil;
    return paidUntil ? formatPassDay(paidUntil) : '';
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.form.reset({ payment: 'cash' });
        this.error.set(null);
        this.errors.reset();
        if (this.destinations().length > 0) return;
        this.destinationsApi
          .list()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (rows) => this.destinations.set(rows),
            error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load payment destinations.')),
          });
      });
    });
  }

  submit(): void {
    const pass = this.pass();
    if (!pass || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.passes
      .renew(pass.id, { destinationId: destinationIdFromPayment(this.form.controls.payment.value) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(error, 'Could not renew the pass.'));
        },
      });
  }
}
