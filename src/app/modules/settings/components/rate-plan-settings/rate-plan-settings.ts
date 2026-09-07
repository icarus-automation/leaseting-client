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
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import {
  PARKING_BILLING_BASIS_OPTIONS,
  PARKING_BILLING_BASIS_UNIT,
  type ParkingBillingBasis,
} from '../../../../core/models/enums';
import type { RatePlanAmountResponse, RatePlanResponse } from '../../../../core/models/rate-plan.types';
import type { VehicleTypeResponse } from '../../../../core/models/vehicle-type.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { sortLookupRows } from '../../../../shared/utils/lookup-order.util';
import { RatePlansService } from '../../services/rate-plans.service';
import { VehicleTypesService } from '../../services/vehicle-types.service';
import {
  compactAmountLine,
  formatParkingWindow,
  minutesToClock,
  openingBandHint,
  toRatePlanPayload,
} from '../../utils/parking-clock.util';
import { billedHint, sortRatePlans } from '../../utils/rate-plan-order.util';

interface PriceCell {
  id: string;
  name: string;
  amount: string | null;
  isArchived: boolean;
}

/**
 * Settings → Rate plans. One row per named plan; succeeding prices sit in a
 * grid keyed by vehicle type. Optional opening bands (flat) and an optional
 * overnight window (overtime ₱/hour) live on the plan, not on Parking rules.
 */
