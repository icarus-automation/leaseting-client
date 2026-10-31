import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { Member } from '../../../../core/models/member.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { ATTENDANT_PASSWORD_MAX, ATTENDANT_PASSWORD_MIN } from '../../utils/parking-attendant.util';

@Component({
  selector: 'app-attendant-password-dialog',
  imports: [ReactiveFormsModule, ErrorBanner, FormDialog],
  templateUrl: './attendant-password-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendantPasswordDialog {
  private readonly fb = inject(FormBuilder);
  private readonly attendants = inject(ParkingAttendantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  /** The attendant whose password is being reset. */
  readonly member = input<Member | null>(null);
  readonly passwordReset = output<Member>();

  readonly minPasswordLength = ATTENDANT_PASSWORD_MIN;

  readonly form = this.fb.nonNullable.group({
    password: [
      '',
      [Validators.required, Validators.minLength(ATTENDANT_PASSWORD_MIN), Validators.maxLength(ATTENDANT_PASSWORD_MAX)],
    ],
  });
  readonly errors = createFormErrors(this.form);
  readonly passwordMessages = {
    required: 'Enter a new password.',
    minlength: `Use at least ${ATTENDANT_PASSWORD_MIN} characters.`,
  };

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.form.reset({ password: '' });
        this.errors.reset();
        this.errorMessage.set(null);
        this.saving.set(false);
      });
    });
  }

  submit(): void {
    const target = this.member();
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (!target || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    // The attendants route takes the login's user id, which is the member's `userId`.
    this.attendants
      .setPassword(target.userId, this.form.getRawValue().password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.visible.set(false);
          this.passwordReset.emit(target);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not reset the password.'));
        },
      });
  }
}
