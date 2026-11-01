import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type {
  ResidentDetail,
  ResidentDocumentItem,
  ResidentLeaseBillItem,
  ResidentLeaseItem,
} from '../../../../core/models/resident.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { isPastDue, ordinal } from '../../../../shared/utils/date.util';
import { isLeaseActive, leaseStatus } from '../../../../shared/utils/lease-status.util';
import { ResidentFormDialog } from '../../components/resident-form-dialog/resident-form-dialog';
import { ResidentRiskPanel } from '../../components/resident-risk-panel/resident-risk-panel';
import { ResidentsService } from '../../services/residents.service';

interface BillingHistoryRow extends ResidentLeaseBillItem {
  leaseId: string;
  unitNo: string;
}

const ACCEPTED_DOCUMENT_TYPES = 'application/pdf,image/png,image/jpeg,image/webp';

@Component({
  selector: 'app-resident-detail',
  imports: [
    ProgressSpinner,
    DatePipe,
    DecimalPipe,
    RouterLink,
    PIcon,
    PhpCurrencyPipe,
    Skeleton,
    StatusBadge,
    ResidentFormDialog,
    ResidentRiskPanel,
  ],
  templateUrl: './resident-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly residents = inject(ResidentsService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Editing the profile and its documents. */
  readonly canManage = computed(() => this.auth.can('residents:manage'));

  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly resident = signal<ResidentDetail | null>(null);
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
    const resident = this.resident();
    if (!resident) return '';
    return `${resident.firstName.charAt(0)}${resident.lastName.charAt(0)}`.toUpperCase();
  });

  readonly activeLease = computed(() => {
    const resident = this.resident();
    return resident?.leases.find((lease) => isLeaseActive(lease)) ?? null;
  });

  readonly billingHistory = computed<BillingHistoryRow[]>(() => {
    const resident = this.resident();
    if (!resident) return [];
    return resident.leases
      .flatMap((lease) =>
        lease.bills.map((bill) => ({ ...bill, leaseId: lease.id, unitNo: lease.unit.unitNo })),
      )
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  });

  readonly hasOverdue = computed(() => {
    const next = this.resident()?.nextDueDate;
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
    this.residents
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resident) => {
          this.resident.set(resident);
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

  leaseStatus(lease: ResidentLeaseItem): { label: string; tone: BadgeTone } {
    return leaseStatus(lease);
  }

  billStatus(bill: ResidentLeaseBillItem): { label: string; tone: BadgeTone } {
    if (bill.status === 'PAID') return { label: 'Paid', tone: 'success' };
    return isPastDue(bill.dueDate)
      ? { label: 'Overdue', tone: 'destructive' }
      : { label: 'Unpaid', tone: 'warning' };
  }

  fileSizeLabel(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  documentIcon(document: ResidentDocumentItem): string {
    return document.mimeType === 'application/pdf' ? 'file-pdf' : 'image';
  }

  openDocumentPicker(): void {
    this.documentInput()?.nativeElement.click();
  }

  onDocumentPicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const resident = this.resident();
    if (!file || !resident) return;

    this.uploadingDocument.set(true);
    this.residents
      .uploadDocument(resident.id, file)
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

  confirmDeleteDocument(document: ResidentDocumentItem): void {
    this.confirm.danger({
      header: 'Delete document',
      message: `Delete “${document.fileName}”? This cannot be undone.`,
      acceptLabel: 'Delete',
      onAccept: () => {
        this.deletingDocumentId.set(document.id);
        this.residents
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
