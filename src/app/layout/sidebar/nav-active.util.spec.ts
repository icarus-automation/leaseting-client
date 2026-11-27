import { navLinkIsActive } from './nav-active.util';

describe('navLinkIsActive', () => {
  it('keeps Bills active on the list, a bill, and the utility run', () => {
    expect(navLinkIsActive('/bills', '/bills')).toBe(true);
    expect(navLinkIsActive('/bills?status=UNPAID', '/bills')).toBe(true);
    expect(navLinkIsActive('/bills/abc-123', '/bills')).toBe(true);
    expect(navLinkIsActive('/bills/utility-run', '/bills')).toBe(true);
  });

  it('leaves Bills unlit on Statements and Payment submissions, which have their own links', () => {
    expect(navLinkIsActive('/bills/soa', '/bills')).toBe(false);
    expect(navLinkIsActive('/bills/submissions', '/bills')).toBe(false);
  });

  it('activates Statements only on its own page', () => {
    expect(navLinkIsActive('/bills/soa', '/bills/soa')).toBe(true);
    expect(navLinkIsActive('/bills/soa?leaseId=1', '/bills/soa')).toBe(true);
    expect(navLinkIsActive('/bills', '/bills/soa')).toBe(false);
    expect(navLinkIsActive('/bills/utility-run', '/bills/soa')).toBe(false);
    expect(navLinkIsActive('/bills/submissions', '/bills/soa')).toBe(false);
  });

  it('activates Submissions only on that queue', () => {
    expect(navLinkIsActive('/bills/submissions', '/bills/submissions')).toBe(true);
    expect(navLinkIsActive('/bills', '/bills/submissions')).toBe(false);
    expect(navLinkIsActive('/bills/utility-run', '/bills/submissions')).toBe(false);
  });

  it('still prefix-matches Settings and other sections', () => {
    expect(navLinkIsActive('/settings/payment-destinations', '/settings')).toBe(true);
    expect(navLinkIsActive('/residents/abc', '/residents')).toBe(true);
    expect(navLinkIsActive('/billsx', '/bills')).toBe(false);
  });
});
