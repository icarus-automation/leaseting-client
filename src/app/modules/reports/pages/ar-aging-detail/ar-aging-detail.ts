import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  AgingBillRow,
  AgingBucketKey,
  AgingDetailGroup,
  ArAgingDetail,
} from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { AsOfSelection, asOfLabel, asOfParam, todaySelection } from '../../as-of.util';
import { AsOfFilter } from '../../components/as-of-filter/as-of-filter';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import { AGING_BUCKETS, bucketMeta, bucketText } from '../../receivables.util';
import { ALL_PROPERTIES, ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

const ALL_BUCKETS = '';

/**
 * A/R Aging — Detail.
 *
 * Every open bill, oldest debt first, under the tenant who owes it. This is the
 * worklist the summary points at: the ordering is deliberately by exposure
 * rather than alphabetical, so the first name on the page is the first call of
 * the day.
 */
@Component({
  selector: 'app-ar-aging-detail',
  imports: [FormsModule, RouterLink, PIcon, Select, PhpCurrencyPipe, Skeleton, ReportHeader, AsOfFilter],
  templateUrl: './ar-aging-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArAgingDetailPage {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly skeletons = Array.from({ length: 6 });
  readonly propertyOptions = this.filters.propertyOptions;
  readonly bucketOptions = [
    { value: ALL_BUCKETS, label: 'Every band' },
    ...AGING_BUCKETS.map((bucket) => ({ value: bucket.key as string, label: bucket.label })),
  ];

  readonly asOf = signal<AsOfSelection>(todaySelection());
  readonly propertyId = signal<string>(ALL_PROPERTIES);
  readonly bucket = signal<string>(ALL_BUCKETS);

  readonly report = signal<ArAgingDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly collapsed = signal<ReadonlySet<string>>(new Set());

  readonly asOfText = computed(() => {
    const report = this.report();
    return report ? asOfLabel(report.asOf) : '';
  });

  readonly bucketLabel = computed(() => {
    const key = this.bucket();
    return key ? bucketMeta(key as AgingBucketKey).label : 'Every band';
  });

  readonly caption = computed(() => {
    const report = this.report();
    if (!report) return null;
    return `As of ${this.asOfText()} · ${this.bucketLabel()} · ${this.filters.labelFor(this.propertyId())}`;
  });

  readonly isEmpty = computed(() => (this.report()?.groups.length ?? 0) === 0);

  readonly allCollapsed = computed(() => {
    const groups = this.report()?.groups ?? [];
    return groups.length > 0 && groups.every((group) => this.collapsed().has(group.tenantId));
  });

  constructor() {
    this.filters.ensureProperties();
    this.readQueryParams();
    this.load();
  }

  /** Drill-through from the summary arrives as query params; honour them. */
  private readQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const asOf = params.get('asOf');
    // A pinned date arrived in the link; without one the report stays live.
    if (asOf) this.asOf.set({ preset: 'custom', date: new Date(`${asOf}T00:00:00`) });
    this.propertyId.set(params.get('propertyId') ?? ALL_PROPERTIES);
    this.bucket.set(params.get('bucket') ?? ALL_BUCKETS);
  }

  /**
   * Filters live in the URL so a drilled-into view can be shared, reloaded, or
   * reached with the back button and still show the same figures.
   */
  private syncQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        asOf: asOfParam(this.asOf()) ?? null,
        propertyId: this.propertyId() || null,
        bucket: this.bucket() || null,
      },
      replaceUrl: true,
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .arAgingDetail({
        asOf: asOfParam(this.asOf()),
        propertyId: this.propertyId() || undefined,
        bucket: (this.bucket() || undefined) as AgingBucketKey | undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.collapsed.set(new Set());
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not run the report.'));
        },
      });
  }

  private reload(): void {
    this.syncQueryParams();
    this.load();
  }

  onAsOfChange(selection: AsOfSelection): void {
    this.asOf.set(selection);
    this.reload();
  }

  onFilterChange(): void {
    this.reload();
  }

  clearBucket(): void {
    this.bucket.set(ALL_BUCKETS);
    this.reload();
  }

  toggleGroup(tenantId: string): void {
    this.collapsed.update((current) => {
      const next = new Set(current);
      if (!next.delete(tenantId)) next.add(tenantId);
      return next;
    });
  }

  isCollapsed(tenantId: string): boolean {
    return this.collapsed().has(tenantId);
  }

  expandAll(): void {
    this.collapsed.set(new Set());
  }

  collapseAll(): void {
    this.collapsed.set(new Set(this.report()?.groups.map((group) => group.tenantId) ?? []));
  }

  /** "12 days late" / "due in 4 days" — the phrasing carries the sign. */
  ageLabel(row: AgingBillRow): string {
    if (row.daysOverdue > 0) return `${row.daysOverdue} day${row.daysOverdue === 1 ? '' : 's'} late`;
    if (row.daysOverdue === 0) return 'Due today';
    const days = Math.abs(row.daysOverdue);
    return `Due in ${days} day${days === 1 ? '' : 's'}`;
  }

  ageClass(row: AgingBillRow): string {
    return `${bucketText(bucketMeta(row.bucket).tone)} ${row.daysOverdue > 0 ? 'font-medium' : ''}`;
  }

  bucketShort(key: AgingBucketKey): string {
    return bucketMeta(key).short;
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const rows: (string | number)[][] = [
      ['Tenant', 'Unit', 'Type', 'Memo', 'Due date', 'Days late', 'Band', 'Amount', 'Paid', 'Balance'],
    ];

    for (const group of report.groups) {
      for (const row of group.rows) {
        rows.push([
          group.tenantName,
          row.unitLabel,
          row.typeLabel,
          row.memo,
          row.dueDate,
          row.daysOverdue,
          this.bucketShort(row.bucket),
          row.amount,
          row.paid,
          row.balance,
        ]);
      }
      rows.push([`Total for ${group.tenantName}`, '', '', '', '', '', '', '', '', group.total]);
    }
    rows.push([`Total (${report.billCount} bills)`, '', '', '', '', '', '', '', '', report.total]);

    const suffix = this.bucket() ? `_${this.bucket()}` : '';
    downloadCsv(`ar-aging-detail_${report.asOf}${suffix}.csv`, toCsv(rows));
  }

  /** Their open bills in the Bills view, where a payment can be recorded. */
  billsLink(group: AgingDetailGroup): { path: string[]; params: Record<string, string> } {
    return { path: ['/bills'], params: { tenantId: group.tenantId, status: 'UNPAID' } };
  }
}
