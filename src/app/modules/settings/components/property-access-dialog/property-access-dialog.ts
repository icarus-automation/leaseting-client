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
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, map } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { Member } from '../../../../core/models/member.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { MembersService } from '../../services/members.service';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import {
  EVERY_PROPERTY_VALUE,
  type PropertyAccessValue,
  pickerValueOf,
  propertyAccessValidator,
  toPropertyIds,
} from '../../utils/property-access.util';
import { PropertyAccessPicker } from '../property-access-picker/property-access-picker';

/** Changes which properties a staff member or parking attendant works with. */
@Component({
  selector: 'app-property-access-dialog',
  imports: [ReactiveFormsModule, ErrorBanner, FormDialog, PropertyAccessPicker],
  templateUrl: './property-access-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyAccessDialog {
  private readonly fb = inject(FormBuilder);
  private readonly members = inject(MembersService);
  private readonly attendants = inject(ParkingAttendantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly member = input<Member | null>(null);
  readonly changed = output<Member>();

  readonly form = this.fb.nonNullable.group({
    propertyAccess: this.fb.nonNullable.control<PropertyAccessValue>(EVERY_PROPERTY_VALUE, [propertyAccessValidator]),
  });
  readonly errors = createFormErrors(this.form);
  readonly propertyMessages = { propertiesRequired: 'Pick at least one property, or give every property.' };

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly heading = computed(() => `Property access for ${this.member()?.name ?? 'this person'}`);
  readonly isAttendant = computed(() => this.member()?.audience === 'parking');
  readonly subheading = computed(() =>
    this.isAttendant()
      ? 'The terminals their handheld offers, and where they can run a shift.'
      : 'What they see across the app: properties, tenants, leases, billing, parking, and reports.',
  );
  /** Archived properties drop out of the picker, so saving removes them. */
  readonly archivedNames = computed(() =>
    (this.member()?.propertyAccess.properties ?? [])
      .filter((property) => property.isArchived)
      .map((property) => property.name),
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const member = this.member();
      untracked(() => {
        this.form.reset({ propertyAccess: member ? pickerValueOf(member.propertyAccess) : EVERY_PROPERTY_VALUE });
        this.errors.reset();
        this.errorMessage.set(null);
        this.saving.set(false);
      });
    });
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    const member = this.member();
    if (!member || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.save(member, toPropertyIds(this.form.getRawValue().propertyAccess))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.visible.set(false);
          this.changed.emit(updated);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not change the property access.'));
        },
      });
  }

  /** Attendants answer on their own route, by user id; the row keeps its other fields. */
  private save(member: Member, propertyIds: string[]): Observable<Member> {
    if (member.audience === 'parking') {
      return this.attendants
        .setPropertyAccess(member.userId, propertyIds)
        .pipe(map((attendant) => ({ ...member, propertyAccess: attendant.propertyAccess })));
    }
    return this.members.setPropertyAccess(member.id, propertyIds);
  }
}
