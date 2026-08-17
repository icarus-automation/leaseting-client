import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import { ReportCard } from './components/report-card/report-card';
import {
  REPORT_ENTRIES,
  REPORT_GROUPS,
  ReportEntry,
  ReportGroup,
  isAvailable,
} from './report-catalog';
import { ReportFavoritesService } from './services/report-favorites.service';

/** A catalog group with the entries that survived the current search. */
interface RenderedGroup extends ReportGroup {
  entries: ReportEntry[];
}

/**
 * The reports catalog: what can be run today, what is coming, and what each
 * one is waiting on. Search matches titles, summaries, and the keyword list,
 * so an accountant typing "sales by customer" still lands on the report that
 * replaced it.
 */
@Component({
  selector: 'app-reports',
  imports: [PIcon, ReportCard],
  templateUrl: './reports.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reports {
  private readonly favoritesStore = inject(ReportFavoritesService);

  readonly query = signal('');
  readonly favorites = this.favoritesStore.favorites;

  private readonly matches = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return REPORT_ENTRIES;
    return REPORT_ENTRIES.filter((entry) =>
      `${entry.title} ${entry.summary} ${entry.keywords} ${entry.blockedBy ?? ''}`
        .toLowerCase()
        .includes(term),
    );
  });

  /** Starred reports, lifted to their own group above everything else. */
  readonly favoriteEntries = computed(() =>
    this.matches().filter((entry) => this.favorites().has(entry.key)),
  );

  readonly groups = computed<RenderedGroup[]>(() => {
    const matches = this.matches();
    return REPORT_GROUPS.map((group) => ({
      ...group,
      entries: matches.filter((entry) => entry.group === group.key),
    })).filter((group) => group.entries.length > 0);
  });

  readonly resultCount = computed(() => this.matches().length);

  readonly availableCount = REPORT_ENTRIES.filter(isAvailable).length;
  readonly totalCount = REPORT_ENTRIES.length;

  isFavorite(entry: ReportEntry): boolean {
    return this.favorites().has(entry.key);
  }

  toggleFavorite(entry: ReportEntry): void {
    this.favoritesStore.toggle(entry.key);
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.query.set('');
  }
}
