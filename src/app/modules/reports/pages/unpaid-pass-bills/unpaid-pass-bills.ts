import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { format } from 'date-fns';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import { PARKING_PASS_BILL_REVIEW_LABELS } from '../../../../core/models/parking-pass.types';
import type { UnpaidPassBillRow, UnpaidPassBillsReport } from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { BadgeTone, StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { parseApiDate } from '../../../../shared/utils/date.util';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import { ALL_PROPERTIES, ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

@Component({
  selector: 'app-unpaid-pass-bills',
  imports: [FormsModule, RouterLink, PIcon, Select, PhpCurrencyPipe, Skeleton, StatusBadge, ReportHeader],
  templateUrl: './unpaid-pass-bills.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnpaidPassBills {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly skeletons = Array.from({ length: 6 });
  readonly propertyOptions = this.filters.propertyOptions;
  readonly canViewBills = computed(() => this.auth.can('bills:view'));

  readonly propertyId = signal<string>(ALL_PROPERTIES);
  readonly report = signal<UnpaidPassBillsReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly caption = computed(() => {
    const report = this.report();
    if (!report) return null;
    return `As of ${this.day(report.asOf)} · ${this.filters.labelFor(this.propertyId())} · Open parking pass bills`;
  });

  readonly isEmpty = computed(() => (this.report()?.totals.bills ?? 0) === 0);

  constructor() {
    this.filters.ensureProperties();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .unpaidPassBills({ propertyId: this.propertyId() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not run the report.'));
        },
      });
  }

  onPropertyChange(propertyId: string): void {
    this.propertyId.set(propertyId);
    this.load();
  }

  passBadge(row: UnpaidPassBillRow): { tone: BadgeTone; label: string } {
    if (row.passEnded) return { tone: 'neutral', label: 'Pass ended' };
    if (row.passValid) return { tone: 'success', label: 'Still covers' };
    return { tone: 'destructive', label: 'Lapsed' };
  }

  reviewLabel(row: UnpaidPassBillRow): string {
    return row.reviewReason ? PARKING_PASS_BILL_REVIEW_LABELS[row.reviewReason] : '';
  }

  ageLabel(row: UnpaidPassBillRow): string {
    if (row.daysOverdue === 0) return 'Not yet overdue';
    return `${row.daysOverdue} day${row.daysOverdue === 1 ? '' : 's'} overdue`;
  }

  day(iso: string): string {
    return format(parseApiDate(iso), 'd MMM yyyy');
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;
    const rows: (string | number | null)[][] = [
      ['Due', 'Days overdue', 'Plate', 'Vehicle type', 'Holder', 'Tenant', 'Unit', 'Property', 'Billed', 'Paid', 'Balance', 'Pass', 'Paid through', 'Needs review'],
      ...report.rows.map((row) => [
        row.dueDate,
        row.daysOverdue,
        row.plateDisplay,
        row.vehicleTypeName,
        row.holderName,
        row.resident.name,
        row.resident.unitNo,
        row.propertyName,
        row.amount,
        row.paidAmount,
        row.balance,
        this.passBadge(row).label,
        row.paidUntil,
        this.reviewLabel(row) || null,
      ]),
    ];
    downloadCsv(`unpaid-pass-bills_${report.asOf}.csv`, toCsv(rows));
  }
}
