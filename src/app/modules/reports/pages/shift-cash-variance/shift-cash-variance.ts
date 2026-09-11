import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { format } from 'date-fns';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ShiftCashRow, ShiftCashVarianceReport } from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import type { SegmentedOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import type { BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { ParkingScopeFilter } from '../../components/parking-scope-filter/parking-scope-filter';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import { rangeLabel } from '../../date-range.util';
import {
  ParkingReportScope,
  defaultScope,
  scopeQuery,
  varianceStateLabel,
  varianceTone,
} from '../../parking-report.util';
import { ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

type ShiftView = 'all' | 'off' | 'awaiting';

const VIEWS: SegmentedOption<ShiftView>[] = [
  { value: 'all', label: 'All shifts' },
  { value: 'off', label: 'Did not balance' },
  { value: 'awaiting', label: 'Awaiting confirm' },
];

/**
 * Shift Cash Variance: what each till was expected to hold against what the
 * guard actually handed over.
 *
 * Only declared tills appear. An open shift has no figure anybody has stood
 * behind, and pricing one live would put a number on the page that moves every
 * time it is refreshed. Watching a shift fill up is the Overview's job.
 *
 * `expectedCash` is the snapshot taken when the guard declared, never a
 * re-pricing against today's rate plans: the reader is holding someone to the
 * figure they were shown at the time.
 */
@Component({
  selector: 'app-shift-cash-variance',
  imports: [
    PIcon,
    PhpCurrencyPipe,
    SegmentedControl,
    Skeleton,
    StatusBadge,
    ParkingScopeFilter,
    ReportHeader,
  ],
  templateUrl: './shift-cash-variance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftCashVariance {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly views = VIEWS;
  readonly skeletons = Array.from({ length: 6 });

  readonly scope = signal<ParkingReportScope>(defaultScope());
  readonly view = signal<ShiftView>('all');

  readonly report = signal<ShiftCashVarianceReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly rangeText = computed(() => {
    const report = this.report();
    return report ? rangeLabel(report.from, report.to) : '';
  });

  readonly caption = computed(() => {
    if (!this.report()) return null;
    return `${this.rangeText()} · ${this.scopeLabel()} · Declared shifts`;
  });

  readonly isEmpty = computed(() => (this.report()?.rows.length ?? 0) === 0);

  /**
   * Narrowing happens here rather than server-side because the totals above
   * the table describe the whole period and must not follow the filter. A
   * reader looking only at the tills that went wrong still needs to see them
   * against everything that was declared.
   */
  readonly rows = computed<ShiftCashRow[]>(() => {
    const rows = this.report()?.rows ?? [];
    switch (this.view()) {
      case 'off':
        return rows.filter((row) => row.state !== 'balanced');
      case 'awaiting':
        return rows.filter((row) => row.status === 'DECLARED');
      default:
        return rows;
    }
  });

  /** True when a filter is hiding rows, so the table can say so. */
  readonly filtered = computed(() => this.rows().length !== (this.report()?.rows.length ?? 0));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .parkingShiftCash(scopeQuery(this.scope()))
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

  onViewChange(view: ShiftView): void {
    this.view.set(view);
  }

  stateLabel(row: ShiftCashRow): string {
    return varianceStateLabel(row.state);
  }

  stateTone(row: ShiftCashRow): BadgeTone {
    return varianceTone(row.state);
  }

  /** "Confirmed by Ben Cruz" or the fact that nobody has signed it off yet. */
  confirmText(row: ShiftCashRow): string {
    if (row.status !== 'CONFIRMED') return 'Awaiting confirm';
    return row.confirmedByName ? `Confirmed by ${row.confirmedByName}` : 'Confirmed';
  }

  stamp(iso: string): string {
    return format(new Date(iso), 'd MMM HH:mm');
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const rows: (string | number | null)[][] = [
      [
        'Terminal',
        'Property',
        'Attendant',
        'Opened',
        'Declared',
        'Paid exits',
        'Expected',
        'Declared cash',
        'Variance',
        'Result',
        'Status',
        'Confirmed by',
        'Note',
      ],
      ...this.rows().map((row) => [
        row.terminalName,
        row.propertyName,
        row.attendantName,
        this.stamp(row.openedAt),
        this.stamp(row.declaredAt),
        row.paidExits,
        row.expectedCash,
        row.declaredCash,
        row.variance,
        this.stateLabel(row),
        row.status === 'CONFIRMED' ? 'Confirmed' : 'Awaiting confirm',
        row.confirmedByName,
        row.note,
      ]),
      [
        `Total (${report.totals.shifts} till${report.totals.shifts === 1 ? '' : 's'})`,
        '',
        '',
        '',
        '',
        '',
        report.totals.expected,
        report.totals.declared,
        report.totals.variance,
        '',
        '',
        '',
        '',
      ],
    ];

    downloadCsv(`shift-cash-variance_${report.from}_${report.to}.csv`, toCsv(rows));
  }

  private scopeLabel(): string {
    const scope = this.scope();
    return `${this.filters.labelFor(scope.propertyId)} · ${this.filters.terminalLabelFor(scope.terminalId)}`;
  }
}
