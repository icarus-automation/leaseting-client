import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PIcon } from '@primeicons/angular/p-icon';

import type { BillListItem } from '../../core/models/bill.types';
import type { LeaseListItem } from '../../core/models/lease.types';
import type { PropertyListItem } from '../../core/models/property.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { KitCard } from '../../shared/ui/kit/kit-card';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { daysUntil, isPastDue } from '../../shared/utils/date.util';
import { BillsService } from '../bills/services/bills.service';
import { LeasesService } from '../leases/services/leases.service';
import { PropertiesService } from '../properties/services/properties.service';

/** Leases ending within this window count as "expiring soon". */
const EXPIRY_WINDOW_DAYS = 60;

@Component({
  selector: 'app-home',
  imports: [RouterLink, PIcon, PhpCurrencyPipe, KitCard, Skeleton],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly properties = inject(PropertiesService);
  private readonly leases = inject(LeasesService);
  private readonly bills = inject(BillsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly propertyItems = signal<PropertyListItem[]>([]);
  readonly propertiesTotal = signal(0);
  readonly activeLeases = signal<LeaseListItem[]>([]);
  readonly unpaidBills = signal<BillListItem[]>([]);
  readonly unpaidBillsTotal = signal(0);
  readonly loadFailed = signal(false);

  /** Portfolio-wide unit occupancy, aggregated from the property summaries. */
  readonly occupancy = computed(() => {
    const summary = this.propertyItems().reduce(
      (acc, property) => ({
        total: acc.total + property.unitSummary.total,
        settled: acc.settled + property.unitSummary.settled,
        overdue: acc.overdue + property.unitSummary.overdue,
        vacant: acc.vacant + property.unitSummary.vacant,
      }),
      { total: 0, settled: 0, overdue: 0, vacant: 0 },
    );
    const occupied = summary.settled + summary.overdue;
    const pct = summary.total > 0 ? Math.round((occupied / summary.total) * 100) : 0;
    return { ...summary, occupied, pct };
  });

  readonly overdueBills = computed(() =>
    this.unpaidBills()
      .filter((bill) => isPastDue(bill.dueDate))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  );

  readonly overdueTotal = computed(() =>
    this.overdueBills().reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
  );

  readonly unpaidTotal = computed(() =>
    this.unpaidBills().reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
  );

  readonly expiringLeases = computed(() =>
    this.activeLeases()
      .map((lease) => ({ lease, daysLeft: daysUntil(lease.endDate) }))
      .filter(({ daysLeft }) => daysLeft >= 0 && daysLeft <= EXPIRY_WINDOW_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6),
  );

  /** First-run: no properties yet → show the guided setup instead of stats. */
  readonly isFirstRun = computed(() => !this.loading() && this.propertiesTotal() === 0);

  /**
   * Positive context for Kit's all-clear state. Kit's own events only describe
   * what is wrong, so a quiet day would otherwise leave it with nothing to say
   * but a checkmark — this hands it the reassurance the dashboard already knows.
   */
  readonly kitSummary = computed(() => {
    const { occupied, total } = this.occupancy();
    const parts: string[] = [];
    if (total > 0) parts.push(`${occupied} of ${total} units occupied`);

    const next = this.expiringLeases()[0];
    if (next) {
      parts.push(next.daysLeft === 0 ? 'a lease ends today' : `next renewal in ${next.daysLeft} days`);
    }

    const open = this.unpaidBillsTotal();
    if (open > 0) parts.push(`${open} bill${open === 1 ? '' : 's'} still open`);

    return parts.join(' · ');
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    forkJoin({
      properties: this.properties.list(1, 50).pipe(catchError(() => of(null))),
      leases: this.leases.list({ active: true, limit: 50 }).pipe(catchError(() => of(null))),
      bills: this.bills.list({ status: 'UNPAID', limit: 50 }).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ properties, leases, bills }) => {
        this.loading.set(false);
        this.loadFailed.set(!properties && !leases && !bills);
        if (properties) {
          this.propertyItems.set(properties.data);
          this.propertiesTotal.set(properties.meta.total);
        }
        if (leases) this.activeLeases.set(leases.data);
        if (bills) {
          this.unpaidBills.set(bills.data);
          this.unpaidBillsTotal.set(bills.meta.total);
        }
      });
  }

  /** Width (%) of each occupancy segment for a property's mini bar. */
  segment(property: PropertyListItem, part: 'settled' | 'overdue' | 'vacant'): number {
    const { total } = property.unitSummary;
    if (total === 0) return 0;
    return (property.unitSummary[part] / total) * 100;
  }
}
