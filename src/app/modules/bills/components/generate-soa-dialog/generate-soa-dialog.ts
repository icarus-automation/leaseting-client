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
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { BillListItem } from '../../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import type { SoaResponse } from '../../../../core/models/soa.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { billSourceOf } from '../../../../shared/utils/bill-source.util';
import { BillsService } from '../../services/bills.service';
import { SoaService } from '../../services/soa.service';
import { SoaLines } from '../soa-lines/soa-lines';

interface BillingSourceOption {
  key: string;
  kind: 'lease' | 'ownership';
  sourceId: string;
  label: string;
}

@Component({
  selector: 'app-generate-soa-dialog',
  imports: [ProgressSpinner, DatePipe, FormsModule, PIcon, Select, PhpCurrencyPipe, ErrorBanner, FormDialog, SoaLines],
  templateUrl: './generate-soa-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateSoaDialog {
  private readonly auth = inject(AuthService);
  private readonly bills = inject(BillsService);
  private readonly soa = inject(SoaService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly presetLeaseId = input<string | null>(null);
  readonly generated = output<SoaResponse>();

  readonly billTypeLabels = BILL_TYPE_LABELS;

  readonly sourceOptions = signal<BillingSourceOption[]>([]);
  readonly loadingSources = signal(false);
  readonly selectedSourceKey = signal<string | null>(null);
  readonly unpaidBills = signal<BillListItem[]>([]);
  readonly loadingBills = signal(false);
  readonly checkedBillIds = signal<ReadonlySet<string>>(new Set());
  readonly sendSms = signal(false);
  readonly generating = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly result = signal<SoaResponse | null>(null);

  readonly smsAvailable = computed(() => this.auth.features().sms);
  readonly totalDue = computed(() => {
    const checked = this.checkedBillIds();
    return this.unpaidBills()
      .filter((bill) => checked.has(bill.id))
      .reduce((sum, bill) => sum + Number(bill.balance), 0);
  });
  readonly canGenerate = computed(
    () => !this.generating() && this.checkedBillIds().size > 0 && this.selectedSourceKey() !== null,
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
      this.selectedSourceKey.set(preset ? sourceKey('lease', preset) : null);
      if (preset) {
        this.loadUnpaidBills('lease', preset);
      } else {
        this.loadSources();
      }
    });
  }

  onSourcePicked(key: string | null): void {
    this.selectedSourceKey.set(key);
    this.unpaidBills.set([]);
    this.checkedBillIds.set(new Set());
    const selected = this.sourceOptions().find((option) => option.key === key);
    if (selected) this.loadUnpaidBills(selected.kind, selected.sourceId);
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
    const key = this.selectedSourceKey();
    if (!key || this.checkedBillIds().size === 0) return;

    const selected = this.sourceOptions().find((option) => option.key === key) ?? parseSourceKey(key);
    if (!selected) return;

    this.generating.set(true);
    this.errorMessage.set(null);
    const request = selected.kind === 'lease'
      ? this.soa.generate(selected.sourceId, {
          billIds: [...this.checkedBillIds()],
          sendSms: this.smsAvailable() && this.sendSms(),
        })
      : this.soa.generateOwnership(selected.sourceId, {
        billIds: [...this.checkedBillIds()],
        sendSms: this.smsAvailable() && this.sendSms(),
      });
    request
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

  private loadSources(): void {
    this.loadingSources.set(true);
    this.bills
      .list({ status: 'UNPAID', limit: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const options = new Map<string, BillingSourceOption>();
          for (const bill of page.data) {
            const source = billSourceOf(bill);
            const kind = bill.ownershipId ? 'ownership' : 'lease';
            const key = sourceKey(kind, source.id);
            options.set(key, {
              key,
              kind,
              sourceId: source.id,
              label: `Unit ${source.unit.unitNo} · ${source.unit.property.name} · ${source.resident.firstName} ${source.resident.lastName} (${kind === 'ownership' ? 'owner' : 'tenant'})`,
            });
          }
          this.sourceOptions.set([...options.values()].sort((a, b) => a.label.localeCompare(b.label)));
          this.loadingSources.set(false);
        },
        error: () => {
          this.loadingSources.set(false);
          this.errorMessage.set('Could not load residents with unpaid bills.');
        },
      });
  }

  private loadUnpaidBills(kind: 'lease' | 'ownership', sourceId: string): void {
    this.loadingBills.set(true);
    this.bills
      .list({ [kind === 'lease' ? 'leaseId' : 'ownershipId']: sourceId, status: 'UNPAID', limit: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.unpaidBills.set(page.data);
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

function sourceKey(kind: 'lease' | 'ownership', id: string): string {
  return `${kind}:${id}`;
}

function parseSourceKey(key: string): BillingSourceOption | null {
  const separator = key.indexOf(':');
  if (separator < 1) return null;
  const kind = key.slice(0, separator);
  const sourceId = key.slice(separator + 1);
  if ((kind !== 'lease' && kind !== 'ownership') || !sourceId) return null;
  return { key, kind, sourceId, label: '' };
}
