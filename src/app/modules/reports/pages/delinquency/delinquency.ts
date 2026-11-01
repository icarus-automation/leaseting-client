import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  DelinquencyReport,
  DelinquencyResident,
  ReminderEntry,
} from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { BadgeTone, StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { BillsService } from '../../../bills/services/bills.service';
import { AsOfSelection, asOfLabel, asOfParam, todaySelection } from '../../as-of.util';
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
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly windowOptions = WINDOW_OPTIONS;
  readonly skeletons = Array.from({ length: 4 });
  readonly propertyOptions = this.filters.propertyOptions;
  readonly tiers = TIER_META;

  readonly asOf = signal<AsOfSelection>(todaySelection());
  readonly propertyId = signal<string>(ALL_PROPERTIES);
  readonly months = signal(12);

  readonly report = signal<DelinquencyReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly expanded = signal<ReadonlySet<string>>(new Set());
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

  readonly isEmpty = computed(() => (this.report()?.residents.length ?? 0) === 0);

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
        asOf: asOfParam(this.asOf()),
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

  onAsOfChange(selection: AsOfSelection): void {
    this.asOf.set(selection);
    this.load();
  }

  onFilterChange(): void {
    this.load();
  }

  toggle(residentId: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(residentId)) next.add(residentId);
      return next;
    });
  }

  isExpanded(residentId: string): boolean {
    return this.expanded().has(residentId);
  }

  tierOf(resident: DelinquencyResident) {
    return TIER_META[resident.tier];
  }

  tierChipClass(resident: DelinquencyResident): string {
    switch (TIER_META[resident.tier].tone) {
      case 'destructive':
        return 'border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-muted-destructive';
      case 'warning':
        return 'border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-muted-warning';
      default:
        return 'border-border bg-surface';
    }
  }

  tierDotClass(resident: DelinquencyResident): string {
    switch (TIER_META[resident.tier].tone) {
      case 'destructive':
        return 'bg-destructive';
      case 'warning':
        return 'bg-warning';
      default:
        return 'bg-border-strong';
    }
  }

  patternText(resident: DelinquencyResident): string {
    if (resident.billsConsidered === 0) return 'No bills due yet in this period';
    return `Late on ${resident.lateCount} of ${resident.billsConsidered}`;
  }

  lastContactText(resident: DelinquencyResident): string {
    if (!resident.lastReminderAt) return 'Never contacted';
    return `${asOfLabel(resident.lastReminderAt)} · ${resident.lastReminderStage}`;
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

  canSend(resident: DelinquencyResident): boolean {
    return Boolean(this.report()?.smsEnabled) && resident.chaseBillId !== null && this.auth.can('bills:manage');
  }

  confirmSend(resident: DelinquencyResident): void {
    const billId = resident.chaseBillId;
    if (!billId) return;

    this.confirm.proceed({
      header: 'Send payment reminder',
      message:
        `Text ${resident.residentName} at ${resident.contactNo} about their oldest unpaid bill ` +
        `(${resident.oldestDaysOverdue} days overdue)? This sends immediately and uses one SMS credit.`,
      acceptLabel: 'Send now',
      onAccept: () => this.send(resident, billId),
    });
  }

  private send(resident: DelinquencyResident, billId: string): void {
    this.sending.set(resident.residentId);
    this.bills
      .remind(billId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.sending.set(null);
          if (result.ok) {
            this.toast.add({
              severity: 'success',
              summary: `Reminder sent to ${resident.residentName}`,
              detail: result.recipient,
            });
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

    for (const resident of report.residents) {
      rows.push([
        resident.residentName,
        resident.contactNo,
        resident.units.join(' / '),
        TIER_META[resident.tier].label,
        resident.billsConsidered,
        resident.lateCount,
        resident.onTimeCount,
        resident.avgDaysLate,
        resident.maxDaysLate,
        resident.openOverdueAmount,
        resident.oldestDaysOverdue,
        resident.remindersSent,
        resident.lastReminderAt,
      ]);
    }

    downloadCsv(`delinquency_${report.asOf}_${report.months}m.csv`, toCsv(rows));
  }
}
