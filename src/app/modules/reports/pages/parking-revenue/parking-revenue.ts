import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { format } from 'date-fns';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  ParkingRevenueGrouping,
  ParkingRevenueGroupRow,
  ParkingRevenueReport,
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
import {
  ParkingReportScope,
  defaultScope,
  minutesLabel,
  scopeQuery,
} from '../../parking-report.util';
import { ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

const GROUPINGS: (SegmentedOption<ParkingRevenueGrouping> & { column: string })[] = [
  { value: 'day', label: 'By day', column: 'Day' },
  { value: 'property', label: 'By property', column: 'Property' },
  { value: 'terminal', label: 'By terminal', column: 'Terminal' },
  { value: 'attendant', label: 'By attendant', column: 'Attendant' },
  { value: 'vehicle-type', label: 'By vehicle', column: 'Vehicle type' },
  { value: 'rate-plan', label: 'By rate', column: 'Rate plan' },
  { value: 'shift', label: 'By shift', column: 'Shift' },
];

@Component({
  selector: 'app-parking-revenue',
  imports: [
    PIcon,
    PhpCurrencyPipe,
    SegmentedControl,
    Skeleton,
    ParkingScopeFilter,
    ReportHeader,
  ],
  templateUrl: './parking-revenue.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingRevenue {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly groupings = GROUPINGS;
  readonly skeletons = Array.from({ length: 6 });

  readonly scope = signal<ParkingReportScope>(defaultScope());
  readonly grouping = signal<ParkingRevenueGrouping>('day');

  readonly report = signal<ParkingRevenueReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly rangeText = computed(() => {
    const report = this.report();
    return report ? rangeLabel(report.from, report.to) : '';
  });

  readonly caption = computed(() => {
    if (!this.report()) return null;
    return `${this.rangeText()} · ${this.scopeLabel()} · Paid exits, cash`;
  });

  readonly rows = computed<ParkingRevenueGroupRow[]>(
    () => this.report()?.breakdowns[this.grouping()] ?? [],
  );

  readonly isEmpty = computed(() => (this.report()?.totals.exits ?? 0) === 0);

  readonly columnHeader = computed(
    () => GROUPINGS.find((option) => option.value === this.grouping())?.column ?? 'Group',
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .parkingRevenue(scopeQuery(this.scope()))
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

  onGroupingChange(grouping: ParkingRevenueGrouping): void {
    this.grouping.set(grouping);
  }

  rowLabel(row: ParkingRevenueGroupRow): string {
    if (this.grouping() !== 'day') return row.label;
    return format(parseApiDate(row.label), 'EEE d MMM');
  }

  stayLabel(minutes: number): string {
    return minutesLabel(minutes);
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const rows: (string | number | null)[][] = [
      [this.columnHeader(), 'Context', 'Exits', 'Collected', 'Billed minutes', 'Average fee', 'Share %'],
      ...this.rows().map((row) => [
        this.rowLabel(row),
        row.sublabel,
        row.exits,
        row.collected,
        row.billedMinutes,
        row.averageFee,
        row.share,
      ]),
      [
        'Total',
        '',
        report.totals.exits,
        report.totals.collected,
        report.totals.billedMinutes,
        report.totals.averageFee,
        report.totals.exits === 0 ? 0 : 100,
      ],
    ];

    downloadCsv(
      `parking-revenue_${this.grouping()}_${report.from}_${report.to}.csv`,
      toCsv(rows),
    );
  }

  private scopeLabel(): string {
    const scope = this.scope();
    return `${this.filters.labelFor(scope.propertyId)} · ${this.filters.terminalLabelFor(scope.terminalId)}`;
  }
}
