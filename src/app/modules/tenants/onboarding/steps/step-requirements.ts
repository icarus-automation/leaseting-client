import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
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
 * Step 3 — requirements checklist. Attached files upload straight to the
 * tenant's documents (labelled), so they are already filed on the profile
 * whether or not the onboarding finishes.
 *
 * A returning tenant does not re-submit paperwork the office already holds:
 * anything already filed under one of these labels is shown, linked, and
 * ticked on arrival. The boxes stay editable — "on file" is not the same as
 * "still valid", and only a person can judge an expired ID.
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

  /** Documents already on the tenant's profile, keyed by requirement. */
  readonly onFile = signal<Partial<Record<RequirementKey, TenantDocumentItem[]>>>({});
  readonly loadingProfile = signal(false);

  /**
   * Seeded from the saved step, then topped up from what is already on file
   * once the profile lookup lands. Seeding is one-shot per tenant: the lookup
   * resolving must never wipe a box the user ticked while it was in flight.
   */
  readonly checked = signal<Record<RequirementKey, boolean>>({
    validId: false,
    proofOfIncome: false,
    priorAddress: false,
  });

  readonly uploadingKey = signal<RequirementKey | null>(null);
  readonly uploads = signal<{ key: RequirementKey; document: TenantDocumentItem }[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly canProceed = computed(() => this.checked().validId);

  /** Shown once, above the list, when anything carried over from last time. */
  readonly carriedOverCount = computed(
    () => Object.values(this.onFile()).filter((documents) => (documents?.length ?? 0) > 0).length,
  );

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private pendingKey: RequirementKey | null = null;
  private loadedTenantId: string | null = null;

  constructor() {
    // Pull the tenant's filed documents whenever the chosen tenant changes.
    effect(() => {
      const detail = this.detail();
      untracked(() => {
        this.seedFromSavedStep(detail);
        this.loadFiledDocuments(detail.tenant?.id ?? null);
      });
    });
  }

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

  /** Documents filed on an earlier onboarding — links, not re-uploads. */
  filedFor(key: RequirementKey): TenantDocumentItem[] {
    return this.onFile()[key] ?? [];
  }

  /** Documents uploaded during this onboarding. */
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

  /** Re-entering the step shows what was saved last time, not a blank list. */
  private seedFromSavedStep(detail: OnboardingDetail): void {
    const saved = detail.stepsState.requirements?.data as Partial<RequirementsStepData> | undefined;
    if (!saved) return;
    this.checked.set({
      validId: saved.validId ?? false,
      proofOfIncome: saved.proofOfIncome ?? false,
      priorAddress: saved.priorAddress ?? false,
    });
  }

  private loadFiledDocuments(tenantId: string | null): void {
    if (tenantId === this.loadedTenantId) return;
    this.loadedTenantId = tenantId;
    this.onFile.set({});
    if (!tenantId) return;

    this.loadingProfile.set(true);
    this.tenants
      .get(tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenant) => {
          this.loadingProfile.set(false);
          const filed = this.groupByRequirement(tenant.documents);
          this.onFile.set(filed);
          // Only ever ticks boxes — a requirement the user deliberately
          // un-ticked while this was loading stays un-ticked.
          this.checked.update((state) => ({
            validId: state.validId || (filed.validId?.length ?? 0) > 0,
            proofOfIncome: state.proofOfIncome || (filed.proofOfIncome?.length ?? 0) > 0,
            priorAddress: state.priorAddress || (filed.priorAddress?.length ?? 0) > 0,
          }));
        },
        // Non-blocking: the checklist still works, it just cannot pre-tick.
        error: () => this.loadingProfile.set(false),
      });
  }

  /** Matches on the label the upload stamped, so the mapping is exact. */
  private groupByRequirement(
    documents: TenantDocumentItem[],
  ): Partial<Record<RequirementKey, TenantDocumentItem[]>> {
    const grouped: Partial<Record<RequirementKey, TenantDocumentItem[]>> = {};
    for (const item of REQUIREMENTS) {
      const matches = documents.filter((document) => document.label === item.docLabel);
      if (matches.length > 0) grouped[item.key] = matches;
    }
    return grouped;
  }
}
