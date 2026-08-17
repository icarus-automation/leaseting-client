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
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { BillListItem } from '../../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type { LeaseListItem } from '../../../../core/models/lease.types';
import type { SoaResponse } from '../../../../core/models/soa.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { LeasesService } from '../../../leases/services/leases.service';
import { BillsService } from '../../services/bills.service';
import { SoaService } from '../../services/soa.service';

interface LeaseOption {
  id: string;
  label: string;
}

/**
 * On-demand Statement of Account: pick a lease, tick the unpaid bills to
 * include, and get a styled .xlsx — replacing the spreadsheet the client used
 * to assemble by hand. Optionally texts the tenant a one-line summary.
 */
@Component({
  selector: 'app-generate-soa-dialog',
  imports: [DatePipe, FormsModule, PIcon, Select, PhpCurrencyPipe, ErrorBanner, FormDialog],
  templateUrl: './generate-soa-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateSoaDialog {
  private readonly auth = inject(AuthService);
  private readonly bills = inject(BillsService);
  private readonly leases = inject(LeasesService);
  private readonly soa = inject(SoaService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  /** Preselects the lease and hides the picker (e.g. from a lease row). */
  readonly presetLeaseId = input<string | null>(null);
  readonly generated = output<SoaResponse>();

  readonly billTypeLabels = BILL_TYPE_LABELS;

  readonly leaseOptions = signal<LeaseOption[]>([]);
  readonly loadingLeases = signal(false);
  readonly selectedLeaseId = signal<string | null>(null);
  readonly unpaidBills = signal<BillListItem[]>([]);
  readonly loadingBills = signal(false);
  readonly checkedBillIds = signal<ReadonlySet<string>>(new Set());
  readonly sendSms = signal(false);
  readonly generating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Set once generation succeeds — the dialog flips to the download state. */
  readonly result = signal<SoaResponse | null>(null);

  readonly smsAvailable = computed(() => this.auth.features().sms);
  readonly totalDue = computed(() => {
    const checked = this.checkedBillIds();
    return this.unpaidBills()
      .filter((bill) => checked.has(bill.id))
      .reduce((sum, bill) => sum + Number(bill.balance), 0);
  });
  readonly canGenerate = computed(
    () => !this.generating() && this.checkedBillIds().size > 0 && this.selectedLeaseId() !== null,
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.errorMessage.set(null);
      this.generating.set(false);
      this.result.set(null);
      this.unpaidBills.set([]);
      this.checkedBillIds.set(new Set());
      this.sendSms.set(this.smsAvailable());
      const preset = this.presetLeaseId();
      this.selectedLeaseId.set(preset);
      if (preset) {
        this.loadUnpaidBills(preset);
      } else {
        this.loadLeases();
      }
    });
  }

  onLeasePicked(leaseId: string | null): void {
    this.selectedLeaseId.set(leaseId);
    this.unpaidBills.set([]);
    this.checkedBillIds.set(new Set());
    if (leaseId) this.loadUnpaidBills(leaseId);
  }

  toggleBill(billId: string): void {
    const next = new Set(this.checkedBillIds());
    if (next.has(billId)) {
      next.delete(billId);
    } else {
      next.add(billId);
    }
    this.checkedBillIds.set(next);
  }

  generate(): void {
    const leaseId = this.selectedLeaseId();
    if (!leaseId || this.checkedBillIds().size === 0) return;

    this.generating.set(true);
    this.errorMessage.set(null);
    this.soa
      .generate(leaseId, {
        billIds: [...this.checkedBillIds()],
        sendSms: this.smsAvailable() && this.sendSms(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (statement) => {
          this.generating.set(false);
          this.result.set(statement);
          this.generated.emit(statement);
          this.toast.add({ severity: 'success', summary: `Statement ${statement.soaNo} generated` });
        },
        error: (error: unknown) => {
          this.generating.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not generate the statement.'));
        },
      });
  }

  downloadUrl(statement: SoaResponse): string {
    return this.soa.downloadUrl(statement.id);
  }

  private loadLeases(): void {
    this.loadingLeases.set(true);
    this.leases
      .list({ active: true, limit: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.leaseOptions.set(page.data.map(toLeaseOption));
          this.loadingLeases.set(false);
        },
        error: () => {
          this.loadingLeases.set(false);
          this.errorMessage.set('Could not load active leases.');
        },
      });
  }

  private loadUnpaidBills(leaseId: string): void {
    this.loadingBills.set(true);
    this.bills
      .list({ leaseId, status: 'UNPAID', limit: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.unpaidBills.set(page.data);
          // Everything checked by default — the common case is "all pending".
          this.checkedBillIds.set(new Set(page.data.map((bill) => bill.id)));
          this.loadingBills.set(false);
        },
        error: (error: unknown) => {
          this.loadingBills.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not load unpaid bills.'));
        },
      });
  }
}

function toLeaseOption(lease: LeaseListItem): LeaseOption {
  return {
    id: lease.id,
    label: `Unit ${lease.unit.unitNo} · ${lease.unit.property.name} — ${lease.tenant.firstName} ${lease.tenant.lastName}`,
  };
}
