/**
 * Display order for the org-managed lookup lists (property types, charge
 * items), mirroring the backend's sortLookupRows: live rows first, then
 * alphabetical — except catch-all names, pinned to the bottom of their group.
 * Used when a row is inserted client-side after a create or rename, so the
 * list stays in the order the server would have returned.
 */
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
