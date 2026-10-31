import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ParkingAttendantResponse } from '../../../../core/models/parking-attendant.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import {
  ATTENDANT_HANDHELD_NOTE,
  ATTENDANT_PASSWORD_MAX,
  ATTENDANT_PASSWORD_MIN,
} from '../../utils/parking-attendant.util';

@Component({
  selector: 'app-attendant-form-dialog',
  imports: [ReactiveFormsModule, PIcon, ErrorBanner, FormDialog],
  templateUrl: './attendant-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendantFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly attendants = inject(ParkingAttendantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly created = output<ParkingAttendantResponse>();

  readonly handheldNote = ATTENDANT_HANDHELD_NOTE;
  readonly minPasswordLength = ATTENDANT_PASSWORD_MIN;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: [
      '',
      [Validators.required, Validators.minLength(ATTENDANT_PASSWORD_MIN), Validators.maxLength(ATTENDANT_PASSWORD_MAX)],
    ],
  });
  readonly errors = createFormErrors(this.form);

  readonly nameMessages = { required: 'Enter a name for this login.', minlength: 'Use at least 2 characters.' };
  readonly emailMessages = { required: 'Enter the login email.' };
  readonly passwordMessages = {
    required: 'Enter a password.',
    minlength: `Use at least ${ATTENDANT_PASSWORD_MIN} characters.`,
  };

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.form.reset({ name: '', email: '', password: '' });
        this.errors.reset();
        this.errorMessage.set(null);
        this.saving.set(false);
      });
    });
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.saving.set(true);
    this.attendants
      .create(name.trim(), email.trim(), password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (attendant) => {
          this.saving.set(false);
          this.visible.set(false);
          this.created.emit(attendant);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not add the attendant.'));
        },
      });
  }
}
