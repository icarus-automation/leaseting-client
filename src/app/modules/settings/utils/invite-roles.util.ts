import type { Permission } from '../../../core/auth/permissions';
import type { Role } from '../../../core/models/role.types';

export interface InviteRoleChoice {
  value: string;
  label: string;
  description: string;
}

export interface InviteRoleGroup {
  label: string;
  items: InviteRoleChoice[];
}

/** Until `GET /roles` answers, or if it can't: the two system roles every inviter can offer. */
const FALLBACK_SYSTEM_ROLES: InviteRoleChoice[] = [
  {
    value: 'member',
    label: 'Member',
    description: 'Day-to-day work. Payments, app logins, the team, and the organization profile stay with owners and admins.',
  },
  { value: 'admin', label: 'Admin', description: 'Every permission.' },
];

/** Member first: it is the default, and the usual answer. */
const SYSTEM_ORDER = ['member', 'admin'];

function describe(role: Role): string {
  if (role.description) return role.description;
  const count = role.permissions.length;
  return count === 0 ? 'Grants nothing yet.' : `${count} ${count === 1 ? 'permission' : 'permissions'}.`;
}

/**
 * The roles an invitation can give, for the role dropdown: Member and Admin,
 * then the custom roles that are turned on. A role with a code the inviter
 * lacks is left out, because the API refuses a role above your own. Owner,
 * tenant and parking attendant are never invitable (`isAssignable` false).
 */
export function invitableRoleGroups(roles: readonly Role[], can: (code: Permission) => boolean): InviteRoleGroup[] {
  const offered = roles.filter(
    (role) =>
      role.isAssignable && role.audience === 'staff' && role.permissions.every((code) => can(code as Permission)),
  );
  const system = offered
    .filter((role) => role.kind === 'system')
    .sort((a, b) => SYSTEM_ORDER.indexOf(a.id) - SYSTEM_ORDER.indexOf(b.id))
    .map((role) => ({ value: role.id, label: role.name, description: describe(role) }));
  const custom = offered
    .filter((role) => role.kind === 'custom')
    .map((role) => ({ value: role.id, label: role.name, description: describe(role) }));

  return [
    { label: 'System roles', items: system.length > 0 ? system : FALLBACK_SYSTEM_ROLES },
    ...(custom.length > 0 ? [{ label: 'Custom roles', items: custom }] : []),
  ];
}
