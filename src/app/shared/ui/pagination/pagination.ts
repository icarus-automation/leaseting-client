import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import type { PageMeta } from '../../../core/models/api.types';

@Component({
  selector: 'app-pagination',
  imports: [PIcon],
  template: `
    @if (meta(); as m) {
      @if (m.total > 0) {
        <nav class="flex items-center justify-between gap-3" aria-label="Pagination">
          <p class="text-[13px] text-muted">
            {{ rangeLabel() }}
          </p>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-base border border-border bg-background px-2.5 text-[13px] font-medium text-body transition-colors duration-150 ease-out enabled:hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
              [disabled]="m.page <= 1"
              (click)="pageChange.emit(m.page - 1)"
            >
              <svg pIcon="chevron-left" [size]="12" aria-hidden="true"></svg>
              <span>Prev</span>
            </button>
            <span class="px-1.5 text-[13px] text-body tabular-nums">Page {{ m.page }} of {{ m.lastPage }}</span>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-base border border-border bg-background px-2.5 text-[13px] font-medium text-body transition-colors duration-150 ease-out enabled:hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
              [disabled]="m.page >= m.lastPage"
              (click)="pageChange.emit(m.page + 1)"
            >
              <span>Next</span>
              <svg pIcon="chevron-right" [size]="12" aria-hidden="true"></svg>
            </button>
          </div>
        </nav>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly meta = input.required<PageMeta | null>();
  readonly pageChange = output<number>();

  readonly rangeLabel = computed(() => {
    const m = this.meta();
    if (!m) return '';
    const from = (m.page - 1) * m.limit + 1;
    const to = Math.min(m.page * m.limit, m.total);
    return `${from}-${to} of ${m.total}`;
  });
}
