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

/**
 * A search box that accepts a sentence and answers with filters you can see.
 *
 * The chips are the point. A sentence that silently becomes a result set is a
 * black box a manager has to take on faith, and the failure mode — a filter
 * that was misread — looks exactly like a correct answer with fewer rows. Here
 * the same sentence becomes labelled, removable chips: readable before the
 * rows are, correctable without retyping, and a way to learn what this table
 * can actually be filtered by.
 *
 * Nothing is applied until the parse comes back, and what is applied is
 * exactly what the chips say.
 */
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
  /** An example query, so the box teaches what it accepts. */
  readonly placeholder = input('Describe what you want to see…');

  /**
   * The filters to run, emitted whenever they change — a parse, a removed
   * chip, or a clear. The parent owns the request; this component never
   * fetches rows itself.
   */
  readonly filtersChange = output<GridFilters>();

  readonly text = signal('');
  readonly parsing = signal(false);
  readonly error = signal<string | null>(null);

  readonly filters = signal<GridFilters>({});
  readonly chips = signal<FilterChip[]>([]);
  readonly unresolved = signal<string[]>([]);
  readonly source = signal<QuerySource | null>(null);

  readonly hasFilters = computed(() => this.chips().length > 0);
  /** True once a parse has run and produced nothing to show. */
  readonly foundNothing = computed(() => this.source() === 'none' && !this.parsing());

  /**
   * How the sentence was read, in the user's words.
   *
   * Worth saying out loud: a manager who can see that most of their searches
   * never left the building is better placed to judge the one that did.
   */
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

  /**
   * Drops one chip and re-runs with the rest.
   *
   * Done locally rather than by re-parsing the sentence: the user is
   * correcting the parse, and sending the same words back would produce the
   * same chip again.
   */
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
