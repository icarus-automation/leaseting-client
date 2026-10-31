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
  | 'ROLE_DELETED';

export type AuditTargetType = 'MEMBER' | 'INVITATION' | 'ROLE';

export interface AuditEvent {
  id: string;
  /** One of AuditAction; a newer API may send one this client does not know yet. */
  action: string;
  /** As they were at the time. */
  actor: { id: string | null; name: string | null; email: string | null };
  /** ROLE: the role id and its name. */
  target: { type: AuditTargetType; id: string; label: string | null };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditEventFilters {
  actorId?: string;
  action?: AuditAction;
  /** YYYY-MM-DD, inclusive Philippine days. */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
