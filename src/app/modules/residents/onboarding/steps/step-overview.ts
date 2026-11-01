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
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { OnboardingDetail, OverviewStepData } from '../../../../core/models/onboarding.types';
import type { UnitPickerItem, UnitQuote } from '../../../../core/models/property.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { leaseTermLabel } from '../../../../shared/utils/date.util';
import { vacantPlaceholder } from '../../../../shared/utils/per-sqm-quote';
import { UnitsService } from '../../../properties/services/units.service';

interface PropertyOption {
  label: string;
  value: string;
  vacantCount: number;
}

interface UnitOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-step-overview',
  imports: [ReactiveFormsModule, PIcon, DatePicker, Select, PhpCurrencyPipe],
  templateUrl: './step-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepOverview {
  private readonly fb = inject(FormBuilder);
  private readonly units = inject(UnitsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<OverviewStepData>();

  private readonly vacantUnits = signal<UnitPickerItem[]>([]);
  private quotedUnitId: string | null = null;
  readonly loadingUnits = signal(true);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    propertyId: ['', [Validators.required]],
    unitId: ['', [Validators.required]],
    startDate: [null as Date | null, [Validators.required]],
    endDate: [null as Date | null, [Validators.required]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly propertyOptions = computed<PropertyOption[]>(() => {
    const byProperty = new Map<string, PropertyOption>();
    for (const unit of this.vacantUnits()) {
      const existing = byProperty.get(unit.property.id);
      if (existing) existing.vacantCount += 1;
      else byProperty.set(unit.property.id, { label: unit.property.name, value: unit.property.id, vacantCount: 1 });
    }
    return [...byProperty.values()].sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly unitOptions = computed<UnitOption[]>(() => {
    const propertyId = this.formValue().propertyId;
    if (!propertyId) return [];
    return this.vacantUnits()
      .filter((unit) => unit.property.id === propertyId)
      .map((unit) => ({
        label: `Unit ${unit.unitNo}`,
        value: unit.id,
      }));
  });

  readonly chosenUnit = computed(() => {
    const unitId = this.formValue().unitId;
    if (!unitId) return null;
    return this.vacantUnits().find((unit) => unit.id === unitId) ?? null;
  });

  readonly termLabel = computed(() => {
    const { startDate, endDate } = this.formValue();
    if (!startDate || !endDate || endDate <= startDate) return null;
    return leaseTermLabel(startDate.toISOString(), endDate.toISOString());
  });

  constructor() {
    this.loadUnits();

    effect(() => {
      const detail = this.detail();
      untracked(() => this.prefill(detail));
    });

    this.form.controls.propertyId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((propertyId) => {
        const unitId = this.form.controls.unitId.value;
        if (!unitId) return;
        const stillValid = this.vacantUnits().some(
          (unit) => unit.id === unitId && unit.property.id === propertyId,
        );
        if (!stillValid) this.form.controls.unitId.setValue('');
      });
  }

  suggestOneYear(): void {
    const start = this.form.controls.startDate.value;
    if (!start) return;
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    this.form.controls.endDate.setValue(end);
  }

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { unitId, startDate, endDate } = this.form.getRawValue();
    if (!startDate || !endDate) return;
    if (endDate <= startDate) {
      this.errorMessage.set('The end date must be after the start date.');
      return;
    }

    this.next.emit({
      unitId,
      startDate: formatDate(startDate, 'yyyy-MM-dd', 'en-US'),
      endDate: formatDate(endDate, 'yyyy-MM-dd', 'en-US'),
    });
  }

  private loadUnits(): void {
    this.units
      .listAll('VACANT')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.vacantUnits.set(items);
          this.loadingUnits.set(false);
          this.ensureChosenUnitVisible();
        },
        error: (error: unknown) => {
          this.loadingUnits.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not load vacant units.'));
          this.ensureChosenUnitVisible();
        },
      });
  }

  private prefill(detail: OnboardingDetail): void {
    const saved = detail.stepsState.overview?.data as Partial<OverviewStepData> | undefined;
    this.form.patchValue({
      propertyId: detail.unit?.property.id ?? '',
      unitId: saved?.unitId ?? detail.unit?.id ?? '',
      startDate: saved?.startDate ? new Date(saved.startDate) : null,
      endDate: saved?.endDate ? new Date(saved.endDate) : null,
    });
    this.ensureChosenUnitVisible();
  }

  private ensureChosenUnitVisible(): void {
    if (this.loadingUnits()) return;
    const unitId = this.form.controls.unitId.value;
    const chosen = this.detail().unit;
    if (!unitId || !chosen || chosen.id !== unitId) return;

    if (!this.vacantUnits().some((candidate) => candidate.id === unitId)) {
      this.vacantUnits.update((units) => [
        vacantPlaceholder({
          id: chosen.id,
          unitNo: chosen.unitNo,
          property: chosen.property,
        }),
        ...units,
      ]);
      if (this.quotedUnitId !== unitId) {
        this.quotedUnitId = unitId;
        this.units
          .get(unitId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (detail) => {
              const quote: UnitQuote = {
                pricingBasis: detail.pricingBasis,
                monthlyRent: detail.monthlyRent,
                computedMonthlyRent: detail.computedMonthlyRent,
              };
              this.vacantUnits.update((units) => {
                if (!units.some((candidate) => candidate.id === unitId)) return units;
                return units.map((candidate) =>
                  candidate.id === unitId ? { ...candidate, ...quote } : candidate,
                );
              });
            },
          });
      }
    }

    this.form.controls.propertyId.setValue(chosen.property.id, { emitEvent: false });
  }
}
