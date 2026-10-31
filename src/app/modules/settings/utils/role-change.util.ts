import type { AccessCatalog } from '../../../core/models/access-catalog.types';

export interface PermissionChanges {
  /** Labels of the codes the new role adds, in catalog order. */
  gained: string[];
  /** Labels of the codes the person loses. */
  lost: string[];
}

/**
 * What moving from `from` to `to` adds and takes away, named by the catalog.
 * Without a catalog, or for a code it doesn't list, the code itself is shown.
 */
export function permissionChanges(
  from: readonly string[],
  to: readonly string[],
  catalog: AccessCatalog | null,
): PermissionChanges {
  const labels = new Map<string, string>();
  const order = new Map<string, number>();
  for (const group of catalog?.groups ?? []) {
    for (const permission of group.permissions) {
      labels.set(permission.code, permission.label);
      order.set(permission.code, order.size);
    }
  }

  const before = new Set(from);
  const after = new Set(to);
  const byCatalogOrder = (a: string, b: string) =>
    (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER);
  const label = (code: string) => labels.get(code) ?? code;

  return {
    gained: [...after].filter((code) => !before.has(code)).sort(byCatalogOrder).map(label),
    lost: [...before].filter((code) => !after.has(code)).sort(byCatalogOrder).map(label),
  };
}
