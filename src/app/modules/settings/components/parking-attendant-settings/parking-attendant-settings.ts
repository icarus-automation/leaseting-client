import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { Observable } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ParkingAttendantResponse } from '../../../../core/models/parking-attendant.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, type BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { parkingAttendantBadge, sortAttendants } from '../../utils/parking-attendant.util';

/** Shortest password the API accepts. Mirrors the DTO. */
const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-parking-attendant-settings',
  imports: [ReactiveFormsModule, PIcon, Skeleton, StatusBadge],
  templateUrl: './parking-attendant-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingAttendantSettings {
  private readonly fb = inject(FormBuilder);
  private readonly attendants = inject(ParkingAttendantsService);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canMutate = this.auth.isFinancialAdmin;
  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  readonly items = signal<ParkingAttendantResponse[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.items() === null && this.error() === null);

  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  /** Row waiting on a password reset or a disable/enable round-trip. */
  readonly busyId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  /** Row whose password is being retyped inline, and what has been typed. */
  readonly resettingId = signal<string | null>(null);
  readonly newPassword = signal('');
  readonly resetError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(MIN_PASSWORD_LENGTH),
        Validators.maxLength(128),
      ],
    ],
  });
  readonly errors = createFormErrors(this.form);

  /**
   * Named per field: three rows of "This field is required." under one line of
   * inputs says nothing about which input is at fault.
   */
  readonly fieldMessages = {
    name: { required: 'Enter a name for this login.', minlength: 'Use at least 2 characters.' },
    email: { required: 'Enter the login email.' },
    password: {
      required: 'Enter a password.',
      minlength: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    },
  };

  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  constructor() {
    this.load();
  }

  load(): void {
    this.items.set(null);
    this.error.set(null);
    this.attendants
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.items.set(sortAttendants(items)),
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'Could not load parking attendants.')),
      });
  }

  badge(item: ParkingAttendantResponse): { label: string; tone: BadgeTone } {
    return parkingAttendantBadge(item.status);
  }

  submitCreate(): void {
    this.errors.submitted.set(true);
    if (this.form.invalid || !this.canMutate()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.creating.set(true);
    this.createError.set(null);
    this.attendants
      .create(name.trim(), email.trim(), password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.form.reset();
          this.errors.reset();
          this.replaceItem(created);
          this.flashId.set(created.id);
          this.toast.add({ severity: 'success', summary: 'Attendant added' });
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(error, 'Could not add the attendant.'));
        },
      });
  }

  startResetPassword(item: ParkingAttendantResponse): void {
    this.resettingId.set(item.id);
    this.newPassword.set('');
    this.resetError.set(null);
    queueMicrotask(() => this.passwordInput()?.nativeElement.focus());
  }

  cancelResetPassword(): void {
    this.resettingId.set(null);
    this.resetError.set(null);
  }

  onNewPasswordInput(event: Event): void {
    this.newPassword.set((event.target as HTMLInputElement).value);
    this.resetError.set(null);
  }

  submitResetPassword(item: ParkingAttendantResponse): void {
    const password = this.newPassword();
    if (password.length < MIN_PASSWORD_LENGTH) {
      this.resetError.set(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    this.confirm(
      'Reset password',
      `Every terminal signed in as ${item.name} is signed out and has to use the new password.`,
      'Reset',
      () => {
        this.runOnRow(item, () => this.attendants.setPassword(item.id, password), 'Password reset');
        this.cancelResetPassword();
      },
    );
  }

  confirmDisable(item: ParkingAttendantResponse): void {
    this.confirm(
      'Disable attendant',
      `${item.name} can no longer sign in, and any terminal signed in as them is signed out. Past transactions are kept.`,
      'Disable',
      () => this.runOnRow(item, () => this.attendants.disable(item.id), 'Attendant disabled'),
    );
  }

  enable(item: ParkingAttendantResponse): void {
    this.runOnRow(item, () => this.attendants.enable(item.id), 'Attendant enabled');
  }

  private runOnRow(
    item: ParkingAttendantResponse,
    request: () => Observable<ParkingAttendantResponse>,
    summary: string,
  ): void {
    this.busyId.set(item.id);
    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
          this.toast.add({ severity: 'success', summary });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Could not update the attendant',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  private replaceItem(item: ParkingAttendantResponse): void {
    this.items.update((items) =>
      sortAttendants([...(items ?? []).filter((existing) => existing.id !== item.id), item]),
    );
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
}
