import type { Audience, SessionUser } from './auth.types';

/**
 * Where a session that is not staff has to sign in instead. Mirrors
 * AUDIENCE_REJECTION in leaseting-api (src/core/auth/organization-roles.ts).
 */
const DEDICATED_APP_MESSAGE: Record<Exclude<Audience, 'staff'>, string> = {
  tenant: 'Use the Residence Care mobile app.',
  parking: 'Use the Leaseting Parking Terminal.',
};

/** Roles that pin an audience, so an API response without `audience` still locks out. */
const ROLE_AUDIENCE: Record<string, Audience> = {
  tenant: 'tenant',
  parking_attendant: 'parking',
};

type AudienceProbe = Pick<SessionUser, 'audience' | 'organizationRole'>;

/** Sign-in was refused because the account belongs to a different Leaseting app. */
export class WrongAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WrongAppError';
  }
}

/** Which app a session belongs to. Anything unrecognised reads as staff. */
export function audienceOf(user: AudienceProbe): Audience {
  const fromRole = user.organizationRole ? ROLE_AUDIENCE[user.organizationRole] : undefined;
  return fromRole ?? user.audience ?? 'staff';
}

/**
 * The message to show for a session the web client must not keep, or null when
 * it is staff. Roles are checked alongside the audience so a single-purpose
 * account is refused even if the field is ever missing from the response.
 */
export function dedicatedAppRejection(user: AudienceProbe): string | null {
  const audience = audienceOf(user);
  return audience === 'staff' ? null : DEDICATED_APP_MESSAGE[audience];
}
