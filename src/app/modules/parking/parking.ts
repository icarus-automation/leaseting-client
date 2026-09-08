import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';
import { forkJoin, interval } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/models/api.types';
import type {
  ParkingOverviewSession,
  ParkingOverviewShift,
  ParkingOverviewSummary,
} from '../../core/models/parking-overview.types';
import type { ParkingTerminalResponse } from '../../core/models/parking-terminal.types';
import type { PropertyListItem } from '../../core/models/property.types';
import { PhpCurrencyPipe, formatPhp } from '../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../shared/ui/error-banner/error-banner';
import { ReasonDialog } from '../../shared/ui/reason-dialog/reason-dialog';
import { SegmentedControl } from '../../shared/ui/segmented-control/segmented-control';
import type { SegmentedOption } from '../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { ParkingTerminalsService } from '../settings/services/parking-terminals.service';
import { PropertiesService } from '../properties/services/properties.service';
import { ParkedTable } from './components/parked-table/parked-table';
import { ParkingActivityTable } from './components/parking-activity-table/parking-activity-table';
import { ShiftCashList } from './components/shift-cash-list/shift-cash-list';
import { ParkingOverviewService } from './services/parking-overview.service';
import { varianceLabel } from './utils/parking-overview.util';

type OverviewTab = 'in-park' | 'activity' | 'cash';

/** The tiles a void or a confirm can move without re-reading the floor. */
type SummaryCounter = 'inParkCount' | 'voidsToday' | 'shiftsPendingConfirm';

const ALL = 'all';

/** Elapsed stays are the point of the in-park table, so the clock has to move. */
const ELAPSED_TICK_MS = 30_000;

/**
 * The API caps a page at 200. Asking for the ceiling on the floor keeps a busy
 * gate whole; if a property ever fills past it, the table says so rather than
 * quietly showing a partial floor as if it were the whole one.
 */
const IN_PARK_LIMIT = 200;
const ACTIVITY_LIMIT = 50;

/**
 * Parking Overview: the admin read of a floor that is worked entirely from
 * handhelds.
 *
 * The two corrections an admin is allowed live here and nowhere else. A wrong
 * entry is struck off with a reason (open stays only, because a collected exit
 * is money that already changed hands), and a guard's declared cash is signed
 * off against what the API expected. Entry and exit are absent by design: this
 * page cannot raise a barrier or take a peso, and there is no endpoint for it
 * to call if someone tried.
 */
