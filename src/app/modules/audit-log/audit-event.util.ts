import type { AuditAction, AuditArea, AuditEvent } from '../../core/models/audit-event.types';
import { formatPhp } from '../../shared/pipes/php-currency-pipe';
import { systemRoleLabel } from '../settings/utils/member-access.util';

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
  PARKING_PASS_PLATE_CHANGED: 'Pass plate changed',
  PARKING_PASS_ENDED: 'Pass ended',
  PARKING_PASS_REFUNDED: 'Pass payment refunded',
  RESIDENT_CREATED: 'Tenant created',
  RESIDENT_EDITED: 'Tenant edited',
  RESIDENT_ARCHIVED: 'Tenant archived',
  RESIDENT_RESTORED: 'Tenant restored',
  RESIDENT_ACCESS_CHANGED: 'Residence Care access changed',
  RESIDENT_APP_ACCOUNT_DELETED: 'App account deleted',
  RESIDENT_DOCUMENT_UPLOADED: 'Document uploaded',
  RESIDENT_DOCUMENT_VIEWED: 'Document viewed',
  RESIDENT_DOCUMENT_DOWNLOADED: 'Document downloaded',
  RESIDENT_DOCUMENT_DELETED: 'Document deleted',
  LEASE_CREATED: 'Lease created',
  LEASE_EDITED: 'Lease edited',
  LEASE_TERMINATED: 'Lease ended',
  ONBOARDING_COMPLETED: 'Onboarding completed',
  ONBOARDING_CANCELLED: 'Onboarding cancelled',
  BILL_CREATED: 'Bill created',
  BILL_EDITED: 'Bill edited',
  BILL_DELETED: 'Bill deleted',
  PAYMENT_RECORDED: 'Payment recorded',
  PAYMENT_VOIDED: 'Payment voided',
  PAYMENT_SUBMISSION_APPROVED: 'Payment submission approved',
  PAYMENT_SUBMISSION_REJECTED: 'Payment submission rejected',
  PROPERTY_CREATED: 'Property created',
  PROPERTY_EDITED: 'Property edited',
  PROPERTY_ARCHIVED: 'Property archived',
  UNIT_CREATED: 'Unit created',
  UNIT_EDITED: 'Unit edited',
  UNIT_ARCHIVED: 'Unit archived',
  ORGANIZATION_UPDATED: 'Organization updated',
  PAYMENT_DESTINATION_CREATED: 'Payment destination created',
  PAYMENT_DESTINATION_EDITED: 'Payment destination edited',
  CHARGE_ITEM_CREATED: 'Charge item created',
  CHARGE_ITEM_EDITED: 'Charge item edited',
  CHARGE_ITEM_ARCHIVED: 'Charge item archived',
  RATE_PLAN_CREATED: 'Rate plan created',
  RATE_PLAN_EDITED: 'Rate plan edited',
  RATE_PLAN_ARCHIVED: 'Rate plan archived',
  LATE_FEE_RULE_UPDATED: 'Late fee rule updated',
  PROPERTY_TYPE_CREATED: 'Property type created',
  PROPERTY_TYPE_EDITED: 'Property type edited',
  PROPERTY_TYPE_ARCHIVED: 'Property type archived',
  PRIVACY_NOTICE_PUBLISHED: 'Privacy notice published',
  PRIVACY_CONSENT_RECORDED: 'Privacy consent recorded',
};

export const AUDIT_AREAS: readonly AuditArea[] = [
  'team',
  'parking',
  'tenants',
  'documents',
  'leases',
  'onboarding',
  'bills',
  'payments',
  'properties',
  'units',
  'settings',
];

export const AUDIT_AREA_LABELS: Record<AuditArea, string> = {
  team: 'Team',
  parking: 'Parking',
  tenants: 'Tenants',
  documents: 'Documents',
  leases: 'Leases',
  onboarding: 'Onboarding',
  bills: 'Bills',
  payments: 'Payments',
  properties: 'Properties',
  units: 'Units',
  settings: 'Settings',
};

