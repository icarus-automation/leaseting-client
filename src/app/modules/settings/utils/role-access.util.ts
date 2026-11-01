import type { SessionUser } from '../../../core/auth/auth.types';
import type { AccessCatalog, CatalogPermission } from '../../../core/models/access-catalog.types';
import type { Role, RoleKind } from '../../../core/models/role.types';

export const USERS_SETTINGS_HREF = '/settings/users';

export const ROLE_NOT_COPYABLE_MESSAGE =
  "Tenant and parking attendant roles belong to their own apps, so they can't be copied.";

export const KIND_FILTERS: readonly { value: RoleListQuery['kind']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'system', label: 'System' },
  { value: 'custom', label: 'Custom' },
];

export const ACTIVITY_FILTERS: readonly { value: RoleListQuery['activity']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const COPY_PREFIX = 'Copy of ';
const NAME_MAX = 50;
const GRANTABLE_REASON = 'Owner and admin only.';
const HELD_REASON = "You can't give a permission you don't have.";

export interface RoleWritePayload {
  name: string;
  description: string | null;
  permissions: string[];
}

export interface RoleListQuery {
  kind: 'all' | RoleKind;
  activity: 'all' | 'active' | 'inactive';
  search: string;
}

export interface RoleRow {
  role: Role;
  typeLabel: 'System' | 'Custom';
  peopleLabel: string;
  /** The "⋯" menu, top to bottom. Delete is last, set apart by a divider. */
  menu: readonly RoleMenuAction[];
  deleteRefusal: { message: string; usersHref: string } | null;
}

export type RoleMenuAction = 'view' | 'edit' | 'duplicate' | 'toggle-active' | 'delete';

export interface CatalogIndex {
  catalog: AccessCatalog;
  byCode: ReadonlyMap<string, CatalogPermission>;
}

export interface PermissionPick {
  selected: ReadonlySet<string>;
  unknown: readonly string[];
}

export interface RoleSeed {
  name: string;
  description: string;
  pick: PermissionPick;
}

export type RoleDraft =
  | { intent: 'create'; seed: RoleSeed }
  | { intent: 'edit'; roleId: string; seed: RoleSeed }
  | { intent: 'view'; role: Role; seed: RoleSeed };

export type DraftRequest =
  | { kind: 'new' }
  | { kind: 'copy'; role: Role }
  | { kind: 'open'; role: Role };

export type DraftOpen = { ok: true; draft: RoleDraft } | { ok: false; message: string };

export interface NameDescription {
  name: string;
  description: string;
}

export interface PickerView {
  totalSelected: number;
  totalCodes: number;
  unknown: readonly string[];
  groups: readonly PickerGroup[];
}

export interface PickerGroup {
  id: string;
  label: string;
  selected: number;
  visible: number;
  selectAll: 'none' | 'some' | 'all';
  selectAllEnabled: boolean;
  permissions: readonly PickerRow[];
}

export interface PickerRow {
  code: string;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  reason: string | null;
}

export function heldCodes(user: SessionUser | null): ReadonlySet<string> {
  return new Set(user?.permissions ?? []);
}

export function indexCatalog(catalog: AccessCatalog): CatalogIndex {
  const byCode = new Map<string, CatalogPermission>();
  for (const group of catalog.groups) {
    for (const permission of group.permissions) {
      byCode.set(permission.code, permission);
    }
  }
  return { catalog, byCode };
}

export function filterRoles(roles: readonly Role[], query: RoleListQuery): Role[] {
  const needle = query.search.trim().toLowerCase();
  return roles.filter((role) => {
    if (query.kind !== 'all' && role.kind !== query.kind) return false;
    if (query.activity === 'inactive') {
      if (role.kind === 'system' || role.isActive) return false;
    } else if (query.activity === 'active' && !role.isActive) {
      return false;
    }
    if (!needle) return true;
    return [role.name, role.description ?? ''].some((field) => field.toLowerCase().includes(needle));
  });
}

export function presentRole(role: Role, canManage: boolean): RoleRow {
  return {
    role,
    typeLabel: role.kind === 'system' ? 'System' : 'Custom',
    peopleLabel: role.memberCount === 1 ? '1 person' : `${role.memberCount} people`,
    menu: roleMenu(role, canManage),
    deleteRefusal:
      role.memberCount > 0
        ? { message: inUseMessage(role.memberCount), usersHref: USERS_SETTINGS_HREF }
        : null,
  };
}

/**
 * A custom role can be edited, copied, switched and deleted. A system role is
 * locked: look at it, and copy it if it's a staff role. The resident and parking
 * attendant roles belong to their own apps and can't even be copied.
 */
function roleMenu(role: Role, canManage: boolean): RoleMenuAction[] {
  if (!canManage) return ['view'];
  if (!role.isLocked) return ['edit', 'duplicate', 'toggle-active', 'delete'];
  return role.audience === 'staff' ? ['view', 'duplicate'] : ['view'];
}

export function openDraft(request: DraftRequest, index: CatalogIndex, canManage: boolean): DraftOpen {
  if (request.kind === 'new') {
    return {
      ok: true,
      draft: {
        intent: 'create',
        seed: { name: '', description: '', pick: { selected: new Set(), unknown: [] } },
      },
    };
  }

  if (request.kind === 'copy') {
    if (request.role.audience !== 'staff') {
      return { ok: false, message: ROLE_NOT_COPYABLE_MESSAGE };
    }
    return {
      ok: true,
      draft: {
        intent: 'create',
        seed: {
          name: copyName(request.role.name),
          description: request.role.kind === 'custom' ? (request.role.description ?? '') : '',
          pick: pickFromRole(request.role, index, true),
        },
      },
    };
  }

  const seed = {
    name: request.role.name,
    description: request.role.description ?? '',
    pick: pickFromRole(request.role, index, false),
  };
  if (request.role.isLocked || !canManage) {
    return { ok: true, draft: { intent: 'view', role: request.role, seed } };
  }
  return { ok: true, draft: { intent: 'edit', roleId: request.role.id, seed } };
}

export function togglePermission(
  pick: PermissionPick,
  code: string,
  index: CatalogIndex,
  held: ReadonlySet<string>,
): PermissionPick {
  if (!isUnlocked(index.byCode.get(code), held)) return pick;
  const selected = new Set(pick.selected);
  if (selected.has(code)) selected.delete(code);
  else selected.add(code);
  return { selected, unknown: pick.unknown };
}

export function toggleGroup(
  pick: PermissionPick,
  groupId: string,
  index: CatalogIndex,
  held: ReadonlySet<string>,
  query: string,
): PermissionPick {
  const group = index.catalog.groups.find((candidate) => candidate.id === groupId);
  if (!group) return pick;

  const unlocked = group.permissions.filter(
    (permission) => matchesPermission(permission, query) && isUnlocked(permission, held),
  );
  if (unlocked.length === 0) return pick;

  const selected = new Set(pick.selected);
  const allOn = unlocked.every((permission) => selected.has(permission.code));
  for (const permission of unlocked) {
    if (allOn) selected.delete(permission.code);
    else selected.add(permission.code);
  }
  return { selected, unknown: pick.unknown };
}

export function projectPicker(
  index: CatalogIndex,
  pick: PermissionPick,
  held: ReadonlySet<string>,
  query: string,
  writable: boolean,
): PickerView {
  let totalCodes = 0;
  let totalSelected = 0;
  const groups: PickerGroup[] = [];

  for (const group of index.catalog.groups) {
    let selected = 0;
    const rows: PickerRow[] = [];
    const unlockedVisible: CatalogPermission[] = [];

    for (const permission of group.permissions) {
      totalCodes += 1;
      const checked = pick.selected.has(permission.code);
      if (checked) {
        totalSelected += 1;
        selected += 1;
      }
      if (!matchesPermission(permission, query)) continue;

      const reason = blockReason(permission, held);
      const unlocked = reason === null;
      if (unlocked) unlockedVisible.push(permission);
      rows.push({
        code: permission.code,
        label: permission.label,
        description: permission.description,
        checked,
        disabled: !writable || !unlocked,
        reason,
      });
    }

    if (rows.length === 0) continue;

    const selectedVisible = unlockedVisible.filter((permission) => pick.selected.has(permission.code)).length;
    groups.push({
      id: group.id,
      label: group.label,
      selected,
      visible: rows.length,
      selectAll:
        unlockedVisible.length === 0 || selectedVisible === 0
          ? 'none'
          : selectedVisible === unlockedVisible.length
            ? 'all'
            : 'some',
      selectAllEnabled: writable && unlockedVisible.length > 0,
      permissions: rows,
    });
  }

  return { totalSelected, totalCodes, unknown: pick.unknown, groups };
}

export function writePayload(
  fields: NameDescription,
  pick: PermissionPick,
  index: CatalogIndex,
): RoleWritePayload {
  const description = fields.description.trim();
  const permissions: string[] = [];
  for (const group of index.catalog.groups) {
    for (const permission of group.permissions) {
      if (pick.selected.has(permission.code) && permission.grantable) {
        permissions.push(permission.code);
      }
    }
  }

  return {
    name: fields.name.trim().replace(/\s+/g, ' '),
    description: description.length > 0 ? description : null,
    permissions,
  };
}

function pickFromRole(role: Role, index: CatalogIndex, dropNotGrantable: boolean): PermissionPick {
  const selected = new Set<string>();
  const unknown: string[] = [];
  for (const code of role.permissions) {
    const permission = index.byCode.get(code);
    if (!permission) {
      unknown.push(code);
      continue;
    }
    if (dropNotGrantable && !permission.grantable) continue;
    selected.add(code);
  }
  return { selected, unknown };
}

function copyName(name: string): string {
  const prefixed = `${COPY_PREFIX}${name}`;
  return prefixed.length <= NAME_MAX ? prefixed : prefixed.slice(0, NAME_MAX);
}

function inUseMessage(count: number): string {
  const who = count === 1 ? '1 person has' : `${count} people have`;
  return `${who} this role. Give them another role before deleting it.`;
}

function matchesPermission(permission: CatalogPermission, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [permission.label, permission.code, permission.description].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

function blockReason(permission: CatalogPermission, held: ReadonlySet<string>): string | null {
  if (!permission.grantable) return GRANTABLE_REASON;
  if (!held.has(permission.code)) return HELD_REASON;
  return null;
}

function isUnlocked(permission: CatalogPermission | undefined, held: ReadonlySet<string>): boolean {
  return permission !== undefined && blockReason(permission, held) === null;
}
