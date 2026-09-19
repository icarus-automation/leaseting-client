import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { GridQueryService } from '../../../core/kit/grid-query.service';
import { apiErrorMessage } from '../../../core/models/api.types';
import {
  FilterChip,
  GridFilters,
  GridId,
  QuerySource,
  withoutChip,
} from '../../../core/models/grid-query.types';

@Component({
  selector: 'app-nl-filter-bar',
  imports: [PIcon],
  templateUrl: './nl-filter-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NlFilterBar {
  private readonly gridQuery = inject(GridQueryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly grid = input.required<GridId>();
  readonly placeholder = input('Describe what you want to see…');

  readonly filtersChange = output<GridFilters>();

  readonly text = signal('');
  readonly parsing = signal(false);
  readonly error = signal<string | null>(null);

  readonly filters = signal<GridFilters>({});
  readonly chips = signal<FilterChip[]>([]);
  readonly unresolved = signal<string[]>([]);
  readonly source = signal<QuerySource | null>(null);

  readonly hasFilters = computed(() => this.chips().length > 0);
  readonly foundNothing = computed(() => this.source() === 'none' && !this.parsing());

  readonly sourceLabel = computed(() => {
    switch (this.source()) {
      case 'keywords':
        return 'Read instantly';
      case 'model':
        return 'Interpreted by Kit';
      default:
        return null;
    }
  });

  onInput(event: Event): void {
    this.text.set((event.target as HTMLInputElement).value);
  }

  submit(): void {
    const text = this.text().trim();
    if (!text || this.parsing()) return;

    this.parsing.set(true);
    this.error.set(null);

    this.gridQuery
      .parse(this.grid(), text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.parsing.set(false);
          this.filters.set(result.filters);
          this.chips.set(result.chips);
          this.unresolved.set(result.unresolved);
          this.source.set(result.source);
          this.filtersChange.emit(result.filters);
        },
        error: (error: unknown) => {
          this.parsing.set(false);
          this.error.set(apiErrorMessage(error, 'Could not read that. Try rephrasing.'));
        },
      });
  }

  removeChip(chip: FilterChip): void {
    const remaining = withoutChip(this.filters(), chip);
    this.filters.set(remaining);
    this.chips.update((chips) => chips.filter((existing) => existing.key !== chip.key));
    this.filtersChange.emit(remaining);
  }

  clear(): void {
    this.text.set('');
    this.filters.set({});
    this.chips.set([]);
    this.unresolved.set([]);
    this.source.set(null);
    this.error.set(null);
    this.filtersChange.emit({});
  }
}
