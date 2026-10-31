import { apiErrorMessage } from '../../../core/models/api.types';
import type { TenantResponse } from '../../../core/models/tenant.types';

/** Shown wherever a tenant login is set up or its password is reset. */
export const TENANT_LOGIN_HELPER_TEXT =
  'Tenant app login. Send the email and temporary password through Facebook, Viber, or another private channel.';

export const ONE_TIME_PASSWORD_WARNING =
  'It is shown only once. The tenant must change it the first time they sign in.';

export const TENANT_LOGIN_NOT_LINKED_MESSAGE =
  "We couldn't match this login to one tenant record. Open the tenant and check that their email is the one they sign in with.";

/** Raised when a tenant login can't be tied to a single tenant record. */
export class TenantLoginLookupError extends Error {
  constructor(message = TENANT_LOGIN_NOT_LINKED_MESSAGE) {
    super(message);
    this.name = 'TenantLoginLookupError';
  }
}

export function visibleOneTimePassword(temporaryPassword: string | undefined | null): string | null {
  return temporaryPassword?.length ? temporaryPassword : null;
}

/** Emails compare without case or edge spaces; the API stores them normalized. */
export function sameEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = (a ?? '').trim().toLowerCase();
  return left.length > 0 && left === (b ?? '').trim().toLowerCase();
}

/**
 * Ids of the tenants whose profile email is `email`. The API links a tenant
 * login to its tenant only through that email (setting up the login copies it
 * onto the tenant), so this is how a login finds its tenant record.
 */
export function tenantIdsWithEmail(tenants: readonly Pick<TenantResponse, 'id' | 'email'>[], email: string): string[] {
  return [...new Set(tenants.filter((tenant) => sameEmail(tenant.email, email)).map((tenant) => tenant.id))];
}

export function tenantFullName(tenant: Pick<TenantResponse, 'firstName' | 'lastName'>): string {
  return `${tenant.firstName} ${tenant.lastName}`.trim();
}

/** The reason to show for a failed tenant login call: ours, else the API's. */
export function tenantLoginErrorMessage(error: unknown, fallback: string): string {
  return error instanceof TenantLoginLookupError ? error.message : apiErrorMessage(error, fallback);
}
