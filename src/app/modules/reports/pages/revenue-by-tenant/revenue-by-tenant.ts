import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  RevenueBasis,
  RevenueByTenantReport,
  RevenueRow,
  RevenueTenantGroup,
} from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import {
  DATE_RANGE_PRESETS,
  DateRange,
  DateRangePreset,
  rangeLabel,
  resolvePreset,
  toIsoDate,
} from '../../date-range.util';
import { ALL_PROPERTIES, ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

const BASIS_OPTIONS: { value: RevenueBasis; label: string; hint: string }[] = [
  { value: 'BILLED', label: 'Billed', hint: 'Charges raised in the period' },
  { value: 'COLLECTED', label: 'Collected', hint: 'Payments received in the period' },
];

/**
 * Revenue by Tenant — Detail.
 *
 * Every revenue transaction in a window, grouped under the tenant it came
 * from. The basis switch decides which ledger is being read: BILLED shows what
 * was charged, COLLECTED what was actually received. They are reported side by
 * side rather than blended because a manager chasing arrears and a manager
 * reconciling a bank statement need different answers from the same month.
 */
@Component({
  selector: 'app-revenue-by-tenant',
  imports: [FormsModule, PIcon, DatePicker, Select, PhpCurrencyPipe, Skeleton, ReportHeader],
  templateUrl: './revenue-by-tenant.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueByTenant {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly presets = DATE_RANGE_PRESETS;
  readonly basisOptions = BASIS_OPTIONS;
  readonly skeletons = Array.from({ length: 5 });

  readonly preset = signal<DateRangePreset>('this-month');
  readonly basis = signal<RevenueBasis>('BILLED');
  readonly propertyId = signal<string>(ALL_PROPERTIES);
  /** One signal, so the two ends of the window can never drift out of step. */
  readonly range = signal<DateRange>(resolvePreset('this-month') ?? todayOnly());

  readonly report = signal<RevenueByTenantReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly collapsed = signal<ReadonlySet<string>>(new Set());

  readonly propertyOptions = this.filters.propertyOptions;

  readonly accrual = computed(() => this.basis() === 'BILLED');

  /** The window the loaded figures actually cover, not the one being edited. */
  readonly rangeText = computed(() => {
    const report = this.report();
    return report ? rangeLabel(report.from, report.to) : '';
  });

  /** Print subtitle — the window and basis the figures were pulled under. */
  readonly caption = computed(() => {
    const report = this.report();
    if (!report) return null;
    const basisLabel = report.basis === 'BILLED' ? 'Billed' : 'Collected';
    return `${this.rangeText()} · ${basisLabel} basis · ${this.selectedPropertyLabel()}`;
  });

  readonly isEmpty = computed(() => (this.report()?.groups.length ?? 0) === 0);

  /**
   * How many leading columns a group heading or the grand total spans — every
   * column up to and including Memo, leaving the money columns free to line up
   * under their own headers.
   */
  readonly labelColumnSpan = computed(() => (this.accrual() ? 4 : 5));

  constructor() {
    this.filters.ensureProperties();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const { from, to } = this.range();
    this.reports
      .revenueByTenant({
        from: toIsoDate(from),
        to: toIsoDate(to),
        basis: this.basis(),
        propertyId: this.propertyId() || undefined,
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

  onPresetChange(preset: DateRangePreset): void {
    this.preset.set(preset);
    const range = resolvePreset(preset);
    if (!range) return; // custom — the pickers drive the dates
    this.range.set(range);
    this.load();
  }

  /** Editing either end by hand is what "custom" means — no extra click. */
  setFrom(from: Date): void {
    this.range.update((range) => ({ ...range, from }));
    this.preset.set('custom');
    this.load();
  }

  setTo(to: Date): void {
    this.range.update((range) => ({ ...range, to }));
    this.preset.set('custom');
    this.load();
  }

  onBasisChange(basis: RevenueBasis): void {
    if (basis === this.basis()) return;
    this.basis.set(basis);
    this.load();
  }

  onPropertyChange(): void {
    this.load();
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

  readonly allCollapsed = computed(() => {
    const groups = this.report()?.groups ?? [];
    return groups.length > 0 && groups.every((group) => this.collapsed().has(group.tenantId));
  });

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const header = this.accrual()
      ? ['Tenant', 'Date', 'Type', 'Unit', 'Memo', 'Amount', 'Paid', 'Balance']
      : ['Tenant', 'Date', 'Method', 'Unit', 'Reference no.', 'Memo', 'Amount'];

    const rows: (string | number | null)[][] = [header];
    for (const group of report.groups) {
      for (const row of group.rows) {
        rows.push(this.csvRow(group, row));
      }
      rows.push([`Total for ${group.tenantName}`, ...this.csvSubtotal(group)]);
    }
    rows.push([`Total (${report.rowCount} rows)`, ...this.csvGrandTotal(report)]);

    downloadCsv(`revenue-by-tenant_${report.basis.toLowerCase()}_${report.from}_${report.to}.csv`, toCsv(rows));
  }

  private csvRow(group: RevenueTenantGroup, row: RevenueRow): (string | null)[] {
    return this.accrual()
      ? [group.tenantName, row.date, row.kind, row.unitLabel, row.memo, row.amount, row.paid, row.balance]
      : [group.tenantName, row.date, row.kind, row.unitLabel, row.referenceNo, row.memo, row.amount];
  }

  /** Pads the leading blanks so subtotals land under the columns they total. */
  private csvSubtotal(group: RevenueTenantGroup): (string | null)[] {
    return this.accrual()
      ? ['', '', '', '', group.subtotal, group.subtotalPaid, group.subtotalBalance]
      : ['', '', '', '', '', group.subtotal];
  }

  private csvGrandTotal(report: RevenueByTenantReport): (string | null)[] {
    return this.accrual()
      ? ['', '', '', '', report.total, report.totalPaid, report.totalBalance]
      : ['', '', '', '', '', report.total];
  }

  private selectedPropertyLabel(): string {
    return this.filters.labelFor(this.propertyId());
  }
}

/** Unreachable fallback — `resolvePreset` only returns null for `custom`. */
function todayOnly(): DateRange {
  const today = new Date();
  return { from: today, to: today };
}
