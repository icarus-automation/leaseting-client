import type { Audience } from '../auth/auth.types';

export type MemberStatus = 'ACTIVE' | 'DEACTIVATED';

/** The `audience` filter on `GET /members`. Staff includes custom role holders. */
export type MemberAudienceFilter = 'staff' | 'tenants' | 'attendants';

export interface Member {
  /** Membership id: the one the member routes take. */
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  /** A role id: a system role's name, or a custom role's UUID. */
  role: string;
  /** 'Admin', or the custom role's name. Null only if the role no longer exists. */
  roleName: string | null;
  audience: Audience;
  /**
   * Staff: deactivated in this organization. Tenants and parking attendants:
   * their Residence Care or terminal login is off on their own page.
   */
  status: MemberStatus;
  deactivatedAt: string | null;
  joinedAt: string;
}

export interface MemberListFilters {
  q?: string;
  role?: string;
  status?: MemberStatus;
  audience?: MemberAudienceFilter;
  page?: number;
  limit?: number;
}

export interface OwnershipTransfer {
  previousOwner: Member;
  newOwner: Member;
}
