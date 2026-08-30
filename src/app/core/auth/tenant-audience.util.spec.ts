import { isTenantAudience, TENANT_WEB_LOGIN_MESSAGE } from './tenant-audience.util';

describe('isTenantAudience', () => {
  it('rejects tenant audience even when organizationRole is missing', () => {
    expect(isTenantAudience({ audience: 'tenant', organizationRole: null })).toBe(true);
  });

  it('rejects the tenant organization role', () => {
    expect(isTenantAudience({ audience: 'staff', organizationRole: 'tenant' })).toBe(true);
  });

  it('allows staff', () => {
    expect(isTenantAudience({ audience: 'staff', organizationRole: 'admin' })).toBe(false);
  });

  it('uses the Residence Care copy', () => {
    expect(TENANT_WEB_LOGIN_MESSAGE).toBe('Use the Residence Care mobile app.');
  });
});
