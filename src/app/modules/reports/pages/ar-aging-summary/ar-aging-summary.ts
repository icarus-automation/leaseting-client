import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { AgingBucketKey, ArAgingSummary } from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { asOfLabel, toIsoDate } from '../../as-of.util';
import { AsOfFilter } from '../../components/as-of-filter/as-of-filter';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import { AGING_BUCKETS, bucketFill, bucketMeta, bucketShares, bucketText } from '../../receivables.util';
import { ALL_PROPERTIES, ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

type SortKey = 'exposure' | 'name' | 'oldest';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'exposure', label: 'Largest overdue first' },
  { value: 'oldest', label: 'Oldest debt first' },
  { value: 'name', label: 'Tenant name' },
];

/**
 * A/R Aging — Summary.
 *
 * One row per tenant, one column per age band: the shape of what is owed, on a
 * single date. It leads with the aging bar because the first question is never
 * "how much" but "how bad" — and a proportional bar answers that before a
 * column of figures can. Every segment is a link into the detail report, so
 * reading the shape and acting on it are the same gesture.
 */
@Component({
  selector: 'app-ar-aging-summary',
  imports: [FormsModule, RouterLink, PIcon, Select, PhpCurrencyPipe, Skeleton, ReportHeader, AsOfFilter],
  templateUrl: './ar-aging-summary.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArAgingSummaryPage {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly buckets = AGING_BUCKETS;
  readonly sortOptions = SORT_OPTIONS;
  readonly skeletons = Array.from({ length: 5 });
  readonly propertyOptions = this.filters.propertyOptions;

  readonly asOf = signal<Date>(new Date());
  readonly propertyId = signal<string>(ALL_PROPERTIES);
  readonly sort = signal<SortKey>('exposure');

  readonly report = signal<ArAgingSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly asOfText = computed(() => {
    const report = this.report();
    return report ? asOfLabel(report.asOf) : '';
  });

  readonly caption = computed(() => {
    const report = this.report();
    if (!report) return null;
    return `As of ${this.asOfText()} · ${this.filters.labelFor(this.propertyId())}`;
  });

  readonly isEmpty = computed(() => (this.report()?.groups.length ?? 0) === 0);

  /** Segment widths for the aging bar, already floored so nothing vanishes. */
  readonly shares = computed(() => {
    const report = this.report();
    if (!report) return [];
    return bucketShares(report.buckets, report.total).map((share) => ({
      ...share,
      meta: bucketMeta(share.key),
      amount: report.buckets[share.key],
    }));
  });

  /** Overdue as a share of everything owed — the one derived headline figure. */
  readonly overduePercent = computed(() => {
    const report = this.report();
    if (!report || Number(report.total) <= 0) return 0;
    return Math.round((Number(report.overdue) / Number(report.total)) * 100);
  });

  readonly rows = computed(() => {
    const groups = [...(this.report()?.groups ?? [])];
    switch (this.sort()) {
      case 'name':
        return groups.sort((a, b) => a.tenantName.localeCompare(b.tenantName));
      case 'oldest':
        return groups.sort((a, b) => b.oldestDaysOverdue - a.oldestDaysOverdue);
      default:
        return groups; // the backend already ordered by exposure
    }
  });

  constructor() {
    this.filters.ensureProperties();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .arAgingSummary({
        asOf: toIsoDate(this.asOf()),
        propertyId: this.propertyId() || undefined,
      })
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

  onAsOfChange(date: Date): void {
    this.asOf.set(date);
    this.load();
  }

  onPropertyChange(): void {
    this.load();
  }

  /** Query params that carry the current filters into the detail report. */
  detailParams(bucket?: AgingBucketKey): Record<string, string> {
    const params: Record<string, string> = { asOf: toIsoDate(this.asOf()) };
    if (this.propertyId()) params['propertyId'] = this.propertyId();
    if (bucket) params['bucket'] = bucket;
    return params;
  }

  fill(key: AgingBucketKey): string {
    return bucketFill(bucketMeta(key).tone);
  }

  /** Zero reads as absence, not as a figure — the eye should skip it. */
  cellClass(key: AgingBucketKey, amount: string): string {
    if (Number(amount) <= 0) return 'text-muted/50';
    return `font-medium ${bucketText(bucketMeta(key).tone)}`;
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const header = ['Tenant', 'Contact', ...AGING_BUCKETS.map((bucket) => bucket.label), 'Overdue', 'Total'];
    const rows: (string | number)[][] = [header];

    for (const group of this.rows()) {
      rows.push([
        group.tenantName,
        group.contactNo,
        ...AGING_BUCKETS.map((bucket) => group.buckets[bucket.key]),
        group.overdue,
        group.total,
      ]);
    }

    rows.push([
      `Total (${report.tenantCount} tenants, ${report.billCount} bills)`,
      '',
      ...AGING_BUCKETS.map((bucket) => report.buckets[bucket.key]),
      report.overdue,
      report.total,
    ]);

    downloadCsv(`ar-aging-summary_${report.asOf}.csv`, toCsv(rows));
  }
}
