import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import {
  ORGANIZATION_PROFILE_LIMITS,
  type OrganizationProfile,
} from '../../../../core/models/organization.types';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { OrganizationProfileService } from '../../services/organization-profile.service';

export type OrganizationSaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'failed'; message: string };

export type OrganizationSettingsState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; profile: OrganizationProfile; save: OrganizationSaveState };

@Component({
  selector: 'app-organization-settings',
  imports: [ReactiveFormsModule, ErrorBanner, Skeleton],
  templateUrl: './organization-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettings {
  private readonly fb = inject(FormBuilder);
  private readonly profileApi = inject(OrganizationProfileService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private requestGeneration = 0;

  readonly canEdit = this.auth.isFinancialAdmin;
  readonly state = signal<OrganizationSettingsState>({ kind: 'loading' });

  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(ORGANIZATION_PROFILE_LIMITS.name.min),
        Validators.maxLength(ORGANIZATION_PROFILE_LIMITS.name.max),
      ],
    ],
    addressLine: ['', [Validators.maxLength(ORGANIZATION_PROFILE_LIMITS.addressLine.max)]],
    city: ['', [Validators.maxLength(ORGANIZATION_PROFILE_LIMITS.city.max)]],
  });

  readonly saving = computed(() => {
    const current = this.state();
    return current.kind === 'ready' && current.save.kind === 'saving';
  });
  readonly saveError = computed(() => {
    const current = this.state();
    return current.kind === 'ready' && current.save.kind === 'failed' ? current.save.message : null;
  });

  constructor() {
    this.load();
  }

  load(): void {
    const generation = ++this.requestGeneration;
    this.state.set({ kind: 'loading' });
    this.profileApi
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (generation !== this.requestGeneration) return;
          this.settle(profile);
        },
        error: (error: unknown) => {
          if (generation !== this.requestGeneration) return;
          this.state.set({
            kind: 'error',
            message: apiErrorMessage(error, 'Could not load organization details.'),
          });
        },
      });
  }

  submit(): void {
    const current = this.state();
    if (current.kind !== 'ready' || !this.canEdit() || current.save.kind === 'saving') return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.state.set({ ...current, save: { kind: 'failed', message: 'Enter a company name.' } });
      return;
    }

    const generation = ++this.requestGeneration;
    this.state.set({ ...current, save: { kind: 'saving' } });
    this.profileApi
      .save(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (generation !== this.requestGeneration) return;
          this.settle(profile);
          this.toast.add({ severity: 'success', summary: 'Organization saved' });
        },
        error: (error: unknown) => {
          if (generation !== this.requestGeneration) return;
          this.state.set({
            kind: 'ready',
            profile: current.profile,
            save: {
              kind: 'failed',
              message: apiErrorMessage(error, 'Could not save organization details.'),
            },
          });
        },
      });
  }

  private settle(profile: OrganizationProfile): void {
    const { name, addressLine, city } = profile;
    this.state.set({ kind: 'ready', profile, save: { kind: 'idle' } });
    this.form.reset({ name, addressLine, city });
  }
}
