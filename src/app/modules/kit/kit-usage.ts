import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../core/models/api.types';
import type { KitUsageReport } from './kit-usage.types';
import { KitUsageService } from './services/kit-usage.service';

const RANGES = [7, 30, 90] as const;

@Component({
  selector: 'app-kit-usage',
  imports: [DatePipe, DecimalPipe, PercentPipe, RouterLink, PIcon],
  templateUrl: './kit-usage.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitUsage {
  private readonly usage = inject(KitUsageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly ranges = RANGES;
  readonly days = signal<number>(30);
  readonly report = signal<KitUsageReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly totalCost = computed(() => this.report()?.totals.costUsd ?? null);

  readonly failureRate = computed(() => {
    const totals = this.report()?.totals;
    if (!totals || totals.calls === 0) return 0;
    return totals.failures / totals.calls;
  });

  readonly cacheRate = computed(() => {
    const totals = this.report()?.totals;
    if (!totals || totals.inputTokens === 0) return 0;
    return totals.cachedTokens / totals.inputTokens;
  });

  readonly peakCalls = computed(() =>
    Math.max(1, ...(this.report()?.daily ?? []).map((day) => day.calls)),
  );

  constructor() {
    this.load();
  }

  setDays(days: number): void {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  barHeight(calls: number): string {
    return `${Math.max(4, Math.round((calls / this.peakCalls()) * 100))}%`;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usage
      .report(this.days())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(apiErrorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
