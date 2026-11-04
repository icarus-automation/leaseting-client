import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ParkingPass } from '../../../../core/models/parking-pass.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ParkingPassesService } from '../../services/parking-passes.service';

@Component({
  selector: 'app-change-plate-dialog',
  imports: [ReactiveFormsModule, ErrorBanner, FormDialog],
  templateUrl: './change-plate-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePlateDialog {
  private readonly fb = inject(FormBuilder);
  private readonly passes = inject(ParkingPassesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly pass = input<ParkingPass | null>(null);
  readonly saved = output<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    plate: ['', [Validators.required, Validators.maxLength(20)]],
  });
  readonly errors = createFormErrors(this.form);

  constructor() {
    effect(() => {
      const pass = this.pass();
      if (!this.visible() || !pass) return;
      untracked(() => {
        this.form.reset({ plate: pass.plateDisplay });
        this.error.set(null);
        this.errors.reset();
      });
    });
  }

  submit(): void {
    const pass = this.pass();
    this.errors.submitted.set(true);
    if (!pass || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.passes
      .changePlate(pass.id, this.form.controls.plate.value.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(error, 'Could not change the plate.'));
        },
      });
  }
}
