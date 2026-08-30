import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  PaymentDestinationPayload,
  PaymentDestinationResponse,
} from '../../../../core/models/payment-destination.types';
import { PAYMENT_METHOD_OPTIONS, type PaymentMethod } from '../../../../core/models/enums';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PropertiesService } from '../../../properties/services/properties.service';
import { PaymentDestinationsService } from '../../services/payment-destinations.service';
import { groupDestinationsByScope } from '../../utils/destination-scope.util';

const ACCEPTED_QR_TYPES = 'image/png,image/jpeg,image/webp';
const MAX_QR_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-payment-destination-settings',
  imports: [ReactiveFormsModule, PIcon, Select, PrivateImage, Skeleton, StatusBadge],
  templateUrl: './payment-destination-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDestinationSettings {
  private readonly fb = inject(FormBuilder);
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canMutate = this.auth.isFinancialAdmin;
  readonly methodOptions = PAYMENT_METHOD_OPTIONS;
  readonly acceptedQrTypes = ACCEPTED_QR_TYPES;

  readonly destinations = signal<PaymentDestinationResponse[] | null>(null);
  readonly properties = signal<PropertyListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.destinations() === null && this.error() === null);
  readonly groups = computed(() => groupDestinationsByScope(this.destinations() ?? []));

  readonly createForm = this.buildForm();
  readonly createErrors = createFormErrors(this.createForm);
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);
  readonly qrFile = signal<File | null>(null);

  readonly editingId = signal<string | null>(null);
  readonly editForm = this.buildForm();
  readonly editErrors = createFormErrors(this.editForm);
  readonly saving = signal(false);
  readonly editQr = signal<File | null>(null);
  readonly previewId = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly propertyOptions = computed(() => [
    { label: 'Organization fallback', value: '' },
    ...this.properties().map((property) => ({ label: property.name, value: property.id })),
  ]);

  constructor() {
    this.load();
    this.propertiesApi
      .list(1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.properties.set(page.data),
      });
  }

  propertyName(propertyId: string | null): string {
    if (!propertyId) return 'Organization fallback';
    return this.properties().find((property) => property.id === propertyId)?.name ?? 'Property';
  }

  qrUrl(id: string): string {
    return this.destinationsApi.qrUrl(id);
  }

  load(): void {
    this.destinations.set(null);
    this.error.set(null);
    this.destinationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (destinations) => this.destinations.set(destinations),
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'Could not load payment destinations.')),
      });
  }

  onQrPicked(event: Event, target: 'create' | 'edit'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (file.size > MAX_QR_BYTES) {
      this.createError.set('QR image must be 10 MB or smaller.');
      return;
    }
    if (target === 'create') this.qrFile.set(file);
    else this.editQr.set(file);
  }

  submitCreate(): void {
    this.createErrors.submitted.set(true);
    if (!this.canMutate() || this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const qr = this.qrFile();
    if (!qr) {
      this.createError.set('Upload a QR image.');
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    this.destinationsApi
      .create(this.payloadOf(this.createForm), qr)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.createForm.reset({
            displayName: '',
            method: 'GCASH',
            accountName: '',
            accountNumber: '',
            instructions: '',
            propertyId: '',
          });
          this.qrFile.set(null);
          this.replace(created);
          this.toast.add({ severity: 'success', summary: 'Destination added' });
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(error, 'Could not add the destination.'));
        },
      });
  }

  startEdit(destination: PaymentDestinationResponse): void {
    this.editingId.set(destination.id);
    this.editQr.set(null);
    this.editErrors.reset();
    this.editForm.reset({
      displayName: destination.displayName,
      method: destination.method,
      accountName: destination.accountName,
      accountNumber: destination.accountNumber,
      instructions: destination.instructions ?? '',
      propertyId: destination.propertyId ?? '',
    });
  }

  submitEdit(): void {
    const id = this.editingId();
    this.editErrors.submitted.set(true);
    if (!id || this.editForm.invalid || !this.canMutate()) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.destinationsApi
      .update(id, this.payloadOf(this.editForm), this.editQr())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editingId.set(null);
          this.replace(updated);
          this.toast.add({ severity: 'success', summary: 'Destination updated' });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not save',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  toggleEnabled(destination: PaymentDestinationResponse): void {
    if (!this.canMutate()) return;
    this.busyId.set(destination.id);
    this.destinationsApi
      .update(destination.id, {
        ...this.asPayload(destination),
        isEnabled: !destination.isEnabled,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replace(updated);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Could not update',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  move(destination: PaymentDestinationResponse, direction: -1 | 1): void {
    const list = this.destinations() ?? [];
    const siblings = list.filter((item) => item.propertyId === destination.propertyId);
    const index = siblings.findIndex((item) => item.id === destination.id);
    const swap = siblings[index + direction];
    if (!swap || !this.canMutate()) return;
    const items = [
      { id: destination.id, displayOrder: swap.displayOrder },
      { id: swap.id, displayOrder: destination.displayOrder },
    ];
    this.destinationsApi
      .reorder(items)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => this.destinations.set(updated),
        error: (error: unknown) =>
          this.toast.add({
            severity: 'error',
            summary: 'Could not reorder',
            detail: apiErrorMessage(error),
          }),
      });
  }

  togglePreview(id: string): void {
    this.previewId.update((current) => (current === id ? null : id));
  }

  private replace(updated: PaymentDestinationResponse): void {
    const list = this.destinations() ?? [];
    const next = list.some((item) => item.id === updated.id)
      ? list.map((item) => (item.id === updated.id ? updated : item))
      : [...list, updated];
    this.destinations.set(next);
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      displayName: ['', [Validators.required, Validators.minLength(1)]],
      method: ['GCASH' as PaymentMethod, [Validators.required]],
      accountName: ['', [Validators.required, Validators.minLength(1)]],
      accountNumber: ['', [Validators.required, Validators.minLength(1)]],
      instructions: [''],
      propertyId: [''],
    });
  }

  private payloadOf(form: ReturnType<PaymentDestinationSettings['buildForm']>): PaymentDestinationPayload {
    const value = form.getRawValue();
    return {
      displayName: value.displayName.trim(),
      method: value.method,
      accountName: value.accountName.trim(),
      accountNumber: value.accountNumber.trim(),
      instructions: value.instructions.trim() || undefined,
      propertyId: value.propertyId || undefined,
    };
  }

  private asPayload(destination: PaymentDestinationResponse): PaymentDestinationPayload {
    return {
      displayName: destination.displayName,
      method: destination.method,
      accountName: destination.accountName,
      accountNumber: destination.accountNumber,
      instructions: destination.instructions ?? undefined,
      propertyId: destination.propertyId,
      isEnabled: destination.isEnabled,
      displayOrder: destination.displayOrder,
    };
  }
}
