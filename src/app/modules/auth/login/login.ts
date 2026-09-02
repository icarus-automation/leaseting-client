import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthService } from '../../../core/auth/auth.service';
import { WrongAppError } from '../../../core/auth/audience.util';
import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, PIcon, AuthShell],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    // UI only — not sent to the API, not yet consumed.
    rememberMe: [false],
  });

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  private readonly submitted = signal(false);

  // A reactive tick on any form change (value / touched / status) so validation
  // display stays correct under OnPush without manual change detection.
  private readonly formTick = toSignal(this.form.events, { initialValue: null });

  readonly emailError = computed(() => {
    this.formTick();
    return this.fieldError('email', 'Email');
  });

  readonly passwordError = computed(() => {
    this.formTick();
    return this.fieldError('password', 'Password');
  });

  constructor() {
    afterNextRender(() => this.emailInput()?.nativeElement.focus());
  }

  togglePassword(): void {
    this.showPassword.update((shown) => !shown);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.loading.set(true);
    this.auth
      .signIn({ email, password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigateByUrl('/dashboard');
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private fieldError(name: 'email' | 'password', label: string): string | null {
    const control = this.form.controls[name];
    const show = control.invalid && (control.touched || this.submitted());
    if (!show) return null;

    if (control.hasError('required')) return `${label} is required.`;
    if (control.hasError('email')) return 'Enter a valid email address.';
    return `Check the ${label.toLowerCase()} field.`;
  }

  private focusFirstInvalid(): void {
    if (this.form.controls.email.invalid) {
      this.emailInput()?.nativeElement.focus();
    }
  }

  private resolveError(error: unknown): string {
    // Already user-facing: it names the app this account belongs to.
    if (error instanceof WrongAppError) return error.message;
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      return 'Your account has no organization yet. Ask your administrator for an invite.';
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return "Can't reach the server. Check your connection and try again.";
      }
      if (error.status === 401 || error.status === 403 || error.status === 422) {
        return 'Incorrect email or password.';
      }
      if (error.status === 429) {
        return 'Too many attempts. Wait a moment, then try again.';
      }
      if (error.status >= 500) {
        return 'Something went wrong on our end. Please try again shortly.';
      }
    }
    return 'Sign-in failed. Please try again.';
  }
}
