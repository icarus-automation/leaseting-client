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
import { formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { LeaseTermsStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import type { UnitPickerItem } from '../../../../core/models/property.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { UnitsService } from '../../../properties/services/units.service';

/**
 * Step 3 — the terms the lease will be written with at completion. PH move-in
 * practice defaults: 1 month advance, 2 months security deposit.
 */
@Component({
  selector: 'app-step-lease-terms',
  imports: [ReactiveFormsModule, PIcon, DatePicker, InputNumber, Select, PhpCurrencyPipe],
  templateUrl: './step-lease-terms.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepLeaseTerms {
  private readonly fb = inject(FormBuilder);
  private readonly units = inject(UnitsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<LeaseTermsStepData>();
  readonly back = output<void>();

  readonly unitOptions = signal<{ label: string; value: string; rent: string | null }[]>([]);
  readonly loadingUnits = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    unitId: ['', [Validators.required]],
    startDate: [null as Date | null, [Validators.required]],
    endDate: [null as Date | null, [Validators.required]],
    monthlyRent: [null as number | null, [Validators.required, Validators.min(0)]],
    dueDay: [5, [Validators.required, Validators.min(1), Validators.max(31)]],
    advanceMonths: [1, [Validators.required, Validators.min(0), Validators.max(12)]],
    depositMonths: [2, [Validators.required, Validators.min(0), Validators.max(12)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly advanceTotal = computed(() => {
    const value = this.formValue();
    return (value.monthlyRent ?? 0) * (value.advanceMonths ?? 0);
  });
  readonly depositTotal = computed(() => {
    const value = this.formValue();
    return (value.monthlyRent ?? 0) * (value.depositMonths ?? 0);
  });

  constructor() {
    this.loadUnits();

    // One-time prefill once the onboarding arrives: saved step wins, else the
    // unit the wizard was launched from.
    effect(() => {
      const detail = this.detail();
      untracked(() => this.prefill(detail));
    });

    // Picking a unit suggests its asking rent — only when rent is still empty.
    this.form.controls.unitId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((unitId) => {
      const option = this.unitOptions().find((candidate) => candidate.value === unitId);
      if (option?.rent && this.form.controls.monthlyRent.value === null) {
        this.form.controls.monthlyRent.setValue(Number(option.rent));
      }
    });
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { unitId, startDate, endDate, monthlyRent, dueDay, advanceMonths, depositMonths } = this.form.getRawValue();
    if (!startDate || !endDate || monthlyRent === null) return;
    if (endDate <= startDate) {
      this.errorMessage.set('End date must be after the start date.');
      return;
    }

    this.next.emit({
      unitId,
      startDate: formatDate(startDate, 'yyyy-MM-dd', 'en-US'),
      endDate: formatDate(endDate, 'yyyy-MM-dd', 'en-US'),
      monthlyRent,
      dueDay,
      advanceMonths,
      depositMonths,
    });
  }

  private loadUnits(): void {
    this.units
      .listAll('VACANT')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.loadingUnits.set(false);
          this.unitOptions.set(items.map((unit) => this.toOption(unit)));
          this.ensureSelectedOption();
        },
        error: (error: unknown) => {
          this.loadingUnits.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not load vacant units.'));
        },
      });
  }

  private prefill(detail: OnboardingDetail): void {
    const saved = detail.stepsState['lease-terms']?.data as Partial<LeaseTermsStepData> | undefined;
    if (saved?.unitId) {
      this.form.patchValue({
        unitId: saved.unitId,
        startDate: saved.startDate ? new Date(saved.startDate) : null,
        endDate: saved.endDate ? new Date(saved.endDate) : null,
        monthlyRent: saved.monthlyRent ?? null,
        dueDay: saved.dueDay ?? 5,
        advanceMonths: saved.advanceMonths ?? 1,
        depositMonths: saved.depositMonths ?? 2,
      });
    } else if (detail.unit) {
      this.form.patchValue({ unitId: detail.unit.id });
    }
    this.ensureSelectedOption();
  }

  /**
   * The chosen unit must stay pickable on resume even if it fell out of the
   * VACANT list (e.g. someone else quick-assigned it — completion will 409).
   */
  private ensureSelectedOption(): void {
    const unitId = this.form.controls.unitId.value;
    if (!unitId || this.unitOptions().some((option) => option.value === unitId)) return;
    const unit = this.detail().unit;
    if (unit?.id === unitId) {
      this.unitOptions.update((options) => [
        { label: `${unit.property.name} — Unit ${unit.unitNo}`, value: unit.id, rent: null },
        ...options,
      ]);
    }
  }

  private toOption(unit: UnitPickerItem): { label: string; value: string; rent: string | null } {
    return {
      label: `${unit.property.name} — Unit ${unit.unitNo}`,
      value: unit.id,
      rent: unit.monthlyRent,
    };
  }
}
