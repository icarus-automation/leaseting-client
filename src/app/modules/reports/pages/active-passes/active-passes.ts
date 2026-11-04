import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { format } from 'date-fns';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ActivePassRow, ActivePassState, ActivePassesReport } from '../../../../core/models/report.types';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { parseApiDate } from '../../../../shared/utils/date.util';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import {
  DEFAULT_EXPIRING_WINDOW,
  EXPIRING_WINDOW_DAYS,
  PASS_STATE_FILTERS,
  passStateBadge,
} from '../../pass-report.util';
import { ALL_PROPERTIES, ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

type StateFilter = ActivePassState | 'all';

@Component({
  selector: 'app-active-passes',
  imports: [FormsModule, RouterLink, PIcon, Select, SegmentedControl, Skeleton, StatusBadge, ReportHeader],
  templateUrl: './active-passes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivePasses {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly skeletons = Array.from({ length: 6 });
  readonly propertyOptions = this.filters.propertyOptions;
  readonly windowOptions = EXPIRING_WINDOW_DAYS.map((days) => ({ value: days, label: `${days} days` }));
  readonly canViewLeases = computed(() => this.auth.can('leases:view'));

  readonly propertyId = signal<string>(ALL_PROPERTIES);
  readonly withinDays = signal<number>(DEFAULT_EXPIRING_WINDOW);
  readonly stateFilter = signal<StateFilter>('all');

  readonly report = signal<ActivePassesReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly stateOptions = computed(() => {
    const totals = this.report()?.totals;
    return PASS_STATE_FILTERS.map((option) => ({
      value: option.value,
      label: totals ? `${option.label} (${option.value === 'all' ? totals.passes : totals[option.value]})` : option.label,
    }));
  });

  readonly rows = computed<ActivePassRow[]>(() => {
    const rows = this.report()?.rows ?? [];
    const state = this.stateFilter();
    return state === 'all' ? rows : rows.filter((row) => row.state === state);
  });

  readonly caption = computed(() => {
    const report = this.report();
    if (!report) return null;
    return `As of ${this.day(report.asOf)} · ${this.filters.labelFor(this.propertyId())} · Expiring means within ${report.withinDays} days`;
  });

  readonly isEmpty = computed(() => (this.report()?.totals.passes ?? 0) === 0);

  constructor() {
    this.filters.ensureProperties();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .activePasses({ propertyId: this.propertyId() || undefined, withinDays: this.withinDays() })
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

  onWindowChange(days: number): void {
    this.withinDays.set(days);
    this.load();
  }

  onStateChange(state: StateFilter): void {
    this.stateFilter.set(state);
  }

  badge(row: ActivePassRow) {
    return passStateBadge(row);
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
      ['Plate', 'Vehicle type', 'Holder', 'Contact', 'Tenant', 'Unit', 'Property', 'Paid through', 'Covered through', 'Days left', 'State', 'Auto-renew'],
      ...this.rows().map((row) => [
        row.plateDisplay,
        row.vehicleTypeName,
        row.holderName,
        row.holderContact,
        row.resident?.name ?? null,
        row.resident?.unitNo ?? null,
        row.propertyName,
        row.paidUntil,
        row.coveredThrough,
        row.daysLeft,
        passStateBadge(row).label,
        row.autoRenew ? 'On' : 'Off',
      ]),
    ];
    downloadCsv(`active-passes_${report.asOf}.csv`, toCsv(rows));
  }
}
