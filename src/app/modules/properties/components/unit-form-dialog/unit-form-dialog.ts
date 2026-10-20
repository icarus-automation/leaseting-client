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
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl, type ValidatorFn } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { InputNumber } from 'primeng/inputnumber';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { PRICING_BASIS_LABELS, type PricingBasis } from '../../../../core/models/enums';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { SegmentedControl, type SegmentedOption } from '../../../../shared/ui/segmented-control/segmented-control';
import {
  PER_SQM_AREA_ERROR,
  PER_SQM_RATE_ERROR,
  formatStoredPerSqmRent,
  perSqmArea,
  perSqmFieldErrors,
  perSqmRate,
  previewPerSqm,
  unitFormPayload,
} from '../../../../shared/utils/per-sqm-quote';
import { UnitsService } from '../../services/units.service';

export interface UnitFormTarget {
  id: string;
  unitNo: string;
  monthlyRent: string | null;
  notes: string | null;
  pricingBasis: PricingBasis;
  floorAreaSqm: number | null;
  ratePerSqmOverride: number | null;
}

const BLANK_UNIT = {
  unitNo: '',
  notes: '',
  pricingBasis: 'FIXED' as PricingBasis,
  monthlyRent: null,
  floorAreaSqm: null,
  ratePerSqmOverride: null,
};

@Component({
  selector: 'app-unit-form-dialog',
  imports: [ReactiveFormsModule, InputNumber, SegmentedControl, ErrorBanner, FormDialog],
  templateUrl: './unit-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly units = inject(UnitsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly floorId = input.required<string>();
  readonly unit = input<UnitFormTarget | null>(null);
  readonly propertyDefaultRatePerSqm = input<number | null>(null);
  readonly saved = output<string>();

  readonly pricingBasisOptions: readonly SegmentedOption<PricingBasis>[] = (
    Object.entries(PRICING_BASIS_LABELS) as [PricingBasis, string][]
  ).map(([value, label]) => ({ value, label }));

  readonly areaErrors = { [perSqmArea]: PER_SQM_AREA_ERROR };
  readonly rateErrors = { [perSqmRate]: PER_SQM_RATE_ERROR };

  private readonly areaValidator: ValidatorFn = (control) => {
    const errors = this.errorsFor(control, { floorAreaSqm: (control.value ?? null) as number | null });
    return errors?.floorAreaSqm ? { [perSqmArea]: true } : null;
  };

  private readonly rateValidator: ValidatorFn = (control) => {
    const errors = this.errorsFor(control, {
      ratePerSqmOverride: (control.value ?? null) as number | null,
    });
    return errors?.ratePerSqmOverride ? { [perSqmRate]: true } : null;
  };

  readonly form = this.fb.nonNullable.group({
    unitNo: ['', [Validators.required, Validators.maxLength(20)]],
    notes: ['', [Validators.maxLength(2000)]],
    pricingBasis: ['FIXED' as PricingBasis],
    monthlyRent: [null as number | null, [Validators.min(0)]],
    floorAreaSqm: [null as number | null, [Validators.min(0), this.areaValidator]],
    ratePerSqmOverride: [null as number | null, [Validators.min(0), this.rateValidator]],
  });
  readonly errors = createFormErrors(this.form);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly dialog = viewChild.required(FormDialog);
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly isEdit = computed(() => this.unit() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit unit' : 'New unit'));
  readonly perSqmSentence = computed(() => {
    this.formValue();
    const { pricingBasis, floorAreaSqm, ratePerSqmOverride } = this.form.getRawValue();
    if (pricingBasis !== 'PER_SQM') return null;
    const preview = previewPerSqm({
      floorAreaSqm,
      ratePerSqmOverride,
      propertyDefaultRatePerSqm: this.propertyDefaultRatePerSqm(),
    });
    if (!preview) return null;
    return formatStoredPerSqmRent({
      rentPricingBasis: 'PER_SQM',
      rentFloorAreaSqm: preview.areaSqm,
      rentRatePerSqm: preview.ratePerSqm,
      monthlyRent: preview.amount,
    });
  });

  constructor() {
    effect(() => {
      this.propertyDefaultRatePerSqm();
      this.form.controls.floorAreaSqm.updateValueAndValidity();
      this.form.controls.ratePerSqmOverride.updateValueAndValidity();
    });

    effect(() => {
      if (!this.visible()) return;
      const unit = this.unit();
      this.errors.reset();
      this.errorMessage.set(null);
      this.saving.set(false);
      this.form.reset(
        unit
          ? {
              unitNo: unit.unitNo,
              notes: unit.notes ?? '',
              pricingBasis: unit.pricingBasis === 'PER_SQM' ? 'PER_SQM' : 'FIXED',
              monthlyRent: unit.monthlyRent !== null ? Number(unit.monthlyRent) : null,
              floorAreaSqm: unit.floorAreaSqm,
              ratePerSqmOverride: unit.ratePerSqmOverride,
            }
          : BLANK_UNIT,
      );
    });
  }

  selectPricingBasis(basis: PricingBasis): void {
    const control = this.form.controls.pricingBasis;
    control.setValue(basis);
    control.markAsDirty();
    this.form.controls.floorAreaSqm.updateValueAndValidity();
    this.form.controls.ratePerSqmOverride.updateValueAndValidity();
  }

  onSubmit(addAnother = false): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = unitFormPayload(this.form.getRawValue(), this.propertyDefaultRatePerSqm());
    if (!payload) return;
    const target = this.unit();

    this.saving.set(true);
    const request$ = target
      ? this.units.update(target.id, payload)
      : this.units.create(this.floorId(), payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (unit) => {
        this.saving.set(false);
        this.saved.emit(unit.id);
        if (addAnother) {
          this.form.reset(BLANK_UNIT);
          this.errors.reset();
          this.dialog().focusFirstField();
        } else {
          this.visible.set(false);
        }
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(
          apiErrorMessage(error, 'Could not save the unit. This unit number may already exist.'),
        );
      },
    });
  }

  private errorsFor(
    control: AbstractControl,
    patch: { floorAreaSqm?: number | null; ratePerSqmOverride?: number | null },
  ) {
    const parent = control.parent;
    if (!parent) return null;
    const basis = parent.get('pricingBasis')?.value as PricingBasis | undefined;
    if (basis !== 'FIXED' && basis !== 'PER_SQM') return null;
    return perSqmFieldErrors({
      pricingBasis: basis,
      floorAreaSqm:
        patch.floorAreaSqm !== undefined
          ? patch.floorAreaSqm
          : ((parent.get('floorAreaSqm')?.value ?? null) as number | null),
      ratePerSqmOverride:
        patch.ratePerSqmOverride !== undefined
          ? patch.ratePerSqmOverride
          : ((parent.get('ratePerSqmOverride')?.value ?? null) as number | null),
      propertyDefaultRatePerSqm: this.propertyDefaultRatePerSqm(),
    });
  }
}
