import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PIcon } from '@primeicons/angular/p-icon';

import type { AgingBucket, CollectionsMonth, PropertyOccupancy } from '../../../../core/models/report.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ReportHeader } from '../../components/report-header/report-header';
import { ReportsService } from '../../services/reports.service';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

@Component({
  selector: 'app-portfolio-overview',
  imports: [PIcon, PhpCurrencyPipe, Skeleton, ReportHeader],
  templateUrl: './portfolio-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioOverview {
  private readonly reports = inject(ReportsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly collections = signal<CollectionsMonth[]>([]);
  readonly aging = signal<AgingBucket[]>([]);
  readonly occupancy = signal<PropertyOccupancy[]>([]);

  /** Best month drives the 100% bar; others scale against it. */
  readonly collectionsMax = computed(() =>
    this.collections().reduce((max, month) => Math.max(max, Number(month.total)), 0),
  );

  readonly collectionsTotal = computed(() =>
    this.collections().reduce((sum, month) => sum + Number(month.total), 0),
  );

  readonly agingTotal = computed(() =>
    this.aging().reduce((sum, bucket) => sum + Number(bucket.amount), 0),
  );

  readonly portfolioOccupancy = computed(() => {
    const totals = this.occupancy().reduce(
      (acc, property) => ({
        units: acc.units + property.totalUnits,
        occupied: acc.occupied + property.occupiedUnits,
      }),
      { units: 0, occupied: 0 },
    );
    return totals.units === 0 ? 0 : Math.round((totals.occupied / totals.units) * 1000) / 10;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    forkJoin({
      collections: this.reports.collections(12).pipe(catchError(() => of(null))),
      aging: this.reports.aging().pipe(catchError(() => of(null))),
      occupancy: this.reports.occupancy().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ collections, aging, occupancy }) => {
        this.loading.set(false);
        this.loadFailed.set(!collections && !aging && !occupancy);
        this.collections.set(collections ?? []);
        this.aging.set(aging ?? []);
        this.occupancy.set(occupancy ?? []);
      });
  }

  monthLabel(month: string): string {
    const [year, monthNo] = month.split('-');
    return `${MONTH_NAMES[Number(monthNo) - 1]} ${year}`;
  }

  barWidth(total: string): number {
    const max = this.collectionsMax();
    return max === 0 ? 0 : Math.round((Number(total) / max) * 100);
  }

  print(): void {
    window.print();
  }
}
