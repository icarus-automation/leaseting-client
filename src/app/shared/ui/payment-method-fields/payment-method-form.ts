import { formatDate } from '@angular/common';
import {
  FormControl,
  FormGroup,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';

import type { PaymentMethod } from '../../../core/models/enums';
import type { PaymentMethodPayload } from '../../../core/models/payment-method.types';

const CHECK_NUMBER_MAX = 40;
const CHECK_BANK_MAX = 80;

export interface PaymentMethodControls {
  method: FormControl<PaymentMethod>;
  destinationId: FormControl<string>;
  checkNumber: FormControl<string>;
  checkBank: FormControl<string>;
  checkDate: FormControl<Date | null>;
}

export type PaymentMethodGroup = FormGroup<PaymentMethodControls>;
export type PaymentMethodValue = ReturnType<PaymentMethodGroup['getRawValue']>;

export const DESTINATION_REQUIRED_MESSAGE = 'Choose the destination the money went to.';

/** An online payment names its destination. The error sits on the group, shown under the picker. */
export function destinationWhenOnline(control: AbstractControl): ValidationErrors | null {
  const { method, destinationId } = (control as PaymentMethodGroup).getRawValue();
  return method === 'ONLINE' && !destinationId ? { destinationRequired: true } : null;
}

export function createPaymentMethodGroup(initial: Partial<PaymentMethodValue> = {}): PaymentMethodGroup {
  return new FormGroup<PaymentMethodControls>(
    {
      method: new FormControl<PaymentMethod>(initial.method ?? 'CASH', { nonNullable: true }),
      destinationId: new FormControl(initial.destinationId ?? '', { nonNullable: true }),
      checkNumber: new FormControl(initial.checkNumber ?? '', {
        nonNullable: true,
        validators: Validators.maxLength(CHECK_NUMBER_MAX),
      }),
      checkBank: new FormControl(initial.checkBank ?? '', {
        nonNullable: true,
        validators: Validators.maxLength(CHECK_BANK_MAX),
      }),
      checkDate: new FormControl<Date | null>(initial.checkDate ?? null),
    },
    { validators: destinationWhenOnline },
  );
}

export function emptyPaymentMethodValue(): PaymentMethodValue {
  return { method: 'CASH', destinationId: '', checkNumber: '', checkBank: '', checkDate: null };
}

/**
 * Keeps what belongs to the chosen method: the destination for Online, the check
 * details for Check. Fields typed for another method before switching are left out.
 */
export function paymentMethodPayload(value: PaymentMethodValue): PaymentMethodPayload {
  if (value.method === 'ONLINE') return { method: 'ONLINE', destinationId: value.destinationId || undefined };
  if (value.method === 'CHECK') {
    return {
      method: 'CHECK',
      checkNumber: value.checkNumber.trim() || undefined,
      checkBank: value.checkBank.trim() || undefined,
      checkDate: value.checkDate ? formatDate(value.checkDate, 'yyyy-MM-dd', 'en-US') : undefined,
    };
  }
  return { method: 'CASH' };
}

const PAYMENT_METHOD_FIELDS: readonly (keyof PaymentMethodPayload)[] = [
  'method',
  'destinationId',
  'checkNumber',
  'checkBank',
  'checkDate',
];

/**
 * Appends the method fields of a payload to a multipart body, skipping what is not
 * set. Hosts pass their whole payload, so anything else on it is theirs to append.
 */
export function appendPaymentMethod(form: FormData, payload: PaymentMethodPayload): void {
  for (const key of PAYMENT_METHOD_FIELDS) {
    const value = payload[key];
    if (value) form.append(key, value);
  }
}
