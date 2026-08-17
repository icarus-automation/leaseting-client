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
} from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { BillListItem, PaymentResponse } from '../../../../core/models/bill.types';
import {
  BILL_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PaymentMethod,
} from '../../../../core/models/enums';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { BillsService } from '../../services/bills.service';

const ACCEPTED_RECEIPT_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/**
 * Replaces the blind "mark as paid" flip: staff record how much was received,
 * when, through what channel, and attach the receipt. Partial payments stay
 * listed here until the balance reaches zero, at which point the bill settles.
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
  ],
  templateUrl: './record-payment-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordPaymentDialog {
  private readonly fb = inject(FormBuilder);
  private readonly bills = inject(BillsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly bill = input<BillListItem | null>(null);
  /** Any recorded/removed payment — parent reloads its list. */
  readonly changed = output<void>();

  readonly methodOptions = PAYMENT_METHOD_OPTIONS;
  readonly methodLabels = PAYMENT_METHOD_LABELS;
  readonly billTypeLabels = BILL_TYPE_LABELS;
  readonly acceptedReceiptTypes = ACCEPTED_RECEIPT_TYPES;

  readonly form = this.fb.nonNullable.group({
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paidOn: [null as Date | null, [Validators.required]],
    method: ['CASH' as PaymentMethod, [Validators.required]],
    referenceNo: [''],
    notes: [''],
  });
  readonly errors = createFormErrors(this.form);

  readonly payments = signal<PaymentResponse[]>([]);
  readonly balance = signal<string>('0');
  readonly paidAmount = signal<string>('0');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly receipt = signal<File | null>(null);
  readonly receiptError = signal<string | null>(null);

  readonly heading = computed(() => {
    const bill = this.bill();
    if (!bill) return 'Record payment';
    return `Record payment — ${BILL_TYPE_LABELS[bill.type]}`;
  });
  readonly subheading = computed(() => {
    const bill = this.bill();
    if (!bill) return null;
    const tenant = bill.lease.tenant;
    return `${tenant.firstName} ${tenant.lastName} · Unit ${bill.lease.unit.unitNo}`;
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const bill = this.bill();
      if (!bill) return;
      this.errors.reset();
      this.errorMessage.set(null);
      this.receiptError.set(null);
      this.saving.set(false);
      this.receipt.set(null);
      this.paidAmount.set(bill.paidAmount);
      this.balance.set(bill.balance);
      this.form.reset({
        amount: Number(bill.balance) || null,
        paidOn: new Date(),
        method: 'CASH',
        referenceNo: '',
        notes: '',
      });
      this.loadDetail(bill.id);
    });
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const bill = this.bill();
    const { amount, paidOn, method, referenceNo, notes } = this.form.getRawValue();
    if (!bill || amount === null || paidOn === null) return;

    this.saving.set(true);
    this.bills
      .recordPayment(
        bill.id,
        {
          amount,
          paidOn: formatDate(paidOn, 'yyyy-MM-dd', 'en-US'),
          method,
          referenceNo: referenceNo.trim() || undefined,
          notes: notes.trim() || undefined,
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

  confirmDeletePayment(payment: PaymentResponse): void {
    this.confirmation.confirm({
      header: 'Remove payment',
      message: 'Remove this payment? The bill reopens if the rest no longer covers it.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Keep', severity: 'secondary', outlined: true },
      accept: () => {
        this.deletingId.set(payment.id);
        this.bills
          .deletePayment(payment.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingId.set(null);
              this.toast.add({ severity: 'success', summary: 'Payment removed' });
              this.changed.emit();
              const bill = this.bill();
              if (bill) this.loadDetail(bill.id);
            },
            error: (error: unknown) => {
              this.deletingId.set(null);
              this.toast.add({
                severity: 'error',
                summary: 'Could not remove payment',
                detail: apiErrorMessage(error),
              });
            },
          });
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
          const amountControl = this.form.controls.amount;
          if (amountControl.pristine) {
            amountControl.setValue(Number(detail.balance) || null);
          }
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not load payments.'));
        },
      });
  }
}
