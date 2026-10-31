import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { Invitation } from '../../../../core/models/invitation.types';
import type { Role } from '../../../../core/models/role.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { InvitationsService } from '../../services/invitations.service';
import { RolesService } from '../../services/roles.service';
import { type InviteRoleGroup, invitableRoleGroups } from '../../utils/invite-roles.util';
import {
  EVERY_PROPERTY_VALUE,
  type PropertyAccessValue,
  propertyAccessValidator,
  toPropertyIds,
} from '../../utils/property-access.util';
import { PropertyAccessPicker } from '../property-access-picker/property-access-picker';

const DEFAULT_ROLE = 'member';

@Component({
  selector: 'app-invite-staff-dialog',
  imports: [ReactiveFormsModule, Select, ErrorBanner, FormDialog, PropertyAccessPicker],
  templateUrl: './invite-staff-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteStaffDialog {
  private readonly fb = inject(FormBuilder);
  private readonly invitations = inject(InvitationsService);
  private readonly roles = inject(RolesService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly invited = output<Invitation>();

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    role: [DEFAULT_ROLE, [Validators.required]],
    propertyAccess: this.fb.nonNullable.control<PropertyAccessValue>(EVERY_PROPERTY_VALUE, [propertyAccessValidator]),
  });
  readonly errors = createFormErrors(this.form);
  readonly emailMessages = { required: 'Enter the email to send the invitation to.' };
  readonly propertyMessages = { propertiesRequired: 'Pick at least one property, or give every property.' };

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly roleList = signal<Role[] | null>(null);
  readonly rolesError = signal<string | null>(null);

  readonly roleGroups = computed<InviteRoleGroup[]>(() =>
    invitableRoleGroups(this.roleList() ?? [], (code) => this.auth.can(code)),
  );

  private readonly selectedRoleId = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  readonly selectedRole = computed(
    () =>
      this.roleGroups()
        .flatMap((group) => group.items)
        .find((choice) => choice.value === this.selectedRoleId()) ?? null,
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.form.reset({
          email: '',
          role: DEFAULT_ROLE,
          // Someone limited can only give their own properties, so they pick.
          propertyAccess: this.auth.hasEveryProperty()
            ? EVERY_PROPERTY_VALUE
            : { everyProperty: false, propertyIds: [] },
        });
        this.errors.reset();
        this.errorMessage.set(null);
        this.saving.set(false);
        this.loadRoles();
      });
    });
  }

  loadRoles(): void {
    this.rolesError.set(null);
    this.roles
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => this.roleList.set(roles),
        error: (error: unknown) => this.rolesError.set(apiErrorMessage(error, 'Could not load the roles.')),
      });
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, role, propertyAccess } = this.form.getRawValue();
    const propertyIds = toPropertyIds(propertyAccess);
    this.saving.set(true);
    this.invitations
      .create({ email: email.trim(), role, ...(propertyIds.length > 0 && { propertyIds }) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitation) => {
          this.saving.set(false);
          this.visible.set(false);
          this.invited.emit(invitation);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not send the invitation.'));
        },
      });
  }
}
