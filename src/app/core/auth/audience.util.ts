import type { Audience, SessionUser } from './auth.types';

const DEDICATED_APP_MESSAGE: Record<Exclude<Audience, 'staff'>, string> = {
  tenant: 'Use the Residence Care mobile app.',
  parking: 'Use the Leaseting Parking Terminal.',
};

const ROLE_AUDIENCE: Record<string, Audience> = {
  tenant: 'tenant',
  parking_attendant: 'parking',
};

type AudienceProbe = Pick<SessionUser, 'audience' | 'organizationRole'>;

export class WrongAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WrongAppError';
  }
}

export function audienceOf(user: AudienceProbe): Audience {
  const fromRole = user.organizationRole ? ROLE_AUDIENCE[user.organizationRole] : undefined;
  return fromRole ?? user.audience ?? 'staff';
}

export function dedicatedAppRejection(user: AudienceProbe): string | null {
  const audience = audienceOf(user);
  return audience === 'staff' ? null : DEDICATED_APP_MESSAGE[audience];
}
