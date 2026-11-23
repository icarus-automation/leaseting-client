import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl, type ValidationErrors } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { PAYMENT_DESTINATION_TYPE_LABELS, type PaymentDestinationType } from '../../../../core/models/enums';
import type {
  PaymentDestinationPayload,
  PaymentDestinationResponse,
} from '../../../../core/models/payment-destination.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { PaymentDestinationsService } from '../../services/payment-destinations.service';
import { nextDisplayOrder, ORGANIZATION_FALLBACK_LABEL } from '../../utils/destination-scope.util';

const ACCEPTED_QR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_QR_BYTES = 10 * 1024 * 1024;

interface TypeChoice {
  value: PaymentDestinationType;
  label: string;
  icon: string;
  hint: string;
}

/** Labels, placeholders, and suggestions for the fields a type asks for. */
interface TypeCopy {
  provider: string;
  providerPlaceholder: string;
  providerSuggestions: string[];
  accountNumber: string;
  accountNumberPlaceholder: string;
}

const TYPE_CHOICES: TypeChoice[] = [
  { value: 'BANK_TRANSFER', label: PAYMENT_DESTINATION_TYPE_LABELS.BANK_TRANSFER, icon: 'building-columns', hint: 'BDO, BPI…' },
  { value: 'E_WALLET', label: PAYMENT_DESTINATION_TYPE_LABELS.E_WALLET, icon: 'wallet', hint: 'GCash, Maya…' },
  { value: 'CRYPTO', label: PAYMENT_DESTINATION_TYPE_LABELS.CRYPTO, icon: 'bitcoin', hint: 'USDT, BTC…' },
];

const TYPE_COPY: Record<PaymentDestinationType, TypeCopy> = {
  BANK_TRANSFER: {
    provider: 'Bank',
    providerPlaceholder: 'e.g. BDO',
    providerSuggestions: ['BDO', 'BPI', 'Metrobank', 'UnionBank', 'Security Bank', 'Landbank'],
    accountNumber: 'Account number',
    accountNumberPlaceholder: 'e.g. 0034 5678 9012',
  },
  E_WALLET: {
    provider: 'E-wallet',
    providerPlaceholder: 'e.g. GCash',
    providerSuggestions: ['GCash', 'Maya', 'GrabPay', 'ShopeePay'],
    accountNumber: 'Mobile or account number',
    accountNumberPlaceholder: 'e.g. 0917 123 4567',
  },
  CRYPTO: {
    provider: 'Currency',
    providerPlaceholder: 'e.g. USDT',
    providerSuggestions: ['USDT', 'USDC', 'BTC', 'ETH'],
    accountNumber: '',
    accountNumberPlaceholder: '',
  },
};

/** Required only for the given destination types; re-checked when the type changes. */
function requiredFor(...types: PaymentDestinationType[]) {
  return (control: AbstractControl): ValidationErrors | null => {
    const type = control.parent?.get('type')?.value as PaymentDestinationType | undefined;
    if (!type || !types.includes(type)) return null;
    return String(control.value ?? '').trim() ? null : { required: true };
  };
}

