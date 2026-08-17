import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ContractStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import { TenantsService } from '../../services/tenants.service';

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DOC_LABEL = 'Onboarding — Signed contract';

/**
 * Step 4 — the signed lease contract, as a scan or photo. Signing sometimes
 * happens at physical turnover, so the upload can be explicitly deferred.
 */
@Component({
  selector: 'app-step-contract',
  imports: [PIcon],
  templateUrl: './step-contract.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepContract {
  private readonly tenants = inject(TenantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<ContractStepData>();
  readonly back = output<void>();

  readonly acceptedTypes = ACCEPTED_TYPES;

  /** Saved step prefill on resume; local uploads/toggles overwrite. */
  readonly documentId = linkedSignal<string | null>(() => {
    const saved = this.detail().stepsState.contract?.data as Partial<ContractStepData> | undefined;
    return saved?.documentId ?? null;
  });
  readonly deferred = linkedSignal<boolean>(() => {
    const saved = this.detail().stepsState.contract?.data as Partial<ContractStepData> | undefined;
    return saved?.deferred ?? false;
  });

  readonly uploadedName = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly canProceed = computed(() => Boolean(this.documentId()) || this.deferred());

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  attach(): void {
    this.fileInput().nativeElement.click();
  }

  toggleDeferred(): void {
    this.deferred.update((value) => !value);
  }

  onFilePicked(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage.set('File is over 10 MB — upload a smaller scan.');
      return;
    }
    const tenant = this.detail().tenant;
    if (!tenant) {
      this.errorMessage.set('Complete the tenant step first.');
      return;
    }

    this.errorMessage.set(null);
    this.uploading.set(true);
    this.tenants
      .uploadDocument(tenant.id, file, DOC_LABEL)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (document) => {
          this.uploading.set(false);
          this.documentId.set(document.id);
          this.uploadedName.set(document.fileName);
          this.deferred.set(false);
        },
        error: (error: unknown) => {
          this.uploading.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Upload failed — try again.'));
        },
      });
  }

  submit(): void {
    const documentId = this.documentId();
    this.next.emit(documentId ? { documentId } : { deferred: true });
  }
}
