import { navLinkIsActive } from './nav-active.util';

describe('navLinkIsActive', () => {
  it('keeps Bills active on nested bill pages except submissions', () => {
    expect(navLinkIsActive('/bills', '/bills')).toBe(true);
    expect(navLinkIsActive('/bills/soa', '/bills')).toBe(true);
    expect(navLinkIsActive('/bills/utility-run', '/bills')).toBe(true);
    expect(navLinkIsActive('/bills/submissions', '/bills')).toBe(false);
  });

  it('activates Submissions only on that queue', () => {
    expect(navLinkIsActive('/bills/submissions', '/bills/submissions')).toBe(true);
    expect(navLinkIsActive('/bills', '/bills/submissions')).toBe(false);
  });

  it('still prefix-matches Settings and other sections', () => {
    expect(navLinkIsActive('/settings/payment-destinations', '/settings')).toBe(true);
    expect(navLinkIsActive('/tenants/abc', '/tenants')).toBe(true);
  });
});
