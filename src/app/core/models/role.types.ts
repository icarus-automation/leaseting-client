import type { Audience } from '../auth/auth.types';

export type RoleKind = 'system' | 'custom';

export interface Role {
  /** 'owner' | 'admin' | 'member' | 'resident' | 'parking_attendant', or a custom role's UUID. */
  id: string;
  name: string;
  description: string | null;
  kind: RoleKind;
  /** True for every system role: no edit, no toggle, no delete. */
  isLocked: boolean;
  isActive: boolean;
  /** The member role change accepts it right now. */
  isAssignable: boolean;
  audience: Audience;
  /** Catalog codes, in catalog order. */
  permissions: string[];
  /** Everyone here who holds it, deactivated people included. */
  memberCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}