@Component({
  selector: 'app-parking',
  imports: [
    FormsModule,
    PIcon,
    Select,
    PhpCurrencyPipe,
    ErrorBanner,
    ReasonDialog,
    SegmentedControl,
    Skeleton,
    ParkedTable,
    ParkingActivityTable,
    ShiftCashList,
  ],
  templateUrl: './parking.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Parking {
  private readonly overviewApi = inject(ParkingOverviewService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly terminalsApi = inject(ParkingTerminalsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Voiding and confirming both move money, so both are owner/admin only. */
  readonly canCorrect = this.auth.isFinancialAdmin;

  readonly properties = signal<PropertyListItem[]>([]);
  readonly terminals = signal<ParkingTerminalResponse[]>([]);
  readonly propertyId = signal<string>(ALL);
  readonly terminalId = signal<string>(ALL);
  readonly plateQuery = signal('');

  readonly tab = signal<OverviewTab>('in-park');
  readonly summary = signal<ParkingOverviewSummary | null>(null);
  readonly inPark = signal<ParkingOverviewSession[]>([]);
  readonly activity = signal<ParkingOverviewSession[]>([]);
  readonly shifts = signal<ParkingOverviewShift[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);

  readonly voidTarget = signal<ParkingOverviewSession | null>(null);
  readonly voidDialogVisible = signal(false);
  readonly voidHeading = computed(() => {
    const plate = this.voidTarget()?.plateNumber;
    return plate ? `Void ${plate}` : 'Void stay';
  });

  /** Ticks the elapsed column without re-fetching the floor. */
  readonly now = signal(Date.now());

  readonly activityLimit = ACTIVITY_LIMIT;
  /** True when the floor is bigger than one page, so the table can say so. */
  readonly inParkCapped = computed(() => this.inPark().length >= IN_PARK_LIMIT);

  readonly propertyOptions = computed(() => [
    { label: 'All properties', value: ALL },
    ...this.properties().map((property) => ({ label: property.name, value: property.id })),
  ]);

  /** A terminal belongs to one property, so narrowing the property narrows this. */
  readonly terminalOptions = computed(() => {
    const propertyId = this.propertyId();
    const scoped = this.terminals().filter(
      (terminal) => propertyId === ALL || terminal.propertyId === propertyId,
    );
    return [
      { label: 'All terminals', value: ALL },
      ...scoped.map((terminal) => ({
        label: propertyId === ALL ? `${terminal.name} · ${terminal.propertyName}` : terminal.name,
        value: terminal.id,
      })),
    ];
  });

  readonly tabs = computed<SegmentedOption<OverviewTab>[]>(() => {
    const pending = this.summary()?.shiftsPendingConfirm ?? 0;
    return [
      { value: 'in-park', label: 'In park' },
      { value: 'activity', label: 'Recent activity' },
      { value: 'cash', label: pending > 0 ? `Shift cash (${pending})` : 'Shift cash' },
    ];
  });

  /** Plate search runs over the loaded floor: no round trip for three keystrokes. */
  readonly visibleInPark = computed(() => {
    const query = this.plateQuery().trim().toUpperCase();
    if (!query) return this.inPark();
    return this.inPark().filter((session) => session.plateNumber.toUpperCase().includes(query));
  });

  constructor() {
    this.loadFilters();

    interval(ELAPSED_TICK_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  onPropertyChange(value: string): void {
    this.propertyId.set(value);
    // The selected terminal may belong to the property just filtered away.
    const stillVisible = this.terminalOptions().some((option) => option.value === this.terminalId());
    if (!stillVisible) this.terminalId.set(ALL);
    this.load();
  }

  onTerminalChange(value: string): void {
    this.terminalId.set(value);
    this.load();
  }

  onTabChange(tab: OverviewTab): void {
    this.tab.set(tab);
  }

  openVoidDialog(session: ParkingOverviewSession): void {
    this.voidTarget.set(session);
    this.voidDialogVisible.set(true);
  }

  confirmVoid(reason: string): void {
    const session = this.voidTarget();
    if (!session) return;
    this.busyId.set(session.id);
    this.overviewApi
      .voidSession(session.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (voided) => {
          this.busyId.set(null);
          this.voidTarget.set(null);
          // The stay leaves the floor and joins the activity log, where the
          // reason and the actor are now on the record.
          this.inPark.update((rows) => rows.filter((row) => row.id !== voided.id));
          this.activity.update((rows) => [voided, ...rows]);
          this.bumpSummary({ inParkCount: -1, voidsToday: 1 });
          this.toast.add({
            severity: 'success',
            summary: 'Stay voided',
            detail: `${voided.plateNumber} is off the floor. The original record is kept.`,
          });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Void failed',
            detail: apiErrorMessage(error, 'Could not void this stay.'),
          });
          // A 409 means the gate got there first, so the floor on screen is stale.
          this.load();
        },
      });
  }

  askConfirmShift(shift: ParkingOverviewShift): void {
    this.confirmation.confirm({
      header: 'Confirm shift cash',
      message:
        `${shift.attendantName} at ${shift.terminalName} declared ` +
        `${peso(shift.declaredCash)} against ${peso(shift.expectedCash)} expected ` +
        `(${varianceLabel(shift.variance).toLowerCase()}). ` +
        'Confirming records your sign-off. Neither figure changes.',
      icon: 'pi pi-check-circle',
      acceptButtonProps: { label: 'Confirm' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.confirmShift(shift),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    const scope = this.scope();

    forkJoin({
      summary: this.overviewApi.summary(scope),
      inPark: this.overviewApi.sessions({ ...scope, view: 'IN_PARK', limit: IN_PARK_LIMIT }),
      activity: this.overviewApi.sessions({ ...scope, view: 'ACTIVITY', limit: ACTIVITY_LIMIT }),
      shifts: this.overviewApi.shifts({ ...scope, status: 'DECLARED' }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ summary, inPark, activity, shifts }) => {
          this.summary.set(summary);
          this.inPark.set(inPark);
          this.activity.set(activity);
          this.shifts.set(shifts);
          this.now.set(Date.now());
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load the parking floor.'));
        },
      });
  }

  private confirmShift(shift: ParkingOverviewShift): void {
    this.busyId.set(shift.id);
    this.overviewApi
      .confirmShift(shift.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (confirmed) => {
          this.busyId.set(null);
          // The queue holds declared shifts only, so a confirmed one leaves it.
          this.shifts.update((rows) => rows.filter((row) => row.id !== confirmed.id));
          this.bumpSummary({ shiftsPendingConfirm: -1 });
          this.toast.add({
            severity: 'success',
            summary: 'Shift confirmed',
            detail: `${confirmed.attendantName}'s cash at ${confirmed.terminalName} is signed off.`,
          });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Confirm failed',
            detail: apiErrorMessage(error, 'Could not confirm this shift.'),
          });
          this.load();
        },
      });
  }

  private scope(): { propertyId?: string; terminalId?: string } {
    const propertyId = this.propertyId();
    const terminalId = this.terminalId();
    return {
      ...(propertyId !== ALL && { propertyId }),
      ...(terminalId !== ALL && { terminalId }),
    };
  }

  /**
   * Keeps the tiles honest after a void or a confirm without a second round
   * trip. Only the counters this page can actually move are adjusted; anything
   * else waits for the next load.
   */
  private bumpSummary(delta: Partial<Record<SummaryCounter, number>>): void {
    this.summary.update((current) => {
      if (!current) return current;
      const next = { ...current };
      for (const [key, amount] of Object.entries(delta) as [SummaryCounter, number][]) {
        next[key] = Math.max(0, next[key] + amount);
      }
      return next;
    });
  }

  private loadFilters(): void {
    forkJoin({
      properties: this.propertiesApi.list(1, 50),
      terminals: this.terminalsApi.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ properties, terminals }) => {
          this.properties.set(properties.data);
          this.terminals.set(terminals);
          this.load();
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load properties and terminals.'));
        },
      });
  }
}

function peso(amount: string | null): string {
  return amount === null ? 'nothing' : formatPhp(amount);
}