@Component({
  selector: 'app-rate-plan-settings',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PIcon,
    InputNumber,
    PhpCurrencyPipe,
    SegmentedControl,
    Skeleton,
    StatusBadge,
  ],
  templateUrl: './rate-plan-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatePlanSettings {
  private readonly fb = inject(FormBuilder);
  private readonly ratePlans = inject(RatePlansService);
  private readonly vehicleTypesApi = inject(VehicleTypesService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<RatePlanResponse[] | null>(null);
  readonly vehicleTypes = signal<VehicleTypeResponse[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.items() === null && this.error() === null);

  readonly basisOptions = PARKING_BILLING_BASIS_OPTIONS;
  readonly billedHint = billedHint;
  readonly basisUnit = PARKING_BILLING_BASIS_UNIT;
  readonly openingBandHint = openingBandHint;
  readonly formatParkingWindow = formatParkingWindow;
  readonly compactAmountLine = compactAmountLine;

  readonly activeTypes = computed(() =>
    sortLookupRows((this.vehicleTypes() ?? []).filter((type) => !type.isArchived)),
  );

  readonly createForm = this.buildForm();
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly editForm = this.buildForm();
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);

  readonly busyId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  constructor() {
    this.load();
  }

  load(): void {
    this.items.set(null);
    this.vehicleTypes.set(null);
    this.error.set(null);
    forkJoin({
      types: this.vehicleTypesApi.list(),
      plans: this.ratePlans.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ types, plans }) => {
          this.vehicleTypes.set(types);
          this.items.set(plans);
          this.syncPriceGrids(this.createForm, this.activeTypes());
        },
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'Could not load rate plans.')),
      });
  }

  setBasis(form: ReturnType<RatePlanSettings['buildForm']>, basis: ParkingBillingBasis): void {
    form.controls.billingBasis.setValue(basis);
    form.controls.billingBasis.markAsDirty();
  }

  durationTiersOf(form: ReturnType<RatePlanSettings['buildForm']>) {
    return form.controls.durationTiers;
  }

  addOpeningBand(form: ReturnType<RatePlanSettings['buildForm']>, types: VehicleTypeResponse[]): void {
    form.controls.durationTiers.push(this.buildTierGroup(types));
  }

  removeOpeningBand(form: ReturnType<RatePlanSettings['buildForm']>, index: number): void {
    form.controls.durationTiers.removeAt(index);
  }

  priceCells(plan: RatePlanResponse, amounts: RatePlanAmountResponse[] = plan.amounts): PriceCell[] {
    const byId = new Map(amounts.map((amount) => [amount.vehicleTypeId, amount]));
    return this.columnTypes(plan).map((type) => ({
      id: type.id,
      name: type.name,
      amount: byId.get(type.id)?.amount ?? null,
      isArchived: type.isArchived,
    }));
  }

  submitCreate(): void {
    if (this.createForm.controls.name.invalid) {
      this.createError.set('Use at least 2 characters.');
      return;
    }
    const built = this.payloadOf(this.createForm);
    if (!built.ok) {
      this.createError.set(built.error);
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.ratePlans
      .create(built.payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.resetCreateForm();
          this.replaceItem(created);
          this.flashId.set(created.id);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(error, 'Could not add the rate plan.'));
        },
      });
  }

  startEdit(item: RatePlanResponse): void {
    const types = this.columnTypes(item);
    this.editForm.reset({
      name: item.name,
      billingBasis: item.billingBasis,
      increment: item.increment,
      windowEnabled: item.windowStartMinute !== null && item.windowEndMinute !== null,
      windowStart: minutesToClock(item.windowStartMinute ?? 18 * 60),
      windowEnd: minutesToClock(item.windowEndMinute ?? 6 * 60),
    });
    this.syncPriceGrids(this.editForm, types, {
      amounts: this.amountMap(item.amounts),
      overtime: this.amountMap(item.overtimeAmounts),
      tiers: item.durationTiers.map((tier) => ({
        incrementCount: tier.incrementCount,
        amounts: this.amountMap(tier.amounts),
      })),
    });
    this.editingId.set(item.id);
    this.editError.set(null);
    queueMicrotask(() => this.editInput()?.nativeElement.focus());
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  submitEdit(): void {
    const id = this.editingId();
    if (!id) return;
    if (this.editForm.controls.name.invalid) {
      this.editError.set('Use at least 2 characters.');
      return;
    }
    const built = this.payloadOf(this.editForm);
    if (!built.ok) {
      this.editError.set(built.error);
      return;
    }

    this.saving.set(true);
    this.editError.set(null);
    this.ratePlans
      .update(id, built.payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editingId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.editError.set(apiErrorMessage(error, 'Could not save the rate plan.'));
        },
      });
  }

  confirmArchive(item: RatePlanResponse): void {
    this.confirmation.confirm({
      header: 'Archive rate plan',
      message: `Archive “${item.name}”? It leaves the picker for new parking stays. History that already used it is untouched.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Archive', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.archive(item),
    });
  }

  restore(item: RatePlanResponse): void {
    this.busyId.set(item.id);
    this.ratePlans
      .restore(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Restore failed',
            detail: apiErrorMessage(error, 'Could not restore the rate plan.'),
          });
        },
      });
  }

  columnTypes(plan: RatePlanResponse): VehicleTypeResponse[] {
    const extra = plan.amounts
      .concat(plan.overtimeAmounts, ...plan.durationTiers.map((tier) => tier.amounts))
      .filter((amount) => amount.vehicleTypeIsArchived)
      .map((amount) => ({
        id: amount.vehicleTypeId,
        name: amount.vehicleTypeName,
        isArchived: true,
        ratePlanCount: 0,
        createdAt: '',
        updatedAt: '',
      }));
    const seen = new Set<string>();
    const uniqueExtra = extra.filter((type) => (seen.has(type.id) ? false : (seen.add(type.id), true)));
    return sortLookupRows([...this.activeTypes(), ...uniqueExtra]);
  }

  private archive(item: RatePlanResponse): void {
    this.busyId.set(item.id);
    this.ratePlans
      .archive(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.toast.add({ severity: 'success', summary: 'Rate plan archived' });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Archive failed',
            detail: apiErrorMessage(error, 'Could not archive the rate plan.'),
          });
        },
      });
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      billingBasis: ['PER_HOUR' as ParkingBillingBasis, [Validators.required]],
      increment: [1, [Validators.required, Validators.min(1), Validators.max(365)]],
      amounts: this.fb.group({}),
      durationTiers: this.fb.array<ReturnType<RatePlanSettings['buildTierGroup']>>([]),
      windowEnabled: [false],
      windowStart: ['18:00'],
      windowEnd: ['06:00'],
      overtimeAmounts: this.fb.group({}),
    });
  }

  private buildTierGroup(
    types: VehicleTypeResponse[],
    incrementCount = 3,
    existing?: Map<string, number>,
  ) {
    return this.fb.nonNullable.group({
      incrementCount: [
        incrementCount,
        [Validators.required, Validators.min(1), Validators.max(10080)],
      ],
      amounts: this.amountGroup(types, existing),
    });
  }

  private amountGroup(types: VehicleTypeResponse[], existing?: Map<string, number>) {
    return this.fb.group(
      Object.fromEntries(
        types.map((type) => [
          type.id,
          this.fb.control<number | null>(existing?.get(type.id) ?? null, [Validators.min(0)]),
        ]),
      ),
    );
  }

  private syncPriceGrids(
    form: ReturnType<RatePlanSettings['buildForm']>,
    types: VehicleTypeResponse[],
    existing?: {
      amounts?: Map<string, number>;
      overtime?: Map<string, number>;
      tiers?: { incrementCount: number; amounts: Map<string, number> }[];
    },
  ): void {
    form.setControl('amounts', this.amountGroup(types, existing?.amounts));
    form.setControl('overtimeAmounts', this.amountGroup(types, existing?.overtime));
    form.setControl(
      'durationTiers',
      this.fb.array((existing?.tiers ?? []).map((tier) =>
        this.buildTierGroup(types, tier.incrementCount, tier.amounts),
      )),
    );
  }

  private resetCreateForm(): void {
    this.createForm.reset({
      name: '',
      billingBasis: 'PER_HOUR',
      increment: 1,
      windowEnabled: false,
      windowStart: '18:00',
      windowEnd: '06:00',
    });
    this.syncPriceGrids(this.createForm, this.activeTypes());
  }

  private payloadOf(form: ReturnType<RatePlanSettings['buildForm']>) {
    const value = form.getRawValue();
    return toRatePlanPayload({
      name: value.name,
      billingBasis: value.billingBasis,
      increment: value.increment,
      amounts: value.amounts,
      durationTiers: value.durationTiers,
      windowEnabled: value.windowEnabled,
      windowStart: value.windowStart,
      windowEnd: value.windowEnd,
      overtimeAmounts: value.overtimeAmounts,
    });
  }

  private amountMap(amounts: RatePlanAmountResponse[]): Map<string, number> {
    return new Map(amounts.map((amount) => [amount.vehicleTypeId, Number(amount.amount)]));
  }

  private replaceItem(item: RatePlanResponse): void {
    this.items.update((items) =>
      sortRatePlans([...(items ?? []).filter((existing) => existing.id !== item.id), item]),
    );
  }
}
