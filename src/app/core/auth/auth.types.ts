import type { PropertyAccess } from '../models/property-access.types';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface FeatureFlags {
  sms: boolean;
}

export type Audience = 'staff' | 'tenant' | 'parking';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  /** A role id: a system role's name, or a custom role's UUID. */
  organizationRole?: string | null;
  /** What to show for the role: 'Member', or the custom role's name. */
  organizationRoleName?: string | null;
  audience?: Audience;
  /** Codes held in the active organization; empty for app-only accounts and the super admin. */
  permissions?: readonly string[];
  /** The properties they work with in the active organization. */
  propertyAccess?: PropertyAccess;
  features?: FeatureFlags;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt?: string;
}

export interface SignInResponse {
  token?: string;
  user?: { id: string; name: string; email: string };
}

export interface GoogleSignInOptions {
  /** Where the browser lands once Google signs the person in. */
  callbackURL: string;
  /** Where a refusal lands, with `error` (the reason, spaces as underscores) in the query. */
  errorCallbackURL: string;
  /** The `token` from an invitation link: accepting it is part of the sign-in. */
  invitationToken?: string;
}

export interface SocialSignInResponse {
  url?: string;
  redirect?: boolean;
}

export interface SessionResponse {
  session?: { activeOrganizationId?: string | null } | null;
}
