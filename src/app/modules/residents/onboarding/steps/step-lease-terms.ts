import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';

import type { ChargeLine } from '../../../../core/models/charge-item.types';
import type { LeaseTermsStepData, OnboardingDetail, OverviewStepData } from '../../../../core/models/onboarding.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ordinal } from '../../../../shared/utils/date.util';
import { starterRentFill } from '../../../../shared/utils/per-sqm-quote';
import { UnitsService } from '../../../properties/services/units.service';
import { ChargeLines } from '../components/charge-lines/charge-lines';
import {
  chargeLinesTotal,
  createChargeLineArray,
  toChargeLines,
  type ChargeLineArray,
} from '../components/charge-lines/charge-line-form';

const STARTER_CHARGE: Partial<ChargeLine> = { name: 'Monthly Rent', billType: 'RENT' };

@Component({
  selector: 'app-step-lease-terms',
  imports: [ReactiveFormsModule, PIcon, InputNumber, PhpCurrencyPipe, ChargeLines],
  templateUrl: './step-lease-terms.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepLeaseTerms {
  private readonly fb = inject(FormBuilder);
  private readonly units = inject(UnitsService);
  private readonly destroyRef = inject(DestroyRef);
  private starterRentUnitId: string | null = null;

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
    this.formValue();
    return chargeLinesTotal(this.charges);
  });

  readonly dueDayLabel = computed(() => ordinal(this.formValue().dueDay ?? 5));

  constructor() {
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
      if (saved.dueDay) this.form.controls.dueDay.setValue(saved.dueDay);
      return;
    }
    if (saved?.dueDay) this.form.controls.dueDay.setValue(saved.dueDay);
    this.fillStarterRent(detail);
  }

  private fillStarterRent(detail: OnboardingDetail): void {
    const overview = detail.stepsState.overview?.data as Partial<OverviewStepData> | undefined;
    const unitId = overview?.unitId || detail.unit?.id;
    if (!unitId || this.starterRentUnitId === unitId) return;
    this.starterRentUnitId = unitId;
    this.units
      .get(unitId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (unit) => {
          const fill = starterRentFill(unit, this.charges.getRawValue());
          if (!fill) return;
          this.charges.at(fill.index)?.controls.amount.setValue(fill.amount);
        },
      });
  }
}
