import {
  ONE_TIME_PASSWORD_WARNING,
  portalAccessBadge,
  visibleOneTimePassword,
} from './portal-access.util';

describe('portalAccessBadge', () => {
  it('covers every Residence Care access state', () => {
    expect(portalAccessBadge('INACTIVE')).toEqual({ label: 'Inactive', tone: 'neutral' });
    expect(portalAccessBadge('ACTIVE')).toEqual({ label: 'Active', tone: 'success' });
    expect(portalAccessBadge('DISABLED')).toEqual({ label: 'Disabled', tone: 'destructive' });
    expect(portalAccessBadge('MUST_CHANGE_PASSWORD')).toEqual({
      label: 'Must change password',
      tone: 'warning',
    });
  });
});

describe('visibleOneTimePassword', () => {
  it('shows the password only when the activate or reset response includes it', () => {
    expect(visibleOneTimePassword('Temp-once')).toBe('Temp-once');
    expect(visibleOneTimePassword(undefined)).toBeNull();
    expect(visibleOneTimePassword('')).toBeNull();
    expect(ONE_TIME_PASSWORD_WARNING).toMatch(/will not be shown again/i);
  });
});
