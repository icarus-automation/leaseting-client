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
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
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
import {
  EVERY_PROPERTY_VALUE,
  type PropertyAccessValue,
  propertyAccessValidator,
  toPropertyIds,
} from '../../utils/property-access.util';
import { PropertyAccessPicker } from '../property-access-picker/property-access-picker';

@Component({
  selector: 'app-attendant-form-dialog',
  imports: [ProgressSpinner, ReactiveFormsModule, PIcon, ErrorBanner, FormDialog, PropertyAccessPicker],
  templateUrl: './attendant-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendantFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly attendants = inject(ParkingAttendantsService);
  private readonly auth = inject(AuthService);
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
    propertyAccess: this.fb.nonNullable.control<PropertyAccessValue>(EVERY_PROPERTY_VALUE, [propertyAccessValidator]),
  });
  readonly errors = createFormErrors(this.form);

  readonly nameMessages = { required: 'Enter a name for this login.', minlength: 'Use at least 2 characters.' };
  readonly emailMessages = { required: 'Enter the login email.' };
  readonly passwordMessages = {
    required: 'Enter a password.',
    minlength: `Use at least ${ATTENDANT_PASSWORD_MIN} characters.`,
  };
  readonly propertyMessages = { propertiesRequired: 'Pick at least one property, or give every property.' };

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.form.reset({
          name: '',
          email: '',
          password: '',
          // Someone limited can only give their own properties, so they pick.
          propertyAccess: this.auth.hasEveryProperty()
            ? EVERY_PROPERTY_VALUE
            : { everyProperty: false, propertyIds: [] },
        });
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

    const { name, email, password, propertyAccess } = this.form.getRawValue();
    const propertyIds = toPropertyIds(propertyAccess);
    this.saving.set(true);
    this.attendants
      .create({ name: name.trim(), email: email.trim(), password, ...(propertyIds.length > 0 && { propertyIds }) })
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
