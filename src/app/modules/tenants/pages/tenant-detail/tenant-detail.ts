import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type {
  TenantDetail,
  TenantDocumentItem,
  TenantLeaseBillItem,
  TenantLeaseItem,
} from '../../../../core/models/tenant.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { isPastDue, ordinal } from '../../../../shared/utils/date.util';
import { isLeaseActive, leaseStatus } from '../../../../shared/utils/lease-status.util';
import { TenantFormDialog } from '../../components/tenant-form-dialog/tenant-form-dialog';
import { TenantRiskPanel } from '../../components/tenant-risk-panel/tenant-risk-panel';
import { TenantsService } from '../../services/tenants.service';

/** A bill row flattened with its lease context for the billing-history table. */
interface BillingHistoryRow extends TenantLeaseBillItem {
  leaseId: string;
  unitNo: string;
}

const ACCEPTED_DOCUMENT_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';

@Component({
  selector: 'app-tenant-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    PIcon,
    PhpCurrencyPipe,
    Skeleton,
    StatusBadge,
    TenantFormDialog,
    TenantRiskPanel,
  ],
  templateUrl: './tenant-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly tenants = inject(TenantsService);
  private readonly toast = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly tenant = signal<TenantDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly drawerVisible = signal(false);
  readonly uploadingDocument = signal(false);
  readonly deletingDocumentId = signal<string | null>(null);

  readonly billTypeLabels = BILL_TYPE_LABELS;
  readonly acceptedDocumentTypes = ACCEPTED_DOCUMENT_TYPES;
  readonly ordinal = ordinal;

  private readonly documentInput = viewChild<ElementRef<HTMLInputElement>>('documentInput');

  readonly initials = computed(() => {
    const tenant = this.tenant();
    if (!tenant) return '';
    return `${tenant.firstName.charAt(0)}${tenant.lastName.charAt(0)}`.toUpperCase();
  });

  /** The live lease, if any — drives the profile card's unit/rent facts. */
  readonly activeLease = computed(() => {
    const tenant = this.tenant();
    return tenant?.leases.find((lease) => isLeaseActive(lease)) ?? null;
  });

  readonly billingHistory = computed<BillingHistoryRow[]>(() => {
    const tenant = this.tenant();
    if (!tenant) return [];
    return tenant.leases
      .flatMap((lease) =>
        lease.bills.map((bill) => ({ ...bill, leaseId: lease.id, unitNo: lease.unit.unitNo })),
      )
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  });

  readonly hasOverdue = computed(() => {
    const next = this.tenant()?.nextDueDate;
    return !!next && isPastDue(next);
  });

  constructor() {
    effect(() => {
      const id = this.params().get('id');
      if (id) this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenants
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tenant) => {
          this.tenant.set(tenant);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load this tenant.'));
        },
      });
  }

  reload(): void {
    const id = this.params().get('id');
    if (id) this.load(id);
  }

  onSaved(): void {
    this.toast.add({ severity: 'success', summary: 'Tenant updated' });
    this.reload();
  }

  leaseStatus(lease: TenantLeaseItem): { label: string; tone: BadgeTone } {
    return leaseStatus(lease);
  }

  billStatus(bill: TenantLeaseBillItem): { label: string; tone: BadgeTone } {
    if (bill.status === 'PAID') return { label: 'Paid', tone: 'success' };
    return isPastDue(bill.dueDate)
      ? { label: 'Overdue', tone: 'destructive' }
      : { label: 'Unpaid', tone: 'warning' };
  }

  fileSizeLabel(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  documentIcon(document: TenantDocumentItem): string {
    return document.mimeType === 'application/pdf' ? 'file-pdf' : 'image';
  }

  openDocumentPicker(): void {
    this.documentInput()?.nativeElement.click();
  }

  onDocumentPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const tenant = this.tenant();
    if (!file || !tenant) return;

    this.uploadingDocument.set(true);
    this.tenants
      .uploadDocument(tenant.id, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (document) => {
          this.uploadingDocument.set(false);
          this.toast.add({ severity: 'success', summary: 'Document uploaded', detail: document.fileName });
          this.reload();
        },
        error: (error: unknown) => {
          this.uploadingDocument.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Upload failed',
            detail: apiErrorMessage(error, 'PDF or image up to 10 MB.'),
          });
        },
      });
  }

  confirmDeleteDocument(document: TenantDocumentItem): void {
    this.confirmation.confirm({
      header: 'Delete document',
      message: `Delete “${document.fileName}”? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.deletingDocumentId.set(document.id);
        this.tenants
          .deleteDocument(document.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deletingDocumentId.set(null);
              this.toast.add({ severity: 'success', summary: 'Document deleted' });
              this.reload();
            },
            error: (error: unknown) => {
              this.deletingDocumentId.set(null);
              this.toast.add({
                severity: 'error',
                summary: 'Delete failed',
                detail: apiErrorMessage(error),
              });
            },
          });
      },
    });
  }
}
