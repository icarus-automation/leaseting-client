import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../../core/config/api';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { BillListItem, PaymentResponse } from '../../../../core/models/bill.types';
import {
  BILL_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_SOURCE_LABELS,
  PaymentMethod,
} from '../../../../core/models/enums';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { ReasonDialog } from '../../../../shared/ui/reason-dialog/reason-dialog';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PaymentDestinationsService } from '../../../settings/services/payment-destinations.service';
import { BillsService } from '../../services/bills.service';
import { collectionMemoError } from '../../utils/collection-memo.util';
import { finiteAmount } from '../../utils/payment-amount.util';
import {
  staffCollectionMethodHint,
  staffCollectionMethodOptions,
} from '../../utils/staff-collection-methods.util';

const ACCEPTED_RECEIPT_TYPES = 'image/png,image/jpeg,image/webp';
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/**
 * Staff collection: amount, date, method, and a required collection memo.
 * Optional photo proof. Confirmed payments are voided, never deleted.
 */
@Component({
  selector: 'app-record-payment-dialog',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PIcon,
    DatePicker,
    InputNumber,
    Select,
    PhpCurrencyPipe,
    ErrorBanner,
    FormDialog,
    PrivateImage,
    ReasonDialog,
    StatusBadge,
  ],
  templateUrl: './record-payment-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordPaymentDialog {
  private readonly fb = inject(FormBuilder);
  private readonly bills = inject(BillsService);
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly bill = input<BillListItem | null>(null);
  /** Any recorded/voided payment — parent reloads its list. */
  readonly changed = output<void>();

  readonly methodLabels = PAYMENT_METHOD_LABELS;
  readonly sourceLabels = PAYMENT_SOURCE_LABELS;
  readonly billTypeLabels = BILL_TYPE_LABELS;
  readonly acceptedReceiptTypes = ACCEPTED_RECEIPT_TYPES;
  readonly canMutate = this.auth.isFinancialAdmin;

  readonly form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paidOn: [null as Date | null, [Validators.required]],
    method: ['CASH' as PaymentMethod, [Validators.required]],
    referenceNo: [''],
    notes: ['', [Validators.required, Validators.minLength(1)]],
  });
  readonly errors = createFormErrors(this.form);

  readonly payments = signal<PaymentResponse[]>([]);
  readonly balance = signal<string>('0');
  readonly paidAmount = signal<string>('0');
  readonly billedAmount = signal<string>('0');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly voidingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly receipt = signal<File | null>(null);
  readonly receiptError = signal<string | null>(null);
  readonly destinations = signal<PaymentDestinationResponse[]>([]);
  readonly destinationsError = signal<string | null>(null);
  readonly voidTarget = signal<PaymentResponse | null>(null);
  readonly voidDialogVisible = signal(false);
  readonly proofPaymentId = signal<string | null>(null);

  readonly heading = computed(() => {
    const bill = this.bill();
    if (!bill) return 'Record payment';
    return `Record payment · ${BILL_TYPE_LABELS[bill.type]}`;
  });
  readonly subheading = computed(() => {
    const bill = this.bill();
    if (!bill) return null;
    const tenant = bill.lease.tenant;
    return `${tenant.firstName} ${tenant.lastName} · Unit ${bill.lease.unit.unitNo}`;
  });
  readonly proofUrl = computed(() => {
    const id = this.proofPaymentId();
    return id ? `${API_BASE_URL}/payments/${id}/proof` : null;
  });
  readonly methodOptions = computed(() =>
    staffCollectionMethodOptions(this.destinations(), this.bill()?.lease.unit.property.id),
  );
  readonly methodHint = computed(() =>
    staffCollectionMethodHint(this.destinations(), this.bill()?.lease.unit.property.id),
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const bill = this.bill();
      if (!bill) return;
      // Side effects must not re-subscribe this effect — form.reset + p-inputNumber
      // otherwise fight each other and freeze the tab.
      untracked(() => this.primeForm(bill));
    });

    effect(() => {
      const options = this.methodOptions();
      untracked(() => {
        const current = this.form.controls.method.value;
        if (options.length > 0 && !options.some((option) => option.value === current)) {
          this.form.controls.method.setValue(options[0].value, { emitEvent: false });
        }
      });
    });
  }

  private primeForm(bill: BillListItem): void {
    this.errors.reset();
    this.errorMessage.set(null);
    this.receiptError.set(null);
    this.destinationsError.set(null);
    this.saving.set(false);
    this.receipt.set(null);
    this.proofPaymentId.set(null);
    this.paidAmount.set(bill.paidAmount);
    this.balance.set(bill.balance);
    this.billedAmount.set(bill.amount);
    this.form.reset({
      amount: finiteAmount(bill.balance),
      paidOn: new Date(),
      method: 'CASH',
      referenceNo: '',
      notes: '',
    });
    this.loadDestinations();
    this.loadDetail(bill.id);
  }

  onReceiptPicked(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    inputEl.value = '';
    if (!file) return;
    if (file.size > MAX_RECEIPT_BYTES) {
      this.receiptError.set('Receipt must be 10 MB or smaller.');
      return;
    }
    this.receiptError.set(null);
    this.receipt.set(file);
  }

  clearReceipt(): void {
    this.receipt.set(null);
    this.receiptError.set(null);
  }

  onSubmit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (!this.canMutate()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const bill = this.bill();
    const { amount, paidOn, method, referenceNo, notes } = this.form.getRawValue();
    const memo = notes.trim();
    if (!bill || amount === null || paidOn === null || collectionMemoError(memo)) return;

    this.saving.set(true);
    this.bills
      .recordPayment(
        bill.id,
        {
          amount,
          paidOn: formatDate(paidOn, 'yyyy-MM-dd', 'en-US'),
          method,
          referenceNo: referenceNo.trim() || undefined,
          notes: memo,
        },
        this.receipt(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.changed.emit();
          const settled = Number(this.balance()) - amount <= 0;
          if (settled) {
            this.toast.add({ severity: 'success', summary: 'Bill settled' });
            this.visible.set(false);
            return;
          }
          this.toast.add({ severity: 'success', summary: 'Payment recorded' });
          this.receipt.set(null);
          this.form.patchValue({ referenceNo: '', notes: '' });
          this.loadDetail(bill.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not record the payment.'));
        },
      });
  }

  openVoid(payment: PaymentResponse): void {
    if (!this.canMutate() || payment.isVoided) return;
    this.voidTarget.set(payment);
    this.voidDialogVisible.set(true);
  }

  onVoidConfirmed(reason: string): void {
    const payment = this.voidTarget();
    const bill = this.bill();
    if (!payment || !bill) return;
    this.voidingId.set(payment.id);
    this.bills
      .voidPayment(payment.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.voidingId.set(null);
          this.toast.add({ severity: 'success', summary: 'Payment voided' });
          this.changed.emit();
          this.loadDetail(bill.id);
        },
        error: (error: unknown) => {
          this.voidingId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Could not void payment',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  toggleProof(payment: PaymentResponse): void {
    this.proofPaymentId.update((current) => (current === payment.id ? null : payment.id));
  }

  private loadDestinations(): void {
    this.destinationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.destinations.set(rows);
          this.destinationsError.set(null);
        },
        error: (error: unknown) => {
          this.destinations.set([]);
          this.destinationsError.set(apiErrorMessage(error, 'Could not load payment destinations.'));
        },
      });
  }

  private loadDetail(billId: string): void {
    this.loading.set(true);
    this.bills
      .get(billId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.loading.set(false);
          this.payments.set(detail.payments);
          this.paidAmount.set(detail.paidAmount);
          this.balance.set(detail.balance);
          this.billedAmount.set(detail.amount);
          const amountControl = this.form.controls.amount;
          if (amountControl.pristine) {
            amountControl.setValue(finiteAmount(detail.balance));
          }
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not load payments.'));
        },
      });
  }
}
