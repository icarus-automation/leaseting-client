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
import type { OnboardingDetail, RequirementsStepData } from '../../../../core/models/onboarding.types';
import type { TenantDocumentItem } from '../../../../core/models/tenant.types';
import { TenantsService } from '../../services/tenants.service';

type RequirementKey = 'validId' | 'proofOfIncome' | 'priorAddress';

interface RequirementItem {
  key: RequirementKey;
  label: string;
  hint: string;
  required: boolean;
  /** Label stamped on the uploaded document so it self-files on the profile. */
  docLabel: string;
}

const REQUIREMENTS: RequirementItem[] = [
  {
    key: 'validId',
    label: 'Valid government ID',
    hint: 'Any PhilSys, passport, driver’s license, UMID, or similar.',
    required: true,
    docLabel: 'Onboarding — Valid ID',
  },
  {
    key: 'proofOfIncome',
    label: 'Proof of income',
    hint: 'Payslip, COE, or bank statement.',
    required: false,
    docLabel: 'Onboarding — Proof of income',
  },
  {
    key: 'priorAddress',
    label: 'Prior address / references',
    hint: 'Previous landlord reference or billing statement.',
    required: false,
    docLabel: 'Onboarding — Prior address',
  },
];

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Step 2 — requirements checklist. Attached files upload straight to the
 * tenant's documents (labelled), so they are already filed on the profile
 * whether or not the onboarding finishes.
 */
@Component({
  selector: 'app-step-requirements',
  imports: [PIcon],
  templateUrl: './step-requirements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepRequirements {
  private readonly tenants = inject(TenantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<RequirementsStepData>();
  readonly back = output<void>();

  readonly items = REQUIREMENTS;
  readonly acceptedTypes = ACCEPTED_TYPES;

  // Prefilled from the saved step on resume; user toggles overwrite locally.
  readonly checked = linkedSignal<Record<RequirementKey, boolean>>(() => {
    const saved = this.detail().stepsState.requirements?.data as Partial<RequirementsStepData> | undefined;
    return {
      validId: saved?.validId ?? false,
      proofOfIncome: saved?.proofOfIncome ?? false,
      priorAddress: saved?.priorAddress ?? false,
    };
  });
  readonly uploadingKey = signal<RequirementKey | null>(null);
  readonly uploads = signal<{ key: RequirementKey; document: TenantDocumentItem }[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly canProceed = computed(() => this.checked().validId);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private pendingKey: RequirementKey | null = null;

  toggle(key: RequirementKey): void {
    this.checked.update((state) => ({ ...state, [key]: !state[key] }));
  }

  attach(key: RequirementKey): void {
    this.pendingKey = key;
    this.fileInput().nativeElement.click();
  }

  onFilePicked(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    const key = this.pendingKey;
    this.pendingKey = null;
    if (!file || !key) return;

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
    this.uploadingKey.set(key);
    const item = REQUIREMENTS.find((requirement) => requirement.key === key)!;
    this.tenants
      .uploadDocument(tenant.id, file, item.docLabel)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (document) => {
          this.uploadingKey.set(null);
          this.uploads.update((list) => [...list, { key, document }]);
          // A successful upload is the strongest "we have it" signal.
          this.checked.update((state) => ({ ...state, [key]: true }));
        },
        error: (error: unknown) => {
          this.uploadingKey.set(null);
          this.errorMessage.set(apiErrorMessage(error, 'Upload failed — try again.'));
        },
      });
  }

  uploadsFor(key: RequirementKey): TenantDocumentItem[] {
    return this.uploads()
      .filter((upload) => upload.key === key)
      .map((upload) => upload.document);
  }

  submit(): void {
    const state = this.checked();
    this.next.emit({
      validId: state.validId,
      proofOfIncome: state.proofOfIncome,
      priorAddress: state.priorAddress,
    });
  }
}
