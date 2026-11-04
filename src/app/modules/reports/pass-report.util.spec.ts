import { passStateBadge } from './pass-report.util';

describe('pass report display', () => {
  it('says how long ago a pass lapsed', () => {
    expect(passStateBadge({ state: 'lapsed', daysLeft: -1 })).toEqual({ tone: 'destructive', label: 'Lapsed yesterday' });
    expect(passStateBadge({ state: 'lapsed', daysLeft: -9 }).label).toBe('Lapsed 9 days ago');
  });

  it('counts down an expiring pass to its last covered day', () => {
    expect(passStateBadge({ state: 'expiring', daysLeft: 0 }).label).toBe('Ends today');
    expect(passStateBadge({ state: 'expiring', daysLeft: 1 }).label).toBe('Ends tomorrow');
    expect(passStateBadge({ state: 'expiring', daysLeft: 5 })).toEqual({ tone: 'warning', label: 'Ends in 5 days' });
  });

  it('marks a pass with time to spare as active', () => {
    expect(passStateBadge({ state: 'active', daysLeft: 30 })).toEqual({ tone: 'success', label: 'Active' });
  });
});
