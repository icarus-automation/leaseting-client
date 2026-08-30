import type { SessionUser } from './auth.types';

export const TENANT_WEB_LOGIN_MESSAGE = 'Use the Residence Care mobile app.';

export function isTenantAudience(
  user: Pick<SessionUser, 'audience' | 'organizationRole'>,
): boolean {
  return user.audience === 'tenant' || user.organizationRole === 'tenant';
}
