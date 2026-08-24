import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';

import type { ChargeLine } from '../../../../core/models/charge-item.types';
import type { LeaseTermsStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ordinal } from '../../../../shared/utils/date.util';
import { ChargeLines } from '../components/charge-lines/charge-lines';
import {
  chargeLinesTotal,
  createChargeLineArray,
  toChargeLines,
  type ChargeLineArray,
} from '../components/charge-lines/charge-line-form';

/** Every lease starts with a rent line; the rest is up to the landlord. */
const STARTER_CHARGE: Partial<ChargeLine> = { name: 'Monthly Rent', billType: 'RENT' };

/**
 * Step 4 — what this tenant is charged every month. The lines sum to the
 * lease's monthly rent, which is what the nightly rent run bills; the
 * breakdown rides along on the lease so a statement can show it.
 */
@Component({
  selector: 'app-step-lease-terms',
  imports: [ReactiveFormsModule, PIcon, InputNumber, PhpCurrencyPipe, ChargeLines],
  templateUrl: './step-lease-terms.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepLeaseTerms {
  private readonly fb = inject(FormBuilder);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<LeaseTermsStepData>();
  readonly back = output<void>();

  readonly errorMessage = signal<string | null>(null);

  readonly charges: ChargeLineArray = createChargeLineArray([STARTER_CHARGE]);
  readonly form = this.fb.nonNullable.group({
    dueDay: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
    charges: this.charges,
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly monthlyTotal = computed(() => {
    this.formValue(); // recompute on any line edit
    return chargeLinesTotal(this.charges);
  });

  readonly dueDayLabel = computed(() => ordinal(this.formValue().dueDay ?? 5));

  constructor() {
    // One-time prefill once the onboarding arrives.
    effect(() => {
      const detail = this.detail();
      untracked(() => this.prefill(detail));
    });
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.charges.length === 0) {
      this.errorMessage.set('Add at least one rent charge.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Give every charge a name and an amount.');
      return;
    }
    if (this.monthlyTotal() <= 0) {
      this.errorMessage.set('The charges must add up to more than zero.');
      return;
    }

    this.next.emit({ dueDay: this.form.controls.dueDay.value, charges: toChargeLines(this.charges) });
  }

  private prefill(detail: OnboardingDetail): void {
    const saved = detail.stepsState['lease-terms']?.data as Partial<LeaseTermsStepData> | undefined;
    if (saved?.charges?.length) {
      this.charges.clear();
      for (const group of createChargeLineArray(saved.charges).controls) this.charges.push(group);
    }
    if (saved?.dueDay) this.form.controls.dueDay.setValue(saved.dueDay);
  }
}
