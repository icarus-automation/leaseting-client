import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { OnboardingDetail, ResidentStepData } from '../../../../core/models/onboarding.types';
import type { ResidentListItem, ResidentResponse } from '../../../../core/models/resident.types';
import { ResidentsService } from '../../services/residents.service';

interface PickedResident {
  id: string;
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-step-resident',
  imports: [ReactiveFormsModule, PIcon],
  templateUrl: './step-resident.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepResident {
  private readonly fb = inject(FormBuilder);
  private readonly residents = inject(ResidentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<ResidentStepData>();
  readonly back = output<void>();

  readonly selected = signal<PickedResident | null>(null);
  readonly creating = signal(false);
  readonly savingResident = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly search = signal('');
  readonly searchResults = toSignal(
    toObservable(this.search).pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => this.residents.list({ q: q.trim() || undefined, limit: 8 })),
      map((result) => result.data),
    ),
    { initialValue: [] as ResidentListItem[] },
  );

  readonly picked = computed(() => this.selected() ?? this.detail().resident);

  readonly createForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    contactNo: ['', [Validators.required, Validators.pattern(/^\+?[0-9][0-9 -]{6,19}$/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
  });

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  pick(resident: PickedResident): void {
    this.selected.set(resident);
    this.creating.set(false);
    this.errorMessage.set(null);
  }

  createResident(): void {
    this.errorMessage.set(null);
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { firstName, lastName, contactNo, email } = this.createForm.getRawValue();

    this.savingResident.set(true);
    this.residents
      .create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactNo: contactNo.trim(),
        email: email.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resident) => {
          this.savingResident.set(false);
          this.createForm.reset();
          this.pick(resident);
        },
        error: (error: unknown) => {
          this.savingResident.set(false);
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
    const resident = this.picked();
    if (!resident) return;
    this.next.emit({ residentId: resident.id });
  }
}
