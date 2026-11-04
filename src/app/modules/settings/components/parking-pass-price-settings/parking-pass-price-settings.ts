import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import type { VehicleTypeResponse } from '../../../../core/models/vehicle-type.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { PropertiesService } from '../../../properties/services/properties.service';
import { ParkingPassesService } from '../../../parking-passes/services/parking-passes.service';
import { VehicleTypesService } from '../../services/vehicle-types.service';

@Component({
  selector: 'app-parking-pass-price-settings',
  imports: [ReactiveFormsModule, RouterLink, Select, ErrorBanner, Skeleton],
  templateUrl: './parking-pass-price-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingPassPriceSettings {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly vehiclesApi = inject(VehicleTypesService);
  private readonly passes = inject(ParkingPassesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = computed(() => this.auth.can('parking_setup:manage'));
  readonly properties = signal<PropertyListItem[] | null>(null);
  readonly types = signal<VehicleTypeResponse[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly saved = signal(false);

  readonly propertyControl = new FormControl('', { nonNullable: true });
  readonly propertyOptions = computed(() =>
    (this.properties() ?? []).map((property) => ({ label: property.name, value: property.id })),
  );

  readonly form = this.fb.nonNullable.group({
    graceDays: [0, [Validators.required, Validators.min(0), Validators.max(366)]],
  });
  readonly amounts = this.fb.group<Record<string, FormControl<number | null>>>({});
  readonly errors = createFormErrors(this.form);

  constructor() {
    forkJoin({ properties: this.propertiesApi.listAll(), vehicles: this.vehiclesApi.list() })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ properties, vehicles }) => {
          const active = vehicles.filter((type) => !type.isArchived);
          this.types.set(active);
          for (const type of active) {
            this.amounts.addControl(type.id, this.fb.control<number | null>(null));
          }
          this.properties.set(properties);
          if (!this.canManage()) {
            this.form.disable();
            this.amounts.disable();
          }
        },
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load properties.')),
      });

    this.propertyControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((propertyId) => {
      this.saved.set(false);
      if (!propertyId) return;
      this.load(propertyId);
    });
  }

  amountControl(id: string): FormControl<number | null> {
    return this.amounts.controls[id];
  }

  load(propertyId = this.propertyControl.value): void {
    if (!propertyId) return;
    this.loading.set(true);
    this.error.set(null);
    this.passes
      .prices(propertyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (prices) => {
          if (this.propertyControl.value !== propertyId) return;
          this.form.controls.graceDays.setValue(prices.graceDays);
          for (const type of this.types()) {
            const row = prices.prices.find((price) => price.vehicleTypeId === type.id);
            this.amountControl(type.id).setValue(row ? Number(row.amount) : null);
          }
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (this.propertyControl.value !== propertyId) return;
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load pass prices.'));
        },
      });
  }

  save(): void {
    const propertyId = this.propertyControl.value;
    this.errors.submitted.set(true);
    if (!propertyId || this.form.invalid || this.saving() || !this.canManage()) return;
    const prices = this.types().flatMap((type) => {
      const amount = this.amountControl(type.id).value;
      if (amount === null || amount === undefined || Number.isNaN(amount)) return [];
      return [{ vehicleTypeId: type.id, amount: Math.round(amount * 100) / 100 }];
    });
    if (prices.some((price) => price.amount < 0.01)) {
      this.error.set('Enter a price above zero, or leave the vehicle type blank.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);
    this.passes
      .replacePrices(propertyId, { graceDays: this.form.controls.graceDays.value, prices })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.set(true);
          this.errors.reset();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(error, 'Could not save pass prices.'));
        },
      });
  }
}
