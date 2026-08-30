import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PortalAccessResponse } from '../../../../core/models/portal-access.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { copyToClipboard } from '../../../../shared/utils/clipboard.util';
import { TenantsService } from '../../services/tenants.service';
import {
  ONE_TIME_PASSWORD_WARNING,
  portalAccessBadge,
  visibleOneTimePassword,
} from '../../utils/portal-access.util';

@Component({
  selector: 'app-residence-care-access',
  imports: [ReactiveFormsModule, PIcon, StatusBadge],
  templateUrl: './residence-care-access.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidenceCareAccess {
  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tenantId = input.required<string>();
  readonly defaultEmail = input<string | null>(null);

  readonly canMutate = this.auth.isFinancialAdmin;
  readonly oneTimePasswordWarning = ONE_TIME_PASSWORD_WARNING;
  readonly access = signal<PortalAccessResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly oneTimePassword = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly errors = createFormErrors(this.form);

  readonly badge = computed(() => portalAccessBadge(this.access()?.status ?? 'INACTIVE'));

  constructor() {
    effect(() => {
      const id = this.tenantId();
      this.form.patchValue({ email: this.defaultEmail() ?? '' });
      this.oneTimePassword.set(null);
      this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenants
      .getPortalAccess(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (access) => {
          this.access.set(access);
          this.loading.set(false);
          if (access.email) this.form.patchValue({ email: access.email });
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load Residence Care access.'));
        },
      });
  }

  activate(): void {
    this.errors.submitted.set(true);
    if (this.form.invalid || !this.canMutate()) {
      this.form.markAllAsTouched();
      return;
    }
    this.run('activate', () =>
      this.tenants.activatePortalAccess(this.tenantId(), this.form.controls.email.value.trim()),
    );
  }

  resetAccess(): void {
    this.confirm('Reset access', 'Generate a new temporary password and revoke existing sessions?', 'Reset', () =>
      this.run('reset', () => this.tenants.resetPortalAccess(this.tenantId())),
    );
  }

  disable(): void {
    this.confirm('Disable access', 'The tenant cannot sign in until you reactivate. History is kept.', 'Disable', () =>
      this.run('disable', () => this.tenants.disablePortalAccess(this.tenantId())),
    );
  }

  reactivate(): void {
    this.run('reactivate', () => this.tenants.reactivatePortalAccess(this.tenantId()));
  }

  async copyPassword(): Promise<void> {
    const password = this.oneTimePassword();
    if (!password) return;
    const copied = await copyToClipboard(password);
    this.toast.add({
      severity: copied ? 'success' : 'error',
      summary: copied ? 'Password copied' : 'Could not copy',
      detail: copied ? 'Send it privately. It will not be shown again after you leave this page.' : undefined,
    });
  }

  private confirm(header: string, message: string, accept: string, action: () => void): void {
    this.confirmation.confirm({
      header,
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: accept, severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: action,
    });
  }

  private run(
    kind: 'activate' | 'reset' | 'disable' | 'reactivate',
    request: () => ReturnType<TenantsService['activatePortalAccess']>,
  ): void {
    this.busy.set(true);
    this.error.set(null);
    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (access) => {
          this.busy.set(false);
          this.access.set(access);
          this.oneTimePassword.set(visibleOneTimePassword(access.temporaryPassword));
          if (access.email) this.form.patchValue({ email: access.email });
          this.toast.add({
            severity: 'success',
            summary:
              kind === 'activate'
                ? 'Residence Care activated'
                : kind === 'reset'
                  ? 'Password reset'
                  : kind === 'disable'
                    ? 'Access disabled'
                    : 'Access reactivated',
          });
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not update access',
            detail: apiErrorMessage(error),
          });
        },
      });
  }
}
