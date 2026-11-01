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
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { ProgressSpinner } from 'primeng/progressspinner';

import type { Member } from '../../../../core/models/member.types';
import type { PortalAccessResponse } from '../../../../core/models/portal-access.types';
import type { ResidentListItem } from '../../../../core/models/resident.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { copyToClipboard } from '../../../../shared/utils/clipboard.util';
import { ResidentLoginsService } from '../../services/resident-logins.service';
import {
  ONE_TIME_PASSWORD_WARNING,
  RESIDENT_LOGIN_HELPER_TEXT,
  residentFullName,
  residentLoginErrorMessage,
  visibleOneTimePassword,
} from '../../utils/resident-login.util';

const SEARCH_DEBOUNCE_MS = 250;

interface ResidentOption {
  id: string;
  label: string;
  email: string | null;
}

export interface ResidentLoginOutcome {
  kind: 'setup' | 'reset';
  email: string;
}

/**
 * Sets up a resident's Residence Care login, or resets the password of one that
 * exists, then shows the temporary password once. Both say how to hand it over.
 */
@Component({
  selector: 'app-resident-login-dialog',
  imports: [ProgressSpinner, ReactiveFormsModule, PIcon, Select, ErrorBanner, FormDialog],
  templateUrl: './resident-login-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentLoginDialog {
  private readonly fb = inject(FormBuilder);
  private readonly logins = inject(ResidentLoginsService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required<FormDialog>('dialog');

  readonly visible = model.required<boolean>();
  /** The login to reset. With none, the dialog sets up a new login. */
  readonly member = input<Member | null>(null);
  readonly finished = output<ResidentLoginOutcome>();

  readonly helperText = RESIDENT_LOGIN_HELPER_TEXT;
  readonly oneTimeWarning = ONE_TIME_PASSWORD_WARNING;

  readonly isReset = computed(() => this.member() !== null);
  readonly stage = signal<'form' | 'result'>('form');
  readonly heading = computed(() => {
    if (this.stage() === 'result') return 'Temporary password';
    return this.isReset() ? 'Reset password' : 'Add tenant login';
  });
  readonly subheading = computed(() => {
    if (this.stage() === 'result') return 'Send it now. It is not shown again.';
    return this.isReset() ? (this.member()?.name ?? null) : 'Give a tenant the Residence Care app.';
  });

  readonly form = this.fb.group({
    residentId: this.fb.control<string | null>(null, [Validators.required]),
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(254)]),
  });
  readonly errors = createFormErrors(this.form);
  readonly residentMessages = { required: 'Pick the tenant this login is for.' };
  readonly emailMessages = { required: 'Enter the email they will sign in with.' };

  private readonly found = signal<ResidentOption[]>([]);
  private readonly picked = signal<ResidentOption | null>(null);
  readonly loadingResidents = signal(false);
  private readonly search$ = new Subject<string>();

  /** The chosen resident stays listed while a narrower search replaces the rest. */
  readonly residentOptions = computed(() => {
    const picked = this.picked();
    const found = this.found();
    return picked && !found.some((option) => option.id === picked.id) ? [picked, ...found] : found;
  });
  /** The chosen resident already has a login, so there is nothing to set up. */
  readonly existingLogin = signal<PortalAccessResponse | null>(null);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly credentials = signal<{ email: string; password: string } | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.stage.set('form');
        this.form.reset({ residentId: null, email: '' });
        this.errors.reset();
        this.errorMessage.set(null);
        this.saving.set(false);
        this.credentials.set(null);
        this.existingLogin.set(null);
        this.picked.set(null);
        this.found.set([]);
        if (!this.isReset()) this.search$.next('');
      });
    });

    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((text) => {
          this.loadingResidents.set(true);
          return this.logins.searchActive(text).pipe(catchError(() => of([] as ResidentListItem[])));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((residents) => {
        this.found.set(residents.map(toOption));
        this.loadingResidents.set(false);
      });

    this.form.controls.residentId.valueChanges
      .pipe(
        switchMap((id): Observable<PortalAccessResponse | null> => {
          const option = this.residentOptions().find((candidate) => candidate.id === id) ?? null;
          this.picked.set(option);
          this.existingLogin.set(null);
          if (!option) return of(null);
          this.form.controls.email.setValue(option.email ?? '');
          return this.logins.access(option.id).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((access) => this.existingLogin.set(access && access.status !== 'INACTIVE' ? access : null));
  }

  onResidentFilter(event: { filter?: string | null }): void {
    this.search$.next((event.filter ?? '').trim());
  }

  submit(): void {
    this.errorMessage.set(null);
    const target = this.member();
    if (target) {
      this.run(
        'reset',
        this.logins.findResidentId(target).pipe(switchMap((residentId) => this.logins.reset(residentId))),
        target.email,
      );
      return;
    }

    this.errors.submitted.set(true);
    const { residentId, email } = this.form.getRawValue();
    if (this.form.invalid || !residentId || this.existingLogin()) {
      this.form.markAllAsTouched();
      return;
    }
    this.run('setup', this.logins.activate(residentId, email.trim()), email.trim());
  }

  async copyPassword(): Promise<void> {
    const password = this.credentials()?.password;
    if (!password) return;
    const copied = await copyToClipboard(password);
    this.toast.add({
      severity: copied ? 'success' : 'error',
      summary: copied ? 'Password copied' : 'Could not copy',
      detail: copied ? 'Send it privately. It is not shown again.' : undefined,
    });
  }

  private run(kind: ResidentLoginOutcome['kind'], request: Observable<PortalAccessResponse>, fallbackEmail: string): void {
    this.saving.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (access) => {
        const password = visibleOneTimePassword(access.temporaryPassword);
        const email = access.email ?? fallbackEmail;
        this.saving.set(false);
        this.credentials.set(password ? { email, password } : null);
        this.stage.set('result');
        this.dialog().focusFirstField();
        this.finished.emit({ kind, email });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const fallback = kind === 'reset' ? 'Could not reset the password.' : 'Could not set up the login.';
        this.errorMessage.set(residentLoginErrorMessage(error, fallback));
      },
    });
  }
}

function toOption(resident: ResidentListItem): ResidentOption {
  const name = residentFullName(resident);
  return { id: resident.id, label: resident.email ? `${name} · ${resident.email}` : name, email: resident.email };
}
