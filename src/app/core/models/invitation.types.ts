/** Invitations add staff only. A custom role is given by a role change once they join. */
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
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: { id: string; name: string } | null;
}

export interface CreateInvitationPayload {
  email: string;
  role: InvitationRole;
}

/** What the accept page shows before asking for a password. */
export interface InvitationPreview {
  email: string;
  role: string;
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
  isNewAccount: boolean;
}
