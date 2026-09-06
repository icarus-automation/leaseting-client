import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import {
  PARKING_ROUNDING_MODE_OPTIONS,
  type ParkingRoundingMode,
} from '../../../../core/models/enums';
import type { ParkingRulesResponse } from '../../../../core/models/parking-rules.types';
import type { RatePlanResponse } from '../../../../core/models/rate-plan.types';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ParkingRulesService } from '../../services/parking-rules.service';
import { RatePlansService } from '../../services/rate-plans.service';
import { billedHint } from '../../utils/rate-plan-order.util';

/**
 * Settings → Parking rules. Org-scoped gate math: grace, default transient
 * plan, rounding. Lost-ticket surcharge is stored on the API but unused in
 * v1 — the field stays visible and disabled.
 */
@Component({
  selector: 'app-parking-rules-settings',
  imports: [ReactiveFormsModule, RouterLink, PIcon, InputNumber, Select, SegmentedControl, Skeleton],
  templateUrl: './parking-rules-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingRulesSettings {
  private readonly fb = inject(FormBuilder);
  private readonly rulesApi = inject(ParkingRulesService);
  private readonly ratePlansApi = inject(RatePlansService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roundingOptions = PARKING_ROUNDING_MODE_OPTIONS;

  readonly rules = signal<ParkingRulesResponse | null>(null);
  readonly plans = signal<RatePlanResponse[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.rules() === null && this.error() === null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    graceMinutes: [0, [Validators.required, Validators.min(0), Validators.max(1440)]],
    defaultTransientRatePlanId: ['', [Validators.required]],
    roundingMode: ['CEIL' as ParkingRoundingMode, [Validators.required]],
  });

  readonly livePlans = computed(() => (this.plans() ?? []).filter((plan) => !plan.isArchived));

  readonly planOptions = computed(() => {
    const currentId = this.form.controls.defaultTransientRatePlanId.value;
    return (this.plans() ?? [])
      .filter((plan) => !plan.isArchived || plan.id === currentId)
      .map((plan) => ({
        value: plan.id,
        label: plan.isArchived
          ? `${plan.name} (archived)`
          : `${plan.name} · ${billedHint(plan.billingBasis, plan.increment)}`,
      }));
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.rules.set(null);
    this.plans.set(null);
    this.error.set(null);
    forkJoin({
      rules: this.rulesApi.get(),
      plans: this.ratePlansApi.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ rules, plans }) => {
          this.rules.set(rules);
          this.plans.set(plans);
          this.form.reset({
            graceMinutes: rules.graceMinutes,
            defaultTransientRatePlanId: rules.defaultTransientRatePlanId ?? '',
            roundingMode: rules.roundingMode,
          });
        },
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'Could not load parking rules.')),
      });
  }

  setRounding(mode: ParkingRoundingMode): void {
    this.form.controls.roundingMode.setValue(mode);
    this.form.controls.roundingMode.markAsDirty();
  }

  submit(): void {
    if (this.livePlans().length === 0) {
      this.saveError.set('Add a live rate plan first.');
      return;
    }
    if (this.form.invalid) {
      this.saveError.set('Pick a default gate plan and a grace of 0 minutes or more.');
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    const { graceMinutes, defaultTransientRatePlanId, roundingMode } = this.form.getRawValue();
    this.rulesApi
      .update({ graceMinutes, defaultTransientRatePlanId, roundingMode })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.rules.set(updated);
          this.form.markAsPristine();
          this.toast.add({ severity: 'success', summary: 'Parking rules saved' });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveError.set(apiErrorMessage(error, 'Could not save parking rules.'));
        },
      });
  }
}
