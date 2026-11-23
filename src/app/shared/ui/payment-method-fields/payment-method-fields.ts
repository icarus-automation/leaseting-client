import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { PAYMENT_METHOD_OPTIONS } from '../../../core/models/enums';
import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';
import type { FormErrors } from '../../forms/form-errors';
import { destinationPickerDetail } from '../../utils/payment-destination.util';
import { DESTINATION_REQUIRED_MESSAGE, type PaymentMethodGroup } from './payment-method-form';

const NO_DESTINATIONS_HINT =
  'No enabled destinations at this property. Add one under Settings → Payment destinations.';

/**
 * Method (Cash, Check, Online) with what each one needs: the destination an online
 * payment went to, or a check's number, bank, and date. Hosts give it a group from
 * createPaymentMethodGroup and the destinations the property offers.
 */
@Component({
  selector: 'app-payment-method-fields',
  imports: [ReactiveFormsModule, DatePicker, Select],
  templateUrl: './payment-method-fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodFields {
  readonly group = input.required<PaymentMethodGroup>();
  /** The enabled destinations the property offers. */
  readonly destinations = input.required<PaymentDestinationResponse[]>();
  readonly idPrefix = input.required<string>();
  /** The host form's errors, and where this group sits in that form. */
  readonly errors = input.required<FormErrors>();
  readonly groupPath = input.required<string>();
  /** 'split' puts the method in the left column and projects [besideMethod] on the right. */
  readonly layout = input<'split' | 'stacked'>('stacked');
  readonly methodLabel = input('Method');
  readonly destinationsError = input<string | null>(null);

  /** Bumps on every change to the group, including a reset the host makes. */
  private readonly changes = signal(0);
  readonly method = computed(() => {
    this.changes();
    return this.group().controls.method.value;
  });

  readonly methodOptions = computed(() =>
    PAYMENT_METHOD_OPTIONS.map((option) => ({
      ...option,
      disabled: option.value === 'ONLINE' && this.destinations().length === 0,
    })),
  );
  readonly noDestinationsHint = computed(() => (this.destinations().length === 0 ? NO_DESTINATIONS_HINT : null));
  private readonly destinationMessages = { destinationRequired: DESTINATION_REQUIRED_MESSAGE };

  constructor() {
    effect((onCleanup) => {
      const subscription = this.group().events.subscribe(() => this.changes.update((count) => count + 1));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  detail(destination: PaymentDestinationResponse): string {
    return destinationPickerDetail(destination);
  }

  /** Reads the host's error signals first, so a submit re-renders this even when nothing here changed. */
  destinationError(): string | null {
    this.changes();
    const message = this.errors().fieldError(this.groupPath(), this.destinationMessages);
    return message && this.group().hasError('destinationRequired') ? message : null;
  }

  checkError(field: 'checkNumber' | 'checkBank'): string | null {
    this.changes();
    return this.errors().fieldError(`${this.groupPath()}.${field}`);
  }
}
