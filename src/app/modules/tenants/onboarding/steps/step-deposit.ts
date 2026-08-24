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

import type {
  DepositStepData,
  LeaseTermsStepData,
  OnboardingDetail,
} from '../../../../core/models/onboarding.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';

/** PH move-in practice: one month of rent in advance, two months held. */
const DEFAULT_ADVANCE_MONTHS = 1;
const DEFAULT_DEPOSIT_MONTHS = 2;

/**
 * Step 5 — everything collected up front. Both figures are multiples of the
 * monthly rent settled in the previous step, so neither restates the charge
 * lines that already add up to it: two identical questions, two numbers, and
 * a running total of what the tenant owes on move-in day.
 */
@Component({
  selector: 'app-step-deposit',
  imports: [ReactiveFormsModule, PIcon, InputNumber, PhpCurrencyPipe],
  templateUrl: './step-deposit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepDeposit {
  private readonly fb = inject(FormBuilder);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<DepositStepData>();
  readonly back = output<void>();

  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    collectsAdvance: [true],
    advanceMonths: [DEFAULT_ADVANCE_MONTHS, [Validators.required, Validators.min(1), Validators.max(12)]],
    holdsDeposit: [true],
    depositMonths: [DEFAULT_DEPOSIT_MONTHS, [Validators.required, Validators.min(1), Validators.max(12)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** The monthly rent agreed in the previous step — both figures scale off it. */
  readonly monthlyRent = computed(() => {
    const saved = this.detail().stepsState['lease-terms']?.data as LeaseTermsStepData | undefined;
    return (saved?.charges ?? []).reduce((total, charge) => total + charge.amount, 0);
  });

  readonly collectsAdvance = computed(() => this.formValue().collectsAdvance ?? false);
  readonly holdsDeposit = computed(() => this.formValue().holdsDeposit ?? false);

  readonly advanceTotal = computed(() =>
    this.collectsAdvance() ? this.monthlyRent() * (this.formValue().advanceMonths ?? 0) : 0,
  );
  readonly depositTotal = computed(() =>
    this.holdsDeposit() ? this.monthlyRent() * (this.formValue().depositMonths ?? 0) : 0,
  );
  readonly moveInTotal = computed(() => this.advanceTotal() + this.depositTotal());

  constructor() {
    // One-time prefill once the onboarding arrives.
    effect(() => {
      const detail = this.detail();
      untracked(() => this.prefill(detail));
    });
  }

  /**
   * Answering "no" takes the month count out of the form's validity — the
   * question is no longer being asked, so a stale value must not block Next.
   */
  setCollectsAdvance(collects: boolean): void {
    this.form.controls.collectsAdvance.setValue(collects);
    this.syncEnabled(this.form.controls.advanceMonths, collects, DEFAULT_ADVANCE_MONTHS);
    this.errorMessage.set(null);
  }

  setHoldsDeposit(holds: boolean): void {
    this.form.controls.holdsDeposit.setValue(holds);
    this.syncEnabled(this.form.controls.depositMonths, holds, DEFAULT_DEPOSIT_MONTHS);
    this.errorMessage.set(null);
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Advance and deposit must each be at least 1 month, or answer “No”.');
      return;
    }

    const { collectsAdvance, advanceMonths, holdsDeposit, depositMonths } = this.form.getRawValue();
    this.next.emit({
      collectsAdvance,
      advanceMonths: collectsAdvance ? advanceMonths : 0,
      holdsDeposit,
      depositMonths: holdsDeposit ? depositMonths : 0,
    });
  }

  private prefill(detail: OnboardingDetail): void {
    const saved = detail.stepsState.deposit?.data as Partial<DepositStepData> | undefined;
    const collectsAdvance = saved?.collectsAdvance ?? true;
    const holdsDeposit = saved?.holdsDeposit ?? true;

    this.form.patchValue({
      collectsAdvance,
      advanceMonths: saved?.advanceMonths || DEFAULT_ADVANCE_MONTHS,
      holdsDeposit,
      depositMonths: saved?.depositMonths || DEFAULT_DEPOSIT_MONTHS,
    });
    this.syncEnabled(this.form.controls.advanceMonths, collectsAdvance, DEFAULT_ADVANCE_MONTHS);
    this.syncEnabled(this.form.controls.depositMonths, holdsDeposit, DEFAULT_DEPOSIT_MONTHS);
  }

  private syncEnabled(control: (typeof this.form.controls)['advanceMonths'], enabled: boolean, fallback: number): void {
    if (enabled) {
      if (!control.value || control.value < 1) control.setValue(fallback);
      control.enable();
    } else {
      control.disable();
    }
  }
}
