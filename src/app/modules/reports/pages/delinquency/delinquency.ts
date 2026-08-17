import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  DelinquencyReport,
  DelinquencyTenant,
  ReminderEntry,
} from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { BadgeTone, StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { BillsService } from '../../../bills/services/bills.service';
import { asOfLabel, toIsoDate } from '../../as-of.util';
import { AsOfFilter } from '../../components/as-of-filter/as-of-filter';
import { ReportHeader } from '../../components/report-header/report-header';
import { downloadCsv, toCsv } from '../../csv-export.util';
import { TIER_META } from '../../receivables.util';
import { ALL_PROPERTIES, ReportFiltersService } from '../../services/report-filters.service';
import { ReportsService } from '../../services/reports.service';

const WINDOW_OPTIONS = [
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
  { value: 24, label: 'Last 24 months' },
];

/**
 * Delinquency & Reminders.
 *
 * Aging says how much is owed; this says who the problem is and whether
 * anything has already been done about it. The reminder ladder has been
 * running and logging every send since it shipped — this is the first surface
 * that reads that trail back, which is what turns "we should chase them" into
 * "we have chased them nine times and it is not working".
 */
@Component({
  selector: 'app-delinquency',
  imports: [
    FormsModule,
    RouterLink,
    PIcon,
    Select,
    PhpCurrencyPipe,
    Skeleton,
    StatusBadge,
    ReportHeader,
    AsOfFilter,
  ],
  templateUrl: './delinquency.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Delinquency {
  private readonly reports = inject(ReportsService);
  private readonly bills = inject(BillsService);
  private readonly filters = inject(ReportFiltersService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly windowOptions = WINDOW_OPTIONS;
  readonly skeletons = Array.from({ length: 4 });
  readonly propertyOptions = this.filters.propertyOptions;
  readonly tiers = TIER_META;

  readonly asOf = signal<Date>(new Date());
  readonly propertyId = signal<string>(ALL_PROPERTIES);
  readonly months = signal(12);

  readonly report = signal<DelinquencyReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expanded = signal<ReadonlySet<string>>(new Set());
  /** Tenant id whose reminder is in flight — keeps the button honest. */
  readonly sending = signal<string | null>(null);

  readonly asOfText = computed(() => {
    const report = this.report();
    return report ? asOfLabel(report.asOf) : '';
  });

  readonly caption = computed(() => {
    const report = this.report();
    if (!report) return null;
    return `As of ${this.asOfText()} · last ${report.months} months · ${this.filters.labelFor(this.propertyId())}`;
  });

  readonly isEmpty = computed(() => (this.report()?.tenants.length ?? 0) === 0);

  /** Widest bar in the effectiveness panel, so the rest scale against it. */
  readonly peakSent = computed(() =>
    Math.max(1, ...(this.report()?.effectiveness ?? []).map((stat) => stat.sent)),
  );

  readonly hasReminders = computed(() => (this.report()?.effectiveness.length ?? 0) > 0);

  constructor() {
    this.filters.ensureProperties();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.reports
      .delinquency({
        asOf: toIsoDate(this.asOf()),
        months: this.months(),
        propertyId: this.propertyId() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.expanded.set(new Set());
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

  onFilterChange(): void {
    this.load();
  }

  toggle(tenantId: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(tenantId)) next.add(tenantId);
      return next;
    });
  }

  isExpanded(tenantId: string): boolean {
    return this.expanded().has(tenantId);
  }

  tierOf(tenant: DelinquencyTenant) {
    return TIER_META[tenant.tier];
  }

  tierChipClass(tenant: DelinquencyTenant): string {
    switch (TIER_META[tenant.tier].tone) {
      case 'destructive':
        return 'border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-muted-destructive';
      case 'warning':
        return 'border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-muted-warning';
      default:
        return 'border-border bg-surface';
    }
  }

  tierDotClass(tenant: DelinquencyTenant): string {
    switch (TIER_META[tenant.tier].tone) {
      case 'destructive':
        return 'bg-destructive';
      case 'warning':
        return 'bg-warning';
      default:
        return 'bg-border-strong';
    }
  }

  /** "Late 5 of 14" — the ratio is the pattern; the count alone is not. */
  patternText(tenant: DelinquencyTenant): string {
    if (tenant.billsConsidered === 0) return 'No bills due yet in this period';
    return `Late on ${tenant.lateCount} of ${tenant.billsConsidered}`;
  }

  lastContactText(tenant: DelinquencyTenant): string {
    if (!tenant.lastReminderAt) return 'Never contacted';
    return `${asOfLabel(tenant.lastReminderAt)} · ${tenant.lastReminderStage}`;
  }

  asOfLabelFor(iso: string): string {
    return asOfLabel(iso);
  }

  statusTone(entry: ReminderEntry): BadgeTone {
    switch (entry.status) {
      case 'SENT':
        return 'success';
      case 'FAILED':
        return 'destructive';
      default:
        return 'neutral';
    }
  }

  statusLabel(entry: ReminderEntry): string {
    switch (entry.status) {
      case 'SENT':
        return 'Delivered';
      case 'FAILED':
        return 'Failed';
      default:
        return 'Pending';
    }
  }

  canSend(tenant: DelinquencyTenant): boolean {
    return Boolean(this.report()?.smsEnabled) && tenant.chaseBillId !== null;
  }

  /**
   * Sending costs a real SMS credit and reaches a real person, so it always
   * goes through a confirm naming who is being texted and about what.
   */
  confirmSend(tenant: DelinquencyTenant): void {
    const billId = tenant.chaseBillId;
    if (!billId) return;

    this.confirmation.confirm({
      header: 'Send payment reminder',
      message:
        `Text ${tenant.tenantName} at ${tenant.contactNo} about their oldest unpaid bill ` +
        `(${tenant.oldestDaysOverdue} days overdue)? This sends immediately and uses one SMS credit.`,
      icon: 'pi pi-send',
      acceptButtonProps: { label: 'Send now' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.send(tenant, billId),
    });
  }

  private send(tenant: DelinquencyTenant, billId: string): void {
    this.sending.set(tenant.tenantId);
    this.bills
      .remind(billId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sending.set(null);
          if (result.ok) {
            this.toast.add({
              severity: 'success',
              summary: `Reminder sent to ${tenant.tenantName}`,
              detail: result.recipient,
            });
            // Reload so the trail shows the send that just happened rather
            // than a stale count next to a fresh toast.
            this.load();
          } else {
            this.toast.add({
              severity: 'error',
              summary: 'The gateway rejected the message',
              detail: result.error ?? undefined,
            });
          }
        },
        error: (error: unknown) => {
          this.sending.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Could not send the reminder',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  print(): void {
    window.print();
  }

  exportCsv(): void {
    const report = this.report();
    if (!report) return;

    const rows: (string | number | null)[][] = [
      [
        'Tenant',
        'Contact',
        'Units',
        'Severity',
        'Bills due',
        'Late',
        'On time',
        'Avg days late',
        'Worst days late',
        'Overdue now',
        'Oldest days overdue',
        'Reminders sent',
        'Last reminder',
      ],
    ];

    for (const tenant of report.tenants) {
      rows.push([
        tenant.tenantName,
        tenant.contactNo,
        tenant.units.join(' / '),
        TIER_META[tenant.tier].label,
        tenant.billsConsidered,
        tenant.lateCount,
        tenant.onTimeCount,
        tenant.avgDaysLate,
        tenant.maxDaysLate,
        tenant.openOverdueAmount,
        tenant.oldestDaysOverdue,
        tenant.remindersSent,
        tenant.lastReminderAt,
      ]);
    }

    downloadCsv(`delinquency_${report.asOf}_${report.months}m.csv`, toCsv(rows));
  }
}
