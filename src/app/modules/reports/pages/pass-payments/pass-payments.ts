import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { format } from 'date-fns';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  ParkingPassPaymentsReport,
  PassPaymentGroupRow,
  PassPaymentGrouping,
  PassPaymentRow,
} from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import type { SegmentedOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { parseApiDate } from '../../../../shared/utils/date.util';
import { ParkingScopeFilter } from '../../components/parking-scope-filter/parking-scope-filter';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import { rangeLabel } from '../../date-range.util';
import { PASS_PAYMENT_SOURCE_LABELS } from '../../pass-report.util';
import { ParkingReportScope, defaultScope, scopeQuery } from '../../parking-report.util';
import { ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

const GROUPINGS: (SegmentedOption<PassPaymentGrouping> & { column: string })[] = [
  { value: 'month', label: 'By month', column: 'Month' },
  { value: 'day', label: 'By day', column: 'Day' },
  { value: 'property', label: 'By property', column: 'Property' },
  { value: 'method', label: 'By method', column: 'Method' },
  { value: 'taker', label: 'By taker', column: 'Taken by' },
];

@Component({
  selector: 'app-pass-payments',
  imports: [PIcon, PhpCurrencyPipe, SegmentedControl, Skeleton, ParkingScopeFilter, ReportHeader],
  templateUrl: './pass-payments.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassPayments {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly groupings = GROUPINGS;
  readonly skeletons = Array.from({ length: 6 });

  readonly scope = signal<ParkingReportScope>(defaultScope());
  readonly grouping = signal<PassPaymentGrouping>('month');

  readonly report = signal<ParkingPassPaymentsReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly rangeText = computed(() => {
    const report = this.report();
    return report ? rangeLabel(report.from, report.to) : '';
  });

  readonly caption = computed(() => {
    if (!this.report()) return null;
    const scope = this.scope();
    return `${this.rangeText()} · ${this.filters.labelFor(scope.propertyId)} · ${this.filters.terminalLabelFor(scope.terminalId)}`;
  });

  readonly groupRows = computed<PassPaymentGroupRow[]>(() => this.report()?.breakdowns[this.grouping()] ?? []);

  readonly columnHeader = computed(
    () => GROUPINGS.find((option) => option.value === this.grouping())?.column ?? 'Group',
  );

  readonly isEmpty = computed(() => {
    const totals = this.report()?.totals;
    return !totals || totals.payments + totals.refunds === 0;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .passPayments(scopeQuery(this.scope()))
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

  onScopeChange(scope: ParkingReportScope): void {
    this.scope.set(scope);
    this.load();
  }

  onGroupingChange(grouping: PassPaymentGrouping): void {
    this.grouping.set(grouping);
  }

  groupLabel(row: PassPaymentGroupRow): string {
    if (this.grouping() === 'day') return format(parseApiDate(row.key), 'EEE d MMM');
    if (this.grouping() === 'month') return format(parseApiDate(`${row.key}-01`), 'MMMM yyyy');
    return row.label;
  }

  sourceLabel(row: PassPaymentRow): string {
    return PASS_PAYMENT_SOURCE_LABELS[row.source];
  }

  stamp(iso: string): string {
    return format(new Date(iso), 'd MMM HH:mm');
  }

  day(iso: string): string {
    return format(parseApiDate(iso), 'd MMM yyyy');
  }

  isRefund(row: PassPaymentRow): boolean {
    return row.kind === 'refund';
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;
    const rows: (string | number | null)[][] = [
      ['When', 'Kind', 'Plate', 'Holder', 'Property', 'Method', 'Destination', 'Source', 'Month from', 'Month to', 'Taken by', 'Amount', 'Reason'],
      ...report.rows.map((row) => [
        this.stamp(row.at),
        row.kind === 'refund' ? 'Refund' : 'Payment',
        row.plateDisplay,
        row.holderName,
        row.propertyName,
        row.methodLabel,
        row.destinationName,
        this.sourceLabel(row),
        row.periodStart,
        row.periodEnd,
        row.takerName,
        row.amount,
        row.reason,
      ]),
      ['Net', '', '', '', '', '', '', '', '', '', '', report.totals.net, ''],
    ];
    downloadCsv(`parking-pass-payments_${report.from}_${report.to}.csv`, toCsv(rows));
  }
}