/** Actions the filter offers for one area, in the order the log groups them. */
export const AUDIT_AREA_ACTIONS: Record<AuditArea, readonly AuditAction[]> = {
  team: [
    'INVITATION_CREATED',
    'INVITATION_RESENT',
    'INVITATION_REVOKED',
    'INVITATION_ACCEPTED',
    'MEMBER_ROLE_CHANGED',
    'MEMBER_DEACTIVATED',
    'MEMBER_REACTIVATED',
    'OWNERSHIP_TRANSFERRED',
    'GOOGLE_ACCOUNT_LINKED',
    'MEMBER_PROPERTY_ACCESS_CHANGED',
    'ROLE_CREATED',
    'ROLE_UPDATED',
    'ROLE_DUPLICATED',
    'ROLE_ACTIVATED',
    'ROLE_DEACTIVATED',
    'ROLE_DELETED',
  ],
  parking: ['PARKING_PASS_PLATE_CHANGED', 'PARKING_PASS_ENDED', 'PARKING_PASS_REFUNDED'],
  tenants: [
    'RESIDENT_CREATED',
    'RESIDENT_EDITED',
    'RESIDENT_ARCHIVED',
    'RESIDENT_RESTORED',
    'RESIDENT_ACCESS_CHANGED',
    'RESIDENT_APP_ACCOUNT_DELETED',
    'PRIVACY_CONSENT_RECORDED',
  ],
  documents: [
    'RESIDENT_DOCUMENT_UPLOADED',
    'RESIDENT_DOCUMENT_VIEWED',
    'RESIDENT_DOCUMENT_DOWNLOADED',
    'RESIDENT_DOCUMENT_DELETED',
  ],
  leases: ['LEASE_CREATED', 'LEASE_EDITED', 'LEASE_TERMINATED'],
  onboarding: ['ONBOARDING_COMPLETED', 'ONBOARDING_CANCELLED'],
  bills: ['BILL_CREATED', 'BILL_EDITED', 'BILL_DELETED'],
  payments: [
    'PAYMENT_RECORDED',
    'PAYMENT_VOIDED',
    'PAYMENT_SUBMISSION_APPROVED',
    'PAYMENT_SUBMISSION_REJECTED',
  ],
  properties: ['PROPERTY_CREATED', 'PROPERTY_EDITED', 'PROPERTY_ARCHIVED'],
  units: ['UNIT_CREATED', 'UNIT_EDITED', 'UNIT_ARCHIVED'],
  settings: [
    'ORGANIZATION_UPDATED',
    'PAYMENT_DESTINATION_CREATED',
    'PAYMENT_DESTINATION_EDITED',
    'CHARGE_ITEM_CREATED',
    'CHARGE_ITEM_EDITED',
    'CHARGE_ITEM_ARCHIVED',
    'RATE_PLAN_CREATED',
    'RATE_PLAN_EDITED',
    'RATE_PLAN_ARCHIVED',
    'LATE_FEE_RULE_UPDATED',
    'PROPERTY_TYPE_CREATED',
    'PROPERTY_TYPE_EDITED',
    'PROPERTY_TYPE_ARCHIVED',
    'PRIVACY_NOTICE_PUBLISHED',
  ],
};

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
    case 'PARKING_PASS_PLATE_CHANGED': {
      const from = text(before, 'plateDisplay') ?? 'the old plate';
      const to = text(after, 'plateDisplay') ?? target;
      return `Changed the plate from ${from} to ${to}`;
    }
    case 'PARKING_PASS_ENDED': {
      const reason = text(after, 'endReason');
      return reason ? `Ended the pass for ${target}. ${reason}` : `Ended the pass for ${target}`;
    }
    case 'PARKING_PASS_REFUNDED': {
      const amount = text(after, 'amount');
      const reason = text(after, 'reason');
      const money = amount ? formatPhp(amount) : 'a payment';
      return reason ? `Refunded ${money} on ${target}. ${reason}` : `Refunded ${money} on ${target}`;
    }
    case 'RESIDENT_RESTORED':
      return `Restored ${target}`;
    case 'RESIDENT_APP_ACCOUNT_DELETED':
      return `${target} deleted their Residence Care account`;
    case 'PRIVACY_NOTICE_PUBLISHED': {
      const version = after?.['version'];
      return typeof version === 'number' ? `Published privacy notice v${version}` : 'Published the privacy notice';
    }
    case 'PRIVACY_CONSENT_RECORDED': {
      const version = after?.['noticeVersion'];
      const notice = typeof version === 'number' ? `privacy notice v${version}` : 'the privacy notice';
      return text(after, 'source') === 'Residence Care'
        ? `${target} agreed to ${notice} in Residence Care`
        : `Recorded ${target}'s signed consent to ${notice}`;
    }
    default:
      return `${auditActionLabel(event.action)}: ${target}`;
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  status: 'Status',
  label: 'Label',
  fileName: 'File name',
  amount: 'Amount',
  role: 'Role',
  roleName: 'Role name',
};

const UUID_VALUE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AuditFieldChange =
  | { key: string; label: string; kind: 'added'; value: string }
  | { key: string; label: string; kind: 'removed'; value: string }
  | { key: string; label: string; kind: 'changed'; before: string; after: string };

function fieldLabel(key: string): string {
  const known = FIELD_LABELS[key];
  if (known) return known;
  const words = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isUuid(value: string): boolean {
  return UUID_VALUE.test(value);
}

/** A person-readable value, or null when it is a UUID or a nested object. */
function displayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return isUuid(value) ? null : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === 'string' && !isUuid(item) && item.length > 0);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
}

/**
 * What a person can read in before against after. Keys ending in Id or Ids,
 * and raw UUID values, stay out. A key only on one side is added or removed.
 */
export function auditFieldChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditFieldChange[] {
  const left = before ?? {};
  const right = after ?? {};
  const changes: AuditFieldChange[] = [];
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    if (key.endsWith('Id') || key.endsWith('Ids')) continue;
    const inBefore = Object.prototype.hasOwnProperty.call(left, key);
    const inAfter = Object.prototype.hasOwnProperty.call(right, key);
    const from = inBefore ? displayValue(left[key]) : null;
    const to = inAfter ? displayValue(right[key]) : null;
    if (from === null && to === null) continue;
    const label = fieldLabel(key);
    if (inBefore && !inAfter && from !== null) {
      changes.push({ key, label, kind: 'removed', value: from });
      continue;
    }
    if (!inBefore && inAfter && to !== null) {
      changes.push({ key, label, kind: 'added', value: to });
      continue;
    }
    if (from === to) continue;
    if (from !== null && to !== null) changes.push({ key, label, kind: 'changed', before: from, after: to });
    else if (to !== null) changes.push({ key, label, kind: 'added', value: to });
    else if (from !== null) changes.push({ key, label, kind: 'removed', value: from });
  }
  return changes;
}
