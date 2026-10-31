import { HttpErrorResponse } from '@angular/common/http';

import {
  ONE_TIME_PASSWORD_WARNING,
  TENANT_LOGIN_HELPER_TEXT,
  TenantLoginLookupError,
  sameEmail,
  tenantFullName,
  tenantIdsWithEmail,
  tenantLoginErrorMessage,
  visibleOneTimePassword,
} from './tenant-login.util';

describe('TENANT_LOGIN_HELPER_TEXT', () => {
  it('is the exact line shown wherever a tenant login is set up or reset', () => {
    expect(TENANT_LOGIN_HELPER_TEXT).toBe(
      'Tenant app login. Send the email and temporary password through Facebook, Viber, or another private channel.',
    );
  });
});

describe('visibleOneTimePassword', () => {
  it('shows the password only when the activate or reset response includes it', () => {
    expect(visibleOneTimePassword('Temp-once')).toBe('Temp-once');
    expect(visibleOneTimePassword(undefined)).toBeNull();
    expect(visibleOneTimePassword('')).toBeNull();
    expect(ONE_TIME_PASSWORD_WARNING).toMatch(/only once/i);
  });
});

describe('sameEmail', () => {
  it('ignores case and edge spaces', () => {
    expect(sameEmail('Ana@Example.com ', ' ana@example.com')).toBe(true);
  });

  it('never matches a missing or blank email', () => {
    expect(sameEmail(null, null)).toBe(false);
    expect(sameEmail('', '')).toBe(false);
    expect(sameEmail('ana@example.com', null)).toBe(false);
  });
});

describe('tenantIdsWithEmail', () => {
  const tenants = [
    { id: 't-1', email: 'ana@example.com' },
    { id: 't-2', email: 'ben@example.com' },
    { id: 't-3', email: 'ANA@example.com' },
    { id: 't-4', email: null },
    { id: 't-1', email: 'ana@example.com' },
  ];

  it('lists each tenant whose email matches the login once', () => {
    expect(tenantIdsWithEmail(tenants, 'ana@example.com')).toEqual(['t-1', 't-3']);
  });

  it('finds nobody for an email no tenant carries', () => {
    expect(tenantIdsWithEmail(tenants, 'new@example.com')).toEqual([]);
  });
});

describe('tenantFullName', () => {
  it('joins first and last name', () => {
    expect(tenantFullName({ firstName: 'Ana', lastName: 'Cruz' })).toBe('Ana Cruz');
  });
});

describe('tenantLoginErrorMessage', () => {
  it('prefers our own lookup message', () => {
    expect(tenantLoginErrorMessage(new TenantLoginLookupError('No match.'), 'Fallback.')).toBe('No match.');
  });

  it("falls back to the API's reason, then the fallback", () => {
    const refused = new HttpErrorResponse({ status: 404, error: { statusCode: 404, message: 'Tenant not found' } });

    expect(tenantLoginErrorMessage(refused, 'Fallback.')).toBe('Tenant not found');
    expect(tenantLoginErrorMessage(new Error('boom'), 'Fallback.')).toBe('Fallback.');
  });
});
