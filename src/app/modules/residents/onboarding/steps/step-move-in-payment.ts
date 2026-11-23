import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../../../core/models/enums';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import type {
  DepositStepData,
  LeaseTermsStepData,
  MoveInPaymentStepData,
  OnboardingDetail,
} from '../../../../core/models/onboarding.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { PaymentMethodFields } from '../../../../shared/ui/payment-method-fields/payment-method-fields';
import {
  createPaymentMethodGroup,
  paymentMethodPayload,
} from '../../../../shared/ui/payment-method-fields/payment-method-form';
import { effectiveDestinationsForProperty } from '../../../../shared/utils/payment-destination.util';
import { PaymentDestinationsService } from '../../../settings/services/payment-destinations.service';
import { ResidentsService } from '../../services/residents.service';

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const RECEIPT_LABEL = 'Onboarding · Payment receipt';

@Component({
  selector: 'app-step-move-in-payment',
  imports: [ReactiveFormsModule, PIcon, DatePicker, InputNumber, PaymentMethodFields, PhpCurrencyPipe],
  templateUrl: './step-move-in-payment.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepMoveInPayment {
  private readonly fb = inject(FormBuilder);
  private readonly residents = inject(ResidentsService);
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<MoveInPaymentStepData>();
  readonly back = output<void>();

  readonly acceptedTypes = ACCEPTED_TYPES;

  readonly uploading = signal(false);
  readonly receiptName = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly destinations = signal<PaymentDestinationResponse[]>([]);
  readonly destinationsError = signal<string | null>(null);
  /** The enabled destinations the onboarding unit's property offers. */
  readonly propertyDestinations = computed(() =>
    effectiveDestinationsForProperty(this.destinations(), this.detail().unit?.property.id ?? null),
  );

  readonly terms = computed(() => {
    const stepsState = this.detail().stepsState;
    const terms = stepsState['lease-terms']?.data as LeaseTermsStepData | undefined;
    const deposit = stepsState.deposit?.data as DepositStepData | undefined;
    if (!terms || !deposit) return null;

    const monthlyRent = (terms.charges ?? []).reduce((total, charge) => total + charge.amount, 0);
    const advanceMonths = deposit.collectsAdvance ? deposit.advanceMonths : 0;
    const depositMonths = deposit.holdsDeposit ? deposit.depositMonths : 0;
    return {
      advanceMonths,
      depositMonths,
      advanceDue: monthlyRent * advanceMonths,
      depositDue: monthlyRent * depositMonths,
    };
  });

  readonly form = this.fb.nonNullable.group({
    advanceAmount: [0, [Validators.required, Validators.min(0)]],
    depositAmount: [0, [Validators.required, Validators.min(0)]],
    paidOn: [new Date(), [Validators.required]],
    payment: createPaymentMethodGroup(),
    referenceNo: ['', [Validators.maxLength(80)]],
    notes: ['', [Validators.maxLength(2000)]],
  });

  readonly errors = createFormErrors(this.form);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  constructor() {
    this.destinationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.destinations.set(rows),
        error: (error: unknown) =>
          this.destinationsError.set(apiErrorMessage(error, 'Could not load payment destinations.')),
      });

    effect(() => {
      const detail = this.detail();
      untracked(() => this.prefill(detail));
    });
  }

  attachReceipt(): void {
    this.fileInput().nativeElement.click();
  }

  onFilePicked(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage.set('That file is over 10 MB. Upload a smaller scan.');
      return;
    }
    const resident = this.detail().resident;
    if (!resident) {
      this.errorMessage.set('Complete the resident step first.');
      return;
    }

    this.errorMessage.set(null);
    this.uploading.set(true);
    this.residents
      .uploadDocument(resident.id, file, RECEIPT_LABEL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (document) => {
          this.uploading.set(false);
          this.receiptName.set(document.fileName);
        },
        error: (error: unknown) => {
          this.uploading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'The upload did not go through. Try again.'));
        },
      });
  }

  submit(): void {
    this.errorMessage.set(null);
    this.errors.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { advanceAmount, depositAmount, paidOn, payment, referenceNo, notes } = this.form.getRawValue();

    const terms = this.terms();
    if (terms && (advanceAmount > terms.advanceDue || depositAmount > terms.depositDue)) {
      this.errorMessage.set('That is more than what has been billed. Lower the payment, or adjust the lease terms.');
      return;
    }

    this.next.emit({
      advanceAmount,
      depositAmount,
      paidOn: formatDate(paidOn, 'yyyy-MM-dd', 'en-US'),
      ...paymentMethodPayload(payment),
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  private prefill(detail: OnboardingDetail): void {
    const saved = detail.stepsState['move-in-payment']?.data as Partial<MoveInPaymentStepData> | undefined;
    if (saved) {
      this.form.patchValue({
        advanceAmount: saved.advanceAmount ?? 0,
        depositAmount: saved.depositAmount ?? 0,
        paidOn: saved.paidOn ? new Date(saved.paidOn) : new Date(),
        payment: {
          method: currentMethod(saved.method),
          destinationId: saved.destinationId ?? '',
          checkNumber: saved.checkNumber ?? '',
          checkBank: saved.checkBank ?? '',
          checkDate: saved.checkDate ? new Date(saved.checkDate) : null,
        },
        referenceNo: saved.referenceNo ?? '',
        notes: saved.notes ?? '',
      });
      return;
    }
    const terms = this.terms();
    if (terms) {
      this.form.patchValue({ advanceAmount: terms.advanceDue, depositAmount: terms.depositDue });
    }
  }
}

/**
 * A draft saved before Cash, Check, and Online can hold an old method. Bank transfer,
 * GCash, and Other were money sent online, so they reopen as Online with no destination.
 */
function currentMethod(saved: string | undefined): PaymentMethod {
  if (!saved) return 'CASH';
  return saved in PAYMENT_METHOD_LABELS ? (saved as PaymentMethod) : 'ONLINE';
}
