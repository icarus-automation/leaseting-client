import { apiErrorMessage } from '../../../core/models/api.types';
import type { ResidentResponse } from '../../../core/models/resident.types';

/** Shown wherever a resident login is set up or its password is reset. */
export const RESIDENT_LOGIN_HELPER_TEXT =
  'Resident app login. Send the email and temporary password through Facebook, Viber, or another private channel.';

export const ONE_TIME_PASSWORD_WARNING =
  'It is shown only once. The tenant must change it the first time they sign in.';

export const RESIDENT_LOGIN_NOT_LINKED_MESSAGE =
  "We couldn't match this login to one tenant record. Open the tenant and check that their email is the one they sign in with.";

/** Raised when a resident login can't be tied to a single resident record. */
export class ResidentLoginLookupError extends Error {
  constructor(message = RESIDENT_LOGIN_NOT_LINKED_MESSAGE) {
    super(message);
    this.name = 'ResidentLoginLookupError';
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
 * Ids of the residents whose profile email is `email`. The API links a resident
 * login to its resident only through that email (setting up the login copies it
 * onto the resident), so this is how a login finds its resident record.
 */
export function residentIdsWithEmail(residents: readonly Pick<ResidentResponse, 'id' | 'email'>[], email: string): string[] {
  return [...new Set(residents.filter((resident) => sameEmail(resident.email, email)).map((resident) => resident.id))];
}

export function residentFullName(resident: Pick<ResidentResponse, 'firstName' | 'lastName'>): string {
  return `${resident.firstName} ${resident.lastName}`.trim();
}

/** The reason to show for a failed resident login call: ours, else the API's. */
export function residentLoginErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ResidentLoginLookupError ? error.message : apiErrorMessage(error, fallback);
}
