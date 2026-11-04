import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Select } from 'primeng/select';
import { forkJoin, of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { LeaseListItem } from '../../../../core/models/lease.types';
import type { ParkingPassPrice } from '../../../../core/models/parking-pass.types';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { formatPhp } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { LeasesService } from '../../../leases/services/leases.service';
import { PropertiesService } from '../../../properties/services/properties.service';
import { PaymentDestinationsService } from '../../../settings/services/payment-destinations.service';
import { ParkingPassesService } from '../../services/parking-passes.service';
import { destinationIdFromPayment, passPaymentOptions } from '../../utils/parking-pass.util';

@Component({
  selector: 'app-sell-pass-dialog',
  imports: [ReactiveFormsModule, RouterLink, Select, ErrorBanner, FormDialog],
  templateUrl: './sell-pass-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellPassDialog {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly passes = inject(ParkingPassesService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly leasesApi = inject(LeasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly saved = output<void>();

  readonly canLinkLease = computed(() => this.auth.can('leases:view'));
  readonly properties = signal<PropertyListItem[]>([]);
  readonly destinations = signal<PaymentDestinationResponse[]>([]);
  readonly prices = signal<ParkingPassPrice[]>([]);
  readonly leases = signal<LeaseListItem[]>([]);
  readonly loadingCatalog = signal(false);
  readonly loadingProperty = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    propertyId: ['', Validators.required],
    vehicleTypeId: ['', Validators.required],
    plate: ['', [Validators.required, Validators.maxLength(20)]],
    holderName: [
      '',
      (control: AbstractControl) => {
        const leaseId = control.parent?.get('leaseId')?.value as string | null;
        if (!leaseId && !String(control.value ?? '').trim()) return { required: true };
        return null;
      },
    ],
    holderContact: ['', Validators.maxLength(120)],
    leaseId: [''],
    payment: ['cash', Validators.required],
  });
  readonly errors = createFormErrors(this.form);
  private readonly propertyId = toSignal(this.form.controls.propertyId.valueChanges, { initialValue: '' });

  readonly propertyOptions = computed(() => this.properties().map((property) => ({ label: property.name, value: property.id })));
  readonly typeOptions = computed(() =>
    this.prices().map((price) => ({
      value: price.vehicleTypeId,
      label: `${price.vehicleTypeName} · ${formatPhp(price.amount)}`,
    })),
  );
  readonly leaseOptions = computed(() =>
    this.leases().map((lease) => ({
      id: lease.id,
      label: `${lease.resident.firstName} ${lease.resident.lastName} · Unit ${lease.unit.unitNo}`,
    })),
  );
  readonly paymentOptions = computed(() => passPaymentOptions(this.destinations(), this.propertyId()));

  constructor() {
    this.form.controls.propertyId.valueChanges.pipe(takeUntilDestroyed()).subscribe((propertyId) => {
      this.form.controls.vehicleTypeId.setValue('');
      this.form.controls.leaseId.setValue('');
      this.form.controls.payment.setValue('cash');
      this.loadProperty(propertyId);
    });
    this.form.controls.leaseId.valueChanges.pipe(takeUntilDestroyed()).subscribe((leaseId) => {
      const lease = this.leases().find((item) => item.id === leaseId);
      if (lease && !this.form.controls.holderName.value.trim()) {
        this.form.controls.holderName.setValue(`${lease.resident.firstName} ${lease.resident.lastName}`);
      }
      this.form.controls.holderName.updateValueAndValidity();
    });

    effect(() => {
      if (!this.visible()) return;
      untracked(() => this.prepare());
    });
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.form.controls.holderName.updateValueAndValidity();
    const name = this.form.controls.holderName.value.trim();
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.passes
      .sell({
        propertyId: raw.propertyId,
        vehicleTypeId: raw.vehicleTypeId,
        plate: raw.plate.trim(),
        holderName: name || undefined,
        holderContact: raw.holderContact.trim() || undefined,
        leaseId: raw.leaseId || undefined,
        destinationId: destinationIdFromPayment(raw.payment),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.errors.reset();
          this.visible.set(false);
          this.saved.emit();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(error, 'Could not sell the pass.'));
        },
      });
  }

  private prepare(): void {
    this.form.reset({
      propertyId: '',
      vehicleTypeId: '',
      plate: '',
      holderName: '',
      holderContact: '',
      leaseId: '',
      payment: 'cash',
    });
    this.prices.set([]);
    this.leases.set([]);
    this.error.set(null);
    this.errors.reset();
    if (this.properties().length > 0) return;
    this.loadingCatalog.set(true);
    forkJoin({
      properties: this.propertiesApi.listAll(),
      destinations: this.destinationsApi.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ properties, destinations }) => {
          this.properties.set(properties);
          this.destinations.set(destinations);
          this.loadingCatalog.set(false);
        },
        error: (error: unknown) => {
          this.loadingCatalog.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load properties.'));
        },
      });
  }

  private loadProperty(propertyId: string): void {
    if (!propertyId) {
      this.prices.set([]);
      this.leases.set([]);
      return;
    }
    this.loadingProperty.set(true);
    forkJoin({
      prices: this.passes.prices(propertyId),
      leases: this.canLinkLease()
        ? this.leasesApi.list({ propertyId, active: true, limit: 50 })
        : of(null),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ prices, leases }) => {
          if (this.form.controls.propertyId.value !== propertyId) return;
          this.prices.set(prices.prices);
          this.leases.set(leases?.data ?? []);
          this.loadingProperty.set(false);
        },
        error: (error: unknown) => {
          if (this.form.controls.propertyId.value !== propertyId) return;
          this.loadingProperty.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load pass prices for this property.'));
        },
      });
  }
}
