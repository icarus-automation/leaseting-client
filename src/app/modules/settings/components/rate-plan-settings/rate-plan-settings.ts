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
  PARKING_BILLING_PERIOD_LABELS,
  PARKING_BILLING_PERIOD_OPTIONS,
  type ParkingBillingPeriod,
} from '../../../../core/models/enums';
import type { RatePlanResponse } from '../../../../core/models/rate-plan.types';
import type { VehicleTypeResponse } from '../../../../core/models/vehicle-type.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { sortLookupRows } from '../../../../shared/utils/lookup-order.util';
import { RatePlansService } from '../../services/rate-plans.service';
import { VehicleTypesService } from '../../services/vehicle-types.service';
import { sortRatePlans } from '../../utils/rate-plan-order.util';

interface PriceCell {
  id: string;
  name: string;
  amount: string | null;
  isArchived: boolean;
}

/**
 * Settings → Rate plans. One row per named plan; prices sit in a grid keyed
 * by vehicle type so "Hourly" is one thing, not three duplicate rows.
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

  readonly periodOptions = PARKING_BILLING_PERIOD_OPTIONS;
  readonly periodLabels = PARKING_BILLING_PERIOD_LABELS;

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
          this.setAmountControls(this.createForm, this.activeTypes());
        },
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'Could not load rate plans.')),
      });
  }

  setPeriod(form: ReturnType<RatePlanSettings['buildForm']>, period: ParkingBillingPeriod): void {
    form.controls.billingPeriod.setValue(period);
    form.controls.billingPeriod.markAsDirty();
  }

  priceCells(plan: RatePlanResponse): PriceCell[] {
    const byId = new Map(plan.amounts.map((amount) => [amount.vehicleTypeId, amount]));
    return this.columnTypes(plan).map((type) => ({
      id: type.id,
      name: type.name,
      amount: byId.get(type.id)?.amount ?? null,
      isArchived: type.isArchived,
    }));
  }

  billedHint(period: ParkingBillingPeriod): string {
    return `Billed ${this.periodLabels[period].toLowerCase()}`;
  }

  submitCreate(): void {
    if (this.createForm.controls.name.invalid) {
      this.createError.set('Use at least 2 characters.');
      return;
    }
    const payload = this.payloadOf(this.createForm);
    if (payload.amounts.length === 0) {
      this.createError.set('Set a price for at least one vehicle type.');
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.ratePlans
      .create(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.createForm.reset({ name: '', billingPeriod: 'HOURLY' });
          this.setAmountControls(this.createForm, this.activeTypes());
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
    const existing = new Map(
      item.amounts.map((amount) => [amount.vehicleTypeId, Number(amount.amount)]),
    );
    this.editForm.reset({ name: item.name, billingPeriod: item.billingPeriod });
    this.setAmountControls(this.editForm, this.columnTypes(item), existing);
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
    const payload = this.payloadOf(this.editForm);
    if (payload.amounts.length === 0) {
      this.editError.set('Set a price for at least one vehicle type.');
      return;
    }

    this.saving.set(true);
    this.editError.set(null);
    this.ratePlans
      .update(id, payload)
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

  private columnTypes(plan: RatePlanResponse): VehicleTypeResponse[] {
    const active = this.activeTypes();
    const extra = plan.amounts
      .filter((amount) => amount.vehicleTypeIsArchived)
      .map((amount) => ({
        id: amount.vehicleTypeId,
        name: amount.vehicleTypeName,
        isArchived: true,
        ratePlanCount: 0,
        createdAt: '',
        updatedAt: '',
      }));
    return sortLookupRows([...active, ...extra]);
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      billingPeriod: ['HOURLY' as ParkingBillingPeriod, [Validators.required]],
      amounts: this.fb.group({}),
    });
  }

  private setAmountControls(
    form: ReturnType<RatePlanSettings['buildForm']>,
    types: VehicleTypeResponse[],
    existing?: Map<string, number>,
  ): void {
    form.setControl(
      'amounts',
      this.fb.group(
        Object.fromEntries(
          types.map((type) => [
            type.id,
            this.fb.control<number | null>(existing?.get(type.id) ?? null, [Validators.min(0)]),
          ]),
        ),
      ),
    );
  }

  private payloadOf(form: ReturnType<RatePlanSettings['buildForm']>) {
    const { name, billingPeriod, amounts } = form.getRawValue();
    const priced = Object.entries(amounts).flatMap(([vehicleTypeId, amount]) =>
      typeof amount === 'number' ? [{ vehicleTypeId, amount }] : [],
    );
    return { name: name.trim(), billingPeriod, amounts: priced };
  }

  private replaceItem(item: RatePlanResponse): void {
    this.items.update((items) =>
      sortRatePlans([...(items ?? []).filter((existing) => existing.id !== item.id), item]),
    );
  }
}