/** Add and Edit share this modal: the type first, then the fields that type needs. */
@Component({
  selector: 'app-payment-destination-dialog',
  imports: [ReactiveFormsModule, PIcon, Select, ErrorBanner, FormDialog, PrivateImage],
  templateUrl: './payment-destination-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDestinationDialog {
  private readonly fb = inject(FormBuilder);
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  /** The destination to edit, or null to add one. */
  readonly destination = input<PaymentDestinationResponse | null>(null);
  readonly properties = input.required<PropertyListItem[]>();
  /** Every destination, to place a new one after its group's last. */
  readonly destinations = input.required<PaymentDestinationResponse[]>();
  /** Whether the organization fallback is on offer: it reaches every property. */
  readonly canUseFallback = input.required<boolean>();
  readonly saved = output<PaymentDestinationResponse>();

  readonly typeChoices = TYPE_CHOICES;
  readonly acceptedQrTypes = ACCEPTED_QR_TYPES.join(',');
  readonly fallbackLabel = ORGANIZATION_FALLBACK_LABEL;

  readonly form = this.fb.nonNullable.group({
    type: ['E_WALLET' as PaymentDestinationType, Validators.required],
    providerName: ['', [Validators.required, Validators.maxLength(60)]],
    accountName: ['', [requiredFor('BANK_TRANSFER', 'E_WALLET'), Validators.maxLength(120)]],
    accountNumber: ['', [requiredFor('BANK_TRANSFER', 'E_WALLET'), Validators.maxLength(80)]],
    network: ['', [requiredFor('CRYPTO'), Validators.maxLength(40)]],
    walletAddress: ['', [requiredFor('CRYPTO'), Validators.maxLength(200)]],
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    propertyId: [''],
    instructions: ['', Validators.maxLength(2000)],
  });
  readonly errors = createFormErrors(this.form);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly qrFile = signal<File | null>(null);
  readonly qrPreviewUrl = signal<string | null>(null);
  readonly qrError = signal<string | null>(null);
  readonly type = signal<PaymentDestinationType>('E_WALLET');

  readonly isEdit = computed(() => this.destination() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit destination' : 'Add destination'));
  readonly copy = computed(() => TYPE_COPY[this.type()]);
  readonly isCrypto = computed(() => this.type() === 'CRYPTO');
  readonly existingQrUrl = computed(() => {
    const destination = this.destination();
    return destination ? this.destinationsApi.qrUrl(destination.id) : null;
  });
  readonly propertyOptions = computed(() => [
    ...(this.canUseFallback() || this.destination()?.propertyId === null ? [{ label: this.fallbackLabel, value: '' }] : []),
    ...this.properties().map((property) => ({ label: property.name, value: property.id })),
  ]);
  readonly dirty = computed(() => this.errors.dirty() || this.qrFile() !== null);

  constructor() {
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      this.type.set(type);
      for (const name of ['accountName', 'accountNumber', 'network', 'walletAddress'] as const) {
        this.form.controls[name].updateValueAndValidity();
      }
    });
    // A new destination is usually named after its provider until someone types a name.
    this.form.controls.providerName.valueChanges.pipe(takeUntilDestroyed()).subscribe((provider) => {
      if (this.isEdit() || this.form.controls.displayName.dirty) return;
      this.form.controls.displayName.setValue(provider, { emitEvent: false });
    });
    effect(() => {
      if (!this.visible()) return;
      const destination = this.destination();
      untracked(() => this.prime(destination));
    });
    this.destroyRef.onDestroy(() => this.clearQrPreview());
  }

  pickType(type: PaymentDestinationType): void {
    if (this.form.controls.type.value === type) return;
    this.form.controls.type.setValue(type);
    this.form.controls.type.markAsDirty();
  }

  onQrPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!ACCEPTED_QR_TYPES.includes(file.type)) {
      this.qrError.set('Use a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > MAX_QR_BYTES) {
      this.qrError.set('The QR image must be 10 MB or smaller.');
      return;
    }
    this.qrError.set(null);
    this.clearQrPreview();
    this.qrFile.set(file);
    this.qrPreviewUrl.set(URL.createObjectURL(file));
  }

  removeQr(): void {
    this.clearQrPreview();
    this.qrFile.set(null);
  }

  submit(): void {
    this.errors.submitted.set(true);
    this.error.set(null);
    const qr = this.qrFile();
    const editing = this.destination();
    if (!editing && !qr) this.qrError.set('Upload the QR residents scan to pay.');
    if (this.form.invalid || (!editing && !qr) || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.form.controls.propertyId.value && !this.canUseFallback()) {
      this.error.set('Pick the property this destination is for.');
      return;
    }

    const payload = this.payload();
    // A new fallback leaves propertyId out (the default); only an edit has to send it empty.
    const request = editing
      ? this.destinationsApi.update(editing.id, payload, qr)
      : this.destinationsApi.create(
          {
            ...payload,
            propertyId: payload.propertyId ?? undefined,
            displayOrder: nextDisplayOrder(this.destinations(), payload.propertyId ?? null),
          },
          qr!,
        );
    this.saving.set(true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (destination) => {
        this.saving.set(false);
        this.errors.reset();
        this.visible.set(false);
        this.saved.emit(destination);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error, editing ? 'Could not save the destination.' : 'Could not add the destination.'));
      },
    });
  }

  fieldError(name: string): string | null {
    return this.errors.fieldError(name);
  }

  private payload(): PaymentDestinationPayload {
    const value = this.form.getRawValue();
    const crypto = value.type === 'CRYPTO';
    return {
      type: value.type,
      providerName: value.providerName.trim(),
      displayName: value.displayName.trim(),
      accountName: crypto ? undefined : value.accountName.trim(),
      accountNumber: crypto ? undefined : value.accountNumber.trim(),
      network: crypto ? value.network.trim() : undefined,
      walletAddress: crypto ? value.walletAddress.trim() : undefined,
      instructions: value.instructions.trim(),
      propertyId: value.propertyId || null,
    };
  }

  private prime(destination: PaymentDestinationResponse | null): void {
    this.error.set(null);
    this.qrError.set(null);
    this.removeQr();
    this.errors.reset();
    const type = destination?.type ?? 'E_WALLET';
    this.type.set(type);
    this.form.reset({
      type,
      providerName: destination?.providerName ?? '',
      accountName: destination?.accountName ?? '',
      accountNumber: destination?.accountNumber ?? '',
      network: destination?.network ?? '',
      walletAddress: destination?.walletAddress ?? '',
      displayName: destination?.displayName ?? '',
      propertyId: destination ? (destination.propertyId ?? '') : this.defaultPropertyId(),
      instructions: destination?.instructions ?? '',
    });
  }

  /** Someone who cannot add a fallback starts on their first property. */
  private defaultPropertyId(): string {
    return this.canUseFallback() ? '' : (this.properties()[0]?.id ?? '');
  }

  private clearQrPreview(): void {
    const url = this.qrPreviewUrl();
    if (url) URL.revokeObjectURL(url);
    this.qrPreviewUrl.set(null);
  }
}
