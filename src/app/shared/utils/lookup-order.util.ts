const CATCH_ALL_NAMES = new Set(['other', 'others', 'other charge', 'miscellaneous', 'misc']);

export function isCatchAllName(name: string): boolean {
  return CATCH_ALL_NAMES.has(name.trim().toLowerCase());
}

export function sortLookupRows<T extends { name: string; isArchived: boolean }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.isArchived) - Number(b.isArchived) ||
      Number(isCatchAllName(a.name)) - Number(isCatchAllName(b.name)) ||
      a.name.localeCompare(b.name),
  );
}
