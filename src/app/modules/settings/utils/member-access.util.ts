import { differenceInCalendarDays, differenceInHours, differenceInMinutes, format } from 'date-fns';

import type { Permission } from '../../../core/auth/permissions';
import { INVITATION_ROLE_LABELS, type Invitation } from '../../../core/models/invitation.types';
import type { Member } from '../../../core/models/member.types';
import type { PropertyAccess } from '../../../core/models/property-access.types';
import type { Role } from '../../../core/models/role.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';
import { type PropertyAccessSummary, coversProperties, propertyAccessSummary } from './property-access.util';

export type MemberAction =
  | 'change-role'
  | 'property-access'
  | 'transfer-ownership'
  | 'deactivate'
  | 'reactivate'
  | 'reset-password'
  | 'disable-login'
  | 'enable-login';

/** The signed-in person, as the member rules see them. */
export interface MemberActor {
  userId: string;
  /** Their role id here: 'owner', 'admin', 'member', or a custom role's UUID. */
  role: string | null;
  can: (code: Permission) => boolean;
  /** Their own property limits: nobody gives access they don't have. */
  propertyAccess: PropertyAccess;
}

const OWNER = 'owner';
const ADMIN = 'admin';

export const SYSTEM_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  ...INVITATION_ROLE_LABELS,
  tenant: 'Tenant',
  parking_attendant: 'Parking attendant',
};

/** A system role's label; any other id (a custom role's UUID) has no label here. */
export function systemRoleLabel(role: string | null | undefined): string | null {
  return role && Object.hasOwn(SYSTEM_ROLE_LABELS, role) ? SYSTEM_ROLE_LABELS[role] : null;
}

/**
 * The row actions to offer on `member`. Mirrors the API's rules so nobody is
 * shown a button that can only fail; the API still enforces them. Staff:
 * nobody acts on themselves, and only the owner acts on an admin or another
 * owner. Tenants and parking attendants are not staff: their one switch is
 * their login, held by `tenants:manage_access` and `parking_attendants:manage`.
 */
export function memberActions(actor: MemberActor, member: Member): MemberAction[] {
  if (member.audience !== 'staff') return loginActions(actor, member);
  if (member.userId === actor.userId) return [];
  const isOwnerOrAdmin = member.role === OWNER || member.role === ADMIN;
  if (isOwnerOrAdmin && actor.role !== OWNER) return [];

  const actions: MemberAction[] = [];
  const isActive = member.status === 'ACTIVE';
  if (actor.can('members:update')) actions.push('change-role');
  if (canSetPropertyAccess(actor, member)) actions.push('property-access');
  if (actor.can('members:update') && actor.role === OWNER && isActive && member.role !== OWNER) {
    actions.push('transfer-ownership');
  }
  if (actor.can('members:deactivate')) actions.push(isActive ? 'deactivate' : 'reactivate');
  return actions;
}

function loginActions(actor: MemberActor, member: Member): MemberAction[] {
  const code: Permission = member.audience === 'tenant' ? 'tenants:manage_access' : 'parking_attendants:manage';
  if (!actor.can(code)) return [];
  const login: MemberAction[] = member.status === 'ACTIVE' ? ['reset-password', 'disable-login'] : ['enable-login'];
  return canSetPropertyAccess(actor, member) ? ['property-access', ...login] : login;
}

/**
 * Whether `actor` may change `member`'s property limits. Staff follow the
 * role change: owners are never limited, and only the owner changes an admin.
 * Attendants answer to whoever manages them. Either way the actor must cover
 * the member's current access, so nobody drops properties they can't see.
 */
function canSetPropertyAccess(actor: MemberActor, member: Member): boolean {
  if (member.audience === 'tenant') return false;
  if (member.audience === 'staff') {
    if (!actor.can('members:update') || member.userId === actor.userId || member.role === OWNER) return false;
    if (member.role === ADMIN && actor.role !== OWNER) return false;
  } else if (!actor.can('parking_attendants:manage')) {
    return false;
  }
  return coversProperties(actor.propertyAccess, member.propertyAccess.propertyIds);
}

/**
 * Roles the role change accepts for `member`: assignable staff roles other
 * than theirs, and none with a code the actor lacks (the API refuses a role
 * above your own).
 */
export function assignableRoles(roles: readonly Role[], member: Member, actor: MemberActor): Role[] {
  return roles.filter(
    (role) =>
      role.isAssignable &&
      role.audience === 'staff' &&
      role.id !== member.role &&
      role.permissions.every((code) => actor.can(code as Permission)),
  );
}

/**
 * What a member's property access reads as: "All properties", or "N
 * properties" with their names for a tooltip. A tenant's access is their own
 * lease, so no label.
 */
export function propertyAccessLabel(member: Member): PropertyAccessSummary | null {
  return member.audience === 'tenant' ? null : propertyAccessSummary(member.propertyAccess);
}

export interface LastActiveLabel {
  /** "Just now", "12 min ago", "3 hours ago", "Yesterday", "4 days ago", "Oct 3", or "Never". */
  label: string;
  /** The exact time, for the tooltip. Null when they never signed in. */
  exact: string | null;
}

/** How long ago someone was last active, relative to `now`. */
export function lastActiveLabel(lastActiveAt: string | null, now: Date): LastActiveLabel {
  if (!lastActiveAt) return { label: 'Never', exact: null };

  const at = new Date(lastActiveAt);
  const exact = format(at, 'MMM d, yyyy, h:mm a');
  const minutes = differenceInMinutes(now, at);
  if (minutes < 1) return { label: 'Just now', exact };
  if (minutes < 60) return { label: `${minutes} min ago`, exact };

  const hours = differenceInHours(now, at);
  if (hours < 24) return { label: `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`, exact };

  const days = differenceInCalendarDays(now, at);
  if (days <= 1) return { label: 'Yesterday', exact };
  if (days < 7) return { label: `${days} days ago`, exact };
  return { label: format(at, at.getFullYear() === now.getFullYear() ? 'MMM d' : 'MMM d, yyyy'), exact };
}

export function memberStatusBadge(member: Member): { label: string; tone: BadgeTone } {
  if (member.status === 'ACTIVE') return { label: 'Active', tone: 'success' };
  return { label: member.audience === 'staff' ? 'Deactivated' : 'Login off', tone: 'neutral' };
}

export interface ExpiryLabel {
  label: string;
  tone: BadgeTone;
  isExpired: boolean;
}

/** "Expires in 3 days", "Expires today", "Expired 2 days ago". */
export function invitationExpiry(invitation: Pick<Invitation, 'expiresAt' | 'status'>, now: Date): ExpiryLabel {
  const expiresAt = new Date(invitation.expiresAt);
  const isExpired = invitation.status === 'EXPIRED' || expiresAt.getTime() <= now.getTime();
  const days = differenceInCalendarDays(expiresAt, now);

  if (isExpired) {
    const ago = Math.max(-days, 0);
    const label = ago === 0 ? 'Expired today' : `Expired ${ago} day${ago === 1 ? '' : 's'} ago`;
    return { label, tone: 'destructive', isExpired: true };
  }
  if (days <= 0) return { label: 'Expires today', tone: 'warning', isExpired: false };
  return {
    label: `Expires in ${days} day${days === 1 ? '' : 's'}`,
    tone: days <= 1 ? 'warning' : 'neutral',
    isExpired: false,
  };
}

/** Up to two initials for an avatar: "Ana Cruz" is "AC". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase() || '·';
}
