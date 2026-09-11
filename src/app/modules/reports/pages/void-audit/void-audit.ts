import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { format } from 'date-fns';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ParkingVoidReport, ParkingVoidRow } from '../../../../core/models/report.types';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
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

/**
 * Void Audit: the stays struck off the floor, with the reason and the person
 * who decided it.
 *
 * There is no money column and that is not an omission. A void only ever hits
 * an open stay, which was never priced and never collected on, so any peso
 * figure here would be one this system invented. What a void costs is the stay
 * it erased; what the audit is for is the pattern behind it, which is why the
 * page leads with who voided rather than with how many.
 */
@Component({
  selector: 'app-void-audit',
  imports: [PIcon, Skeleton, ParkingScopeFilter, ReportHeader],
  templateUrl: './void-audit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoidAudit {
  private readonly reports = inject(ReportsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly skeletons = Array.from({ length: 6 });

  readonly scope = signal<ParkingReportScope>(defaultScope());

  readonly report = signal<ParkingVoidReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly rangeText = computed(() => {
    const report = this.report();
    return report ? rangeLabel(report.from, report.to) : '';
  });

  readonly caption = computed(() => {
    if (!this.report()) return null;
    return `${this.rangeText()} · ${this.scopeLabel()} · Voided stays`;
  });

  readonly isEmpty = computed(() => (this.report()?.totals.voids ?? 0) === 0);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .parkingVoids(scopeQuery(this.scope()))
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

  inParkLabel(row: ParkingVoidRow): string {
    return minutesLabel(row.minutesInPark);
  }

  stayLabel(minutes: number): string {
    return minutesLabel(minutes);
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
        'Voided at',
        'Ticket',
        'Plate',
        'Terminal',
        'Property',
        'Vehicle type',
        'Entered at',
        'Time in park (minutes)',
        'Entry attendant',
        'Voided by',
        'Reason',
      ],
      ...report.rows.map((row) => [
        this.stamp(row.voidedAt),
        row.ticketCode,
        row.plateNumber,
        row.terminalName,
        row.propertyName,
        row.vehicleTypeName,
        this.stamp(row.entryAt),
        row.minutesInPark,
        row.entryAttendantName,
        row.voidedByName,
        row.reason,
      ]),
    ];

    downloadCsv(`parking-void-audit_${report.from}_${report.to}.csv`, toCsv(rows));
  }

  private scopeLabel(): string {
    const scope = this.scope();
    return `${this.filters.labelFor(scope.propertyId)} · ${this.filters.terminalLabelFor(scope.terminalId)}`;
  }
}
