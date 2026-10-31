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
import { DOCUMENT, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { catchError, map, of, switchMap } from 'rxjs';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../core/auth/auth.service';
import { googleSignInMessage } from '../../../core/auth/google-sign-in.util';
import { apiErrorMessage } from '../../../core/models/api.types';
import type { AcceptedInvitation, InvitationPreview } from '../../../core/models/invitation.types';
import { createFormErrors } from '../../../shared/forms/form-errors';
import { GoogleButton } from '../../../shared/ui/google-button/google-button';
import { AuthLayout } from '../auth-layout/auth-layout';
import { InvitationAcceptService } from '../services/invitation-accept.service';
import {
  type InviteProblem,
  endsInvitation,
  inviteProblemOf,
  missingTokenProblem,
} from './invite-problem.util';

const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-accept-invite',
  imports: [ProgressSpinner, ReactiveFormsModule, RouterLink, DatePipe, PIcon, AuthLayout, GoogleButton],
  templateUrl: './accept-invite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvite {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitations = inject(InvitationAcceptService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  /** The emailed credential. It goes to the two invitation routes and Google sign-in, nowhere else. */
  private readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  /** Set when Google sign-in sent the browser back here with a refusal. */
  private readonly googleError = this.route.snapshot.queryParamMap.get('error');

  readonly minPasswordLength = MIN_PASSWORD_LENGTH;

  readonly preview = signal<InvitationPreview | null>(null);
  readonly problem = signal<InviteProblem | null>(null);
  readonly joined = signal<AcceptedInvitation | null>(null);

  readonly googleLoading = signal(false);
  readonly googleNotice = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH), Validators.maxLength(128)]],
  });
  readonly errors = createFormErrors(this.form);
  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  /** 'Member', 'Admin', or the custom role's name. */
  readonly roleLabel = computed(() => this.preview()?.roleName ?? 'a team member');

  readonly nameMessages = { required: 'Enter your name.', minlength: 'Use at least 2 characters.' };
  readonly passwordMessages = computed(() => ({
    required: this.preview()?.hasAccount ? 'Enter your Leaseting password.' : 'Choose a password.',
    minlength: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
    maxlength: 'Use 128 characters or fewer.',
  }));

  /** Under the password: its error once shown, otherwise the length rule for a new password. */
  readonly passwordDescribedBy = computed(() => {
    if (this.errors.fieldError('password', this.passwordMessages())) return 'invite-password-error';
    return this.preview()?.hasAccount === false ? 'invite-password-hint' : null;
  });

  constructor() {
    if (this.googleError) this.clearGoogleErrorFromUrl();
    this.loadPreview();
  }

  loadPreview(): void {
    if (!this.token) {
      this.problem.set(missingTokenProblem());
      return;
    }
    this.problem.set(null);
    this.preview.set(null);
    this.invitations
      .preview(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.configureForm(preview);
          this.googleNotice.set(this.noticeFor(this.googleError, preview));
          this.preview.set(preview);
        },
        error: (error: unknown) => this.problem.set(inviteProblemOf(error)),
      });
  }

  togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }

  continueWithGoogle(): void {
    if (!this.token || this.googleLoading()) return;
    const origin = this.document.location.origin;
    this.googleLoading.set(true);
    this.googleNotice.set(null);
    this.auth
      .startGoogleSignIn({
        callbackURL: `${origin}/dashboard`,
        // Back here on a refusal, so the page can say why and offer the password route.
        errorCallbackURL: `${origin}/accept-invite?token=${encodeURIComponent(this.token)}`,
        invitationToken: this.token,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (url) => this.document.location.assign(url),
        error: (error: unknown) => {
          this.googleLoading.set(false);
          this.googleNotice.set(
            error instanceof HttpErrorResponse && error.status === 404
              ? "Google sign-in isn't turned on for Leaseting. Use a password below."
              : "Couldn't open Google sign-in. Try again, or use a password below.",
          );
        },
      });
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.submitError.set(null);
    const preview = this.preview();
    if (!preview || this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const { name, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.invitations
      .accept({ token: this.token, password, ...(preview.hasAccount ? {} : { name: name.trim() }) })
      .pipe(
        switchMap((accepted) =>
          this.auth.signIn({ email: preview.email, password }, accepted.organizationId).pipe(
            map(() => ({ accepted, signedIn: true })),
            catchError(() => of({ accepted, signedIn: false })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ accepted, signedIn }) => {
          this.submitting.set(false);
          if (signedIn) {
            void this.router.navigateByUrl('/dashboard');
          } else {
            this.joined.set(accepted);
          }
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          if (endsInvitation(error)) {
            this.problem.set(inviteProblemOf(error));
            return;
          }
          this.submitError.set(apiErrorMessage(error, 'Could not accept the invitation. Try again.'));
          if ((error as { status?: number }).status === 401) this.passwordInput()?.nativeElement.select();
        },
      });
  }

  private configureForm(preview: InvitationPreview): void {
    const name = this.form.controls.name;
    name.setValidators(
      preview.hasAccount ? [] : [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
    );
    name.updateValueAndValidity();
  }

  private noticeFor(code: string | null, preview: InvitationPreview): string | null {
    if (code === 'invite_email_mismatch') {
      return `That Google account isn't ${preview.email}. Continue with Google using ${preview.email}, or use a password below.`;
    }
    return googleSignInMessage(code);
  }

  /** The reason is shown once; a reload shouldn't show it again. */
  private clearGoogleErrorFromUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { error: null, error_description: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private focusFirstInvalid(): void {
    if (this.form.controls.name.invalid) {
      this.nameInput()?.nativeElement.focus();
    } else if (this.form.controls.password.invalid) {
      this.passwordInput()?.nativeElement.focus();
    }
  }
}
