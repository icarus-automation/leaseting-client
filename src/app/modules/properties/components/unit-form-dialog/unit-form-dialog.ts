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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InputNumber } from 'primeng/inputnumber';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { UnitsService } from '../../services/units.service';

/** The slice of a unit this form edits — satisfied by FloorUnitItem and UnitDetail. */
export interface UnitFormTarget {
  id: string;
  unitNo: string;
  monthlyRent: string | null;
  notes: string | null;
}

@Component({
  selector: 'app-unit-form-dialog',
  imports: [ReactiveFormsModule, InputNumber, ErrorBanner, FormDialog],
  templateUrl: './unit-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly units = inject(UnitsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly floorId = input.required<string>();
  /** Null → create mode; a unit → edit mode. */
  readonly unit = input<UnitFormTarget | null>(null);
  readonly saved = output<string>();

  readonly form = this.fb.nonNullable.group({
    unitNo: ['', [Validators.required, Validators.maxLength(20)]],
    monthlyRent: [null as number | null, [Validators.min(0)]],
    notes: ['', [Validators.maxLength(2000)]],
  });
  readonly errors = createFormErrors(this.form);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly dialog = viewChild.required(FormDialog);

  readonly isEdit = computed(() => this.unit() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit unit' : 'New unit'));

  constructor() {
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
              monthlyRent: unit.monthlyRent !== null ? Number(unit.monthlyRent) : null,
              notes: unit.notes ?? '',
            }
          : { unitNo: '', monthlyRent: null, notes: '' },
      );
    });
  }

  onSubmit(addAnother = false): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { unitNo, monthlyRent, notes } = this.form.getRawValue();
    const payload = {
      unitNo: unitNo.trim(),
      monthlyRent: monthlyRent ?? undefined,
      notes: notes.trim() || undefined,
    };
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
          // Adding a whole floor's rooms is the common flow — stay open,
          // clear for the next unit, and put the cursor back in the first field.
          this.form.reset({ unitNo: '', monthlyRent: null, notes: '' });
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
}
