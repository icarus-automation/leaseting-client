export type AuditArea =
  | 'team'
  | 'parking'
  | 'tenants'
  | 'documents'
  | 'leases'
  | 'onboarding'
  | 'bills'
  | 'payments'
  | 'properties'
  | 'units'
  | 'settings';

export type AuditAction =
  | 'INVITATION_CREATED'
  | 'INVITATION_RESENT'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ACCEPTED'
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_DEACTIVATED'
  | 'MEMBER_REACTIVATED'
  | 'OWNERSHIP_TRANSFERRED'
  | 'GOOGLE_ACCOUNT_LINKED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DUPLICATED'
  | 'ROLE_ACTIVATED'
  | 'ROLE_DEACTIVATED'
  | 'ROLE_DELETED'
  | 'MEMBER_PROPERTY_ACCESS_CHANGED'
  | 'PARKING_PASS_PLATE_CHANGED'
  | 'PARKING_PASS_ENDED'
  | 'PARKING_PASS_REFUNDED'
  | 'RESIDENT_CREATED'
  | 'RESIDENT_EDITED'
  | 'RESIDENT_ARCHIVED'
  | 'RESIDENT_ACCESS_CHANGED'
  | 'RESIDENT_DOCUMENT_UPLOADED'
  | 'RESIDENT_DOCUMENT_VIEWED'
  | 'RESIDENT_DOCUMENT_DOWNLOADED'
  | 'RESIDENT_DOCUMENT_DELETED'
  | 'LEASE_CREATED'
  | 'LEASE_EDITED'
  | 'LEASE_TERMINATED'
  | 'ONBOARDING_COMPLETED'
  | 'ONBOARDING_CANCELLED'
  | 'BILL_CREATED'
  | 'BILL_EDITED'
  | 'BILL_DELETED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_VOIDED'
  | 'PAYMENT_SUBMISSION_APPROVED'
  | 'PAYMENT_SUBMISSION_REJECTED'
  | 'PROPERTY_CREATED'
  | 'PROPERTY_EDITED'
  | 'PROPERTY_ARCHIVED'
  | 'UNIT_CREATED'
  | 'UNIT_EDITED'
  | 'UNIT_ARCHIVED'
  | 'ORGANIZATION_UPDATED'
  | 'PAYMENT_DESTINATION_CREATED'
  | 'PAYMENT_DESTINATION_EDITED'
  | 'CHARGE_ITEM_CREATED'
  | 'CHARGE_ITEM_EDITED'
  | 'CHARGE_ITEM_ARCHIVED'
  | 'RATE_PLAN_CREATED'
  | 'RATE_PLAN_EDITED'
  | 'RATE_PLAN_ARCHIVED'
  | 'LATE_FEE_RULE_UPDATED'
  | 'PROPERTY_TYPE_CREATED'
  | 'PROPERTY_TYPE_EDITED'
  | 'PROPERTY_TYPE_ARCHIVED'
  | 'RESIDENT_RESTORED'
  | 'PRIVACY_NOTICE_PUBLISHED'
  | 'PRIVACY_CONSENT_RECORDED';

export type AuditTargetType =
  | 'MEMBER'
  | 'INVITATION'
  | 'ROLE'
  | 'PARKING_PASS'
  | 'PARKING_PASS_PAYMENT'
  | 'RESIDENT'
  | 'RESIDENT_DOCUMENT'
  | 'LEASE'
  | 'ONBOARDING'
  | 'BILL'
  | 'PAYMENT'
  | 'PAYMENT_SUBMISSION'
  | 'PROPERTY'
  | 'UNIT'
  | 'ORGANIZATION'
  | 'PAYMENT_DESTINATION'
  | 'CHARGE_ITEM'
  | 'RATE_PLAN'
  | 'LATE_FEE_RULE'
  | 'PROPERTY_TYPE'
  | 'PRIVACY_NOTICE'
  | 'PRIVACY_CONSENT';

export interface AuditEvent {
  id: string;
  /** One of AuditAction; a newer API may send one this client does not know yet. */
  action: string;
  area: AuditArea;
  /** As they were at the time. */
  actor: { id: string | null; name: string | null; email: string | null };
  /** ROLE: the role id and its name. */
  target: { type: AuditTargetType; id: string; label: string | null };
  /** The property the target belongs to. Null for team and organization-wide rows. */
  propertyId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditEventFilters {
  area?: AuditArea;
  action?: AuditAction;
  actorId?: string;
  propertyId?: string;
  /** YYYY-MM-DD, inclusive Philippine days. */
  from?: string;
  to?: string;
  /** Case-insensitive match on the target's name. */
  q?: string;
  page?: number;
  limit?: number;
}
