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
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { TenantsService } from '../../services/tenants.service';

type RequirementKey = 'validId' | 'proofOfIncome' | 'priorAddress';

interface RequirementItem {
  key: RequirementKey;
  label: string;
  hint: string;
  required: boolean;
  docLabel: string;
}

const REQUIREMENTS: RequirementItem[] = [
  {
    key: 'validId',
    label: 'Valid government ID',
    hint: 'Any PhilSys, passport, driver’s license, UMID, or similar.',
    required: true,
    docLabel: 'Onboarding · Valid ID',
  },
  {
    key: 'proofOfIncome',
    label: 'Proof of income',
    hint: 'Payslip, COE, or bank statement.',
    required: false,
    docLabel: 'Onboarding · Proof of income',
  },
  {
    key: 'priorAddress',
    label: 'Prior address / references',
    hint: 'Previous landlord reference or billing statement.',
    required: false,
    docLabel: 'Onboarding · Prior address',
  },
];

const ACCEPTED_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';
const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-step-requirements',
  imports: [PIcon],
  templateUrl: './step-requirements.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepRequirements {
  private readonly tenants = inject(TenantsService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<RequirementsStepData>();
  readonly back = output<void>();

  readonly items = REQUIREMENTS;
  readonly acceptedTypes = ACCEPTED_TYPES;

  readonly onFile = signal<Partial<Record<RequirementKey, TenantDocumentItem[]>>>({});
  readonly loadingProfile = signal(false);
  readonly uploadingKey = signal<RequirementKey | null>(null);
  readonly removingId = signal<string | null>(null);
  readonly uploads = signal<{ key: RequirementKey; document: TenantDocumentItem }[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly canProceed = computed(() =>
    REQUIREMENTS.filter((item) => item.required).every((item) => this.isAttached(item.key)),
  );

  readonly carriedOverCount = computed(
    () => Object.values(this.onFile()).filter((documents) => (documents?.length ?? 0) > 0).length,
  );

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private pendingKey: RequirementKey | null = null;
  private loadedTenantId: string | null = null;

  constructor() {
    effect(() => {
      const detail = this.detail();
      untracked(() => this.loadFiledDocuments(detail.tenant?.id ?? null));
    });
  }

  isAttached(key: RequirementKey): boolean {
    return this.filedFor(key).length > 0 || this.uploadsFor(key).length > 0;
  }

  rejectManualCheck(event: Event, key: RequirementKey): void {
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLInputElement).checked = this.isAttached(key);
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
      this.errorMessage.set('That file is over 10 MB. Upload a smaller scan.');
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
        },
        error: (error: unknown) => {
          this.uploadingKey.set(null);
          this.errorMessage.set(apiErrorMessage(error, 'The upload did not go through. Try again.'));
        },
      });
  }

  confirmRemove(key: RequirementKey, document: TenantDocumentItem): void {
    this.confirm.danger({
      header: 'Remove file',
      message: `Remove “${document.fileName}” from this requirement? It is also deleted from the tenant’s profile.`,
      acceptLabel: 'Remove',
      onAccept: () => this.removeDocument(key, document),
    });
  }

  filedFor(key: RequirementKey): TenantDocumentItem[] {
    return this.onFile()[key] ?? [];
  }

  uploadsFor(key: RequirementKey): TenantDocumentItem[] {
    return this.uploads()
      .filter((upload) => upload.key === key)
      .map((upload) => upload.document);
  }

  submit(): void {
    if (!this.canProceed()) return;
    this.next.emit({
      validId: this.isAttached('validId'),
      proofOfIncome: this.isAttached('proofOfIncome'),
      priorAddress: this.isAttached('priorAddress'),
    });
  }

  private removeDocument(key: RequirementKey, document: TenantDocumentItem): void {
    this.errorMessage.set(null);
    this.removingId.set(document.id);
    this.tenants
      .deleteDocument(document.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removingId.set(null);
          this.uploads.update((list) => list.filter((upload) => upload.document.id !== document.id));
          this.onFile.update((filed) => ({
            ...filed,
            [key]: (filed[key] ?? []).filter((item) => item.id !== document.id),
          }));
        },
        error: (error: unknown) => {
          this.removingId.set(null);
          this.errorMessage.set(apiErrorMessage(error, 'The file could not be removed. Try again.'));
        },
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
          this.onFile.set(this.groupByRequirement(tenant.documents));
        },
        error: () => this.loadingProfile.set(false),
      });
  }

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
