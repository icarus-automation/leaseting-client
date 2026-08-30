/** Payload sent to the email/password sign-in endpoint. */
export interface SignInCredentials {
  email: string;
  password: string;
}

/** Optional integrations the backend has configured — gates UI affordances. */
export interface FeatureFlags {
  /** Semaphore SMS gateway (SOA summary texts). */
  sms: boolean;
}

/** Session user as returned by `GET /users/me` (Better Auth user row). */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  organizationRole?: string | null;
  audience?: 'staff' | 'tenant';
  features?: FeatureFlags;
}

export const TENANT_USE_MOBILE = 'TENANT_USE_MOBILE';

/** Organization from the Better Auth organization plugin. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt?: string;
}

/** Raw Better Auth sign-in response (not enveloped). Cookie carries the session. */
export interface SignInResponse {
  token?: string;
  user?: { id: string; name: string; email: string };
}
