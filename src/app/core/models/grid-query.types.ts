export type GridId = 'tenants' | 'bills' | 'leases';

export type FilterValue = string | number | boolean;
export type GridFilters = Record<string, FilterValue>;

export interface FilterChip {
  key: string;
  label: string;
  value: string;
}

export type QuerySource = 'keywords' | 'model' | 'none';

export interface GridQueryResult {
  grid: GridId;
  filters: GridFilters;
  chips: FilterChip[];
  unresolved: string[];
  source: QuerySource;
}

export interface GridQueryPayload {
  grid: GridId;
  text: string;
}

export function chipKeys(chip: FilterChip): string[] {
  return chip.key.split(',');
}

export function withoutChip(filters: GridFilters, chip: FilterChip): GridFilters {
  const remaining = { ...filters };
  for (const key of chipKeys(chip)) delete remaining[key];
  return remaining;
}
