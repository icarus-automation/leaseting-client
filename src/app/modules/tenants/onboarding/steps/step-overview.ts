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
import type { UnitPickerItem } from '../../../../core/models/property.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { leaseTermLabel } from '../../../../shared/utils/date.util';
import { UnitsService } from '../../../properties/services/units.service';

interface PropertyOption {
  label: string;
  value: string;
  vacantCount: number;
}

interface UnitOption {
  label: string;
  value: string;
  rent: string | null;
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
        rent: unit.monthlyRent,
      }));
  });

  readonly askingRent = computed(() => {
    const unitId = this.formValue().unitId;
    return this.unitOptions().find((option) => option.value === unitId)?.rent ?? null;
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
          this.loadingUnits.set(false);
          this.vacantUnits.set(items);
          this.ensureChosenUnitVisible();
        },
        error: (error: unknown) => {
          this.loadingUnits.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not load vacant units.'));
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
    const unitId = this.form.controls.unitId.value;
    const unit = this.detail().unit;
    if (!unitId || !unit || unit.id !== unitId) return;
    if (this.vacantUnits().some((candidate) => candidate.id === unitId)) {
      this.form.controls.propertyId.setValue(unit.property.id, { emitEvent: false });
      return;
    }
    this.vacantUnits.update((units) => [
      {
        id: unit.id,
        unitNo: unit.unitNo,
        monthlyRent: null,
        status: 'VACANT',
        floor: { id: '', level: 0 },
        property: unit.property,
      },
      ...units,
    ]);
    this.form.controls.propertyId.setValue(unit.property.id, { emitEvent: false });
  }
}
