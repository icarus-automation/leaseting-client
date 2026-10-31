import type { PropertyAccess } from './property-access.types';

/** The system roles an invitation can give. It can also give an active custom role, by its id. */
export type InvitationRole = 'admin' | 'member';

export const INVITATION_ROLE_LABELS: Record<InvitationRole, string> = {
  admin: 'Admin',
  member: 'Member',
};

export function isInvitationRole(role: string | null | undefined): role is InvitationRole {
  return role === 'admin' || role === 'member';
}

/** `EXPIRED` is a pending invitation past `expiresAt`: resend or revoke it. */
export type InvitationStatus = 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'REVOKED' | 'DECLINED';

export interface Invitation {
  id: string;
  email: string;
  /** 'admin', 'member', or a custom role's UUID. */
  role: string;
  /** 'Member', or the custom role's name. Null if the custom role was deleted since. */
  roleName: string | null;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string } | null;
  /** What the new member is limited to once they accept. */
  propertyAccess: PropertyAccess;
}

export interface CreateInvitationPayload {
  email: string;
  /** 'admin', 'member', or an active custom role's id. */
  role: string;
  /** The properties the new member is limited to; leave out for every property. */
  propertyIds?: string[];
}

/** What the accept page shows before asking for a password. */
export interface InvitationPreview {
  organizationId: string;
  email: string;
  role: string;
  /** 'Member', or the custom role's name. */
  roleName: string | null;
  organizationName: string;
  expiresAt: string;
  /** True: ask for the existing account's password. False: a name and a new password. */
  hasAccount: boolean;
}

export interface AcceptInvitationPayload {
  token: string;
  /** Required when the email has no Leaseting account yet; ignored otherwise. */
  name?: string;
  password: string;
}

export interface AcceptedInvitation {
  organizationId: string;
  organizationName: string;
  email: string;
  role: string;
  roleName: string | null;
  isNewAccount: boolean;
}
