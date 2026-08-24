import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { OnboardingDetail, TenantStepData } from '../../../../core/models/onboarding.types';
import type { TenantListItem, TenantResponse } from '../../../../core/models/tenant.types';
import { TenantsService } from '../../services/tenants.service';

interface PickedTenant {
  id: string;
  firstName: string;
  lastName: string;
}

/** Step 2 — pick an existing tenant or create one on the spot. */
@Component({
  selector: 'app-step-tenant',
  imports: [ReactiveFormsModule, PIcon],
  templateUrl: './step-tenant.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepTenant {
  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<TenantStepData>();
  readonly back = output<void>();

  readonly selected = signal<PickedTenant | null>(null);
  readonly creating = signal(false);
  readonly savingTenant = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly search = signal('');
  readonly searchResults = toSignal(
    toObservable(this.search).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => this.tenants.list({ q: q.trim() || undefined, limit: 8 })),
      map((result) => result.data),
    ),
    { initialValue: [] as TenantListItem[] },
  );

  readonly picked = computed(() => this.selected() ?? this.detail().tenant);

  readonly createForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    contactNo: ['', [Validators.required, Validators.pattern(/^\+?[0-9][0-9 -]{6,19}$/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
  });

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  pick(tenant: PickedTenant): void {
    this.selected.set(tenant);
    this.creating.set(false);
    this.errorMessage.set(null);
  }

  createTenant(): void {
    this.errorMessage.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { firstName, lastName, contactNo, email } = this.createForm.getRawValue();

    this.savingTenant.set(true);
    this.tenants
      .create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactNo: contactNo.trim(),
        email: email.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenant) => {
          this.savingTenant.set(false);
          this.createForm.reset();
          this.pick(tenant);
        },
        error: (error: unknown) => {
          this.savingTenant.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not create the tenant.'));
        },
      });
  }

  fieldError(name: 'firstName' | 'lastName' | 'contactNo' | 'email'): string | null {
    const control = this.createForm.controls[name];
    if (!(control.invalid && control.touched)) return null;
    if (control.hasError('required')) return 'Required.';
    if (control.hasError('email')) return 'Enter a valid email.';
    if (control.hasError('pattern')) return 'Enter a valid phone number.';
    return 'Check this field.';
  }

  submit(): void {
    const tenant = this.picked();
    if (!tenant) return;
    this.next.emit({ tenantId: tenant.id });
  }
}
