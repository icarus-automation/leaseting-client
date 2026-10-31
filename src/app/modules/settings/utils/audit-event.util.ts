import type { AuditAction, AuditEvent } from '../../../core/models/audit-event.types';
import { systemRoleLabel } from './member-access.util';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INVITATION_CREATED: 'Invitation sent',
  INVITATION_RESENT: 'Invitation resent',
  INVITATION_REVOKED: 'Invitation revoked',
  INVITATION_ACCEPTED: 'Invitation accepted',
  MEMBER_ROLE_CHANGED: 'Role changed',
  MEMBER_DEACTIVATED: 'Deactivated',
  MEMBER_REACTIVATED: 'Reactivated',
  OWNERSHIP_TRANSFERRED: 'Ownership transferred',
  GOOGLE_ACCOUNT_LINKED: 'Google account linked',
  ROLE_CREATED: 'Role created',
  ROLE_UPDATED: 'Role edited',
  ROLE_DUPLICATED: 'Role duplicated',
  ROLE_ACTIVATED: 'Role turned on',
  ROLE_DEACTIVATED: 'Role turned off',
  ROLE_DELETED: 'Role deleted',
  MEMBER_PROPERTY_ACCESS_CHANGED: 'Property access changed',
};

/** The action filter's options, grouped the way the log reads. */
export const AUDIT_ACTION_GROUPS: { label: string; actions: AuditAction[] }[] = [
  {
    label: 'Invitations',
    actions: ['INVITATION_CREATED', 'INVITATION_RESENT', 'INVITATION_REVOKED', 'INVITATION_ACCEPTED'],
  },
  {
    label: 'People',
    actions: [
      'MEMBER_ROLE_CHANGED',
      'MEMBER_DEACTIVATED',
      'MEMBER_REACTIVATED',
      'OWNERSHIP_TRANSFERRED',
      'GOOGLE_ACCOUNT_LINKED',
      'MEMBER_PROPERTY_ACCESS_CHANGED',
    ],
  },
  {
    label: 'Roles',
    actions: ['ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DUPLICATED', 'ROLE_ACTIVATED', 'ROLE_DEACTIVATED', 'ROLE_DELETED'],
  },
];

export function auditActionLabel(action: string): string {
  if (Object.hasOwn(AUDIT_ACTION_LABELS, action)) return AUDIT_ACTION_LABELS[action as AuditAction];
  const words = action.toLowerCase().split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A member target's label is "Name <email>"; the sentence only needs the name. */
export function targetName(label: string | null): string {
  if (!label) return 'someone';
  return label.replace(/\s*<[^>]*>\s*$/, '').trim() || label;
}

function text(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function roleLabel(role: string | null): string {
  if (!role) return 'a role';
  return systemRoleLabel(role) ?? 'a custom role';
}

/** The role an event names, by the name it had then when the event kept one. */
function eventRole(record: Record<string, unknown> | null): string {
  return text(record, 'roleName') ?? roleLabel(text(record, 'role'));
}

/** `{ propertyIds, propertyNames }` as a phrase: null for every property. */
function propertiesPhrase(record: Record<string, unknown> | null): string | null {
  const ids = Array.isArray(record?.['propertyIds']) ? (record['propertyIds'] as unknown[]) : [];
  if (ids.length === 0) return null;
  const names = Array.isArray(record?.['propertyNames']) ? (record['propertyNames'] as unknown[]) : [];
  const known = names.filter((name): name is string => typeof name === 'string' && name.length > 0);
  if (known.length === ids.length) return known.join(', ');
  return `${ids.length} ${ids.length === 1 ? 'property' : 'properties'}`;
}

const ROLE_FIELD_LABELS: Record<string, string> = {
  name: 'name',
  description: 'description',
  permissions: 'permissions',
};

/** What changed, as one plain sentence about the target. */
export function describeAuditEvent(event: AuditEvent): string {
  const target = targetName(event.target.label);
  const { before, after } = event;

  switch (event.action as AuditAction) {
    case 'INVITATION_CREATED': {
      const limitedTo = propertiesPhrase(after);
      return `Invited ${target} as ${eventRole(after)}${limitedTo ? `, limited to ${limitedTo}` : ''}`;
    }
    case 'INVITATION_RESENT':
      return `Resent the invitation to ${target}`;
    case 'INVITATION_REVOKED':
      return `Revoked the invitation to ${target}`;
    case 'INVITATION_ACCEPTED':
      return `Joined as ${eventRole(after)}`;
    case 'MEMBER_ROLE_CHANGED': {
      const from = text(before, 'roleName') ?? roleLabel(text(before, 'role'));
      const to = text(after, 'roleName') ?? roleLabel(text(after, 'role'));
      return `Changed ${target}'s role from ${from} to ${to}`;
    }
    case 'MEMBER_DEACTIVATED':
      return `Deactivated ${target}`;
    case 'MEMBER_REACTIVATED':
      return `Reactivated ${target}`;
    case 'OWNERSHIP_TRANSFERRED':
      return `Made ${target} the owner`;
    case 'GOOGLE_ACCOUNT_LINKED':
      return 'Linked a Google account';
    case 'ROLE_CREATED':
      return `Created the role ${target}`;
    case 'ROLE_UPDATED': {
      const fields = Object.keys(after ?? {})
        .map((key) => ROLE_FIELD_LABELS[key])
        .filter(Boolean);
      return fields.length > 0
        ? `Edited the role ${target}: ${fields.join(', ')}`
        : `Edited the role ${target}`;
    }
    case 'ROLE_DUPLICATED': {
      const source = text(after, 'sourceRoleName');
      return source ? `Copied ${source} as ${target}` : `Created ${target} as a copy`;
    }
    case 'ROLE_ACTIVATED':
      return `Turned on the role ${target}`;
    case 'ROLE_DEACTIVATED':
      return `Turned off the role ${target}`;
    case 'ROLE_DELETED':
      return `Deleted the role ${target}`;
    case 'MEMBER_PROPERTY_ACCESS_CHANGED': {
      const limitedTo = propertiesPhrase(after);
      return limitedTo ? `Limited ${target} to ${limitedTo}` : `Gave ${target} access to every property`;
    }
    default:
      return `${auditActionLabel(event.action)}: ${target}`;
  }
}
