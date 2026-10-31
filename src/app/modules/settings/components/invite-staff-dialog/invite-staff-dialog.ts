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
import { PIcon } from '@primeicons/angular/p-icon';
import { catchError, map, of } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import {
  INVITATION_ROLE_LABELS,
  type Invitation,
  type InvitationRole,
} from '../../../../core/models/invitation.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { AccessCatalogService } from '../../services/access-catalog.service';
import { InvitationsService } from '../../services/invitations.service';

interface RoleChoice {
  value: InvitationRole;
  label: string;
  description: string;
}

/** Shown until the catalog answers, or if it can't. The catalog's own words win. */
const FALLBACK_DESCRIPTIONS: Record<InvitationRole, string> = {
  member: 'Day-to-day work. Payments, app logins, the team, and the organization profile stay with owners and admins.',
  admin: 'Every permission.',
};

const INVITE_ROLES: readonly InvitationRole[] = ['member', 'admin'];

@Component({
  selector: 'app-invite-staff-dialog',
  imports: [ReactiveFormsModule, PIcon, ErrorBanner, FormDialog],
  templateUrl: './invite-staff-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InviteStaffDialog {
  private readonly fb = inject(FormBuilder);
  private readonly invitations = inject(InvitationsService);
  private readonly catalog = inject(AccessCatalogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly invited = output<Invitation>();

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    role: ['member' as InvitationRole, [Validators.required]],
  });
  readonly errors = createFormErrors(this.form);
  readonly emailMessages = { required: 'Enter the email to send the invitation to.' };

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly selectedRole = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  readonly isAdmin = computed(() => this.selectedRole() === 'admin');

  private readonly catalogDescriptions = toSignal(
    this.catalog.catalog().pipe(
      map((catalog) => new Map(catalog.roles.map((role) => [role.id as string, role.description]))),
      catchError(() => of(new Map<string, string>())),
    ),
    { initialValue: new Map<string, string>() },
  );

  readonly roleChoices = computed<RoleChoice[]>(() =>
    INVITE_ROLES.map((value) => ({
      value,
      label: INVITATION_ROLE_LABELS[value],
      description: this.catalogDescriptions().get(value) ?? FALLBACK_DESCRIPTIONS[value],
    })),
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.form.reset({ email: '', role: 'member' });
        this.errors.reset();
        this.errorMessage.set(null);
        this.saving.set(false);
      });
    });
  }

  selectRole(role: InvitationRole): void {
    this.form.controls.role.setValue(role);
    this.form.controls.role.markAsDirty();
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, role } = this.form.getRawValue();
    this.saving.set(true);
    this.invitations
      .create({ email: email.trim(), role })
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
