/** The data grids that accept a natural-language filter. */
export type GridId = 'tenants' | 'bills' | 'leases';

/** A filter value as it lands on the query string. */
export type FilterValue = string | number | boolean;
export type GridFilters = Record<string, FilterValue>;

/**
 * One applied filter, as the user sees it.
 *
 * `key` names the query params this chip owns — comma-separated when it covers
 * more than one, because a date range reads as one thing and has to come off as
 * one thing. Removing a chip is a plain deletion on the client; it never goes
 * back through the parser, so dismissing a filter can't change the others.
 */
export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

/** Where the filters came from — see `source` on the result. */
export type QuerySource = 'keywords' | 'model' | 'none';

export interface GridQueryResult {
  grid: GridId;
  filters: GridFilters;
  chips: FilterChip[];
  /** Understood but not applicable — an unknown property, a missing filter. */
  unresolved: string[];
  /**
   * 'keywords' when the sentence was read without a model call, 'model' when
   * it took one, 'none' when nothing in it narrowed the table.
   */
  source: QuerySource;
}

export interface GridQueryPayload {
  grid: GridId;
  text: string;
}

/** The params a chip owns, for removing it from an applied filter set. */
export function chipKeys(chip: FilterChip): string[] {
  return chip.key.split(',');
}

/** The same filters with one chip's params removed. */
export function withoutChip(filters: GridFilters, chip: FilterChip): GridFilters {
  const remaining = { ...filters };
  for (const key of chipKeys(chip)) delete remaining[key];
  return remaining;
}
