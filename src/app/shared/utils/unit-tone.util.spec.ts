import { describe, expect, it } from 'vitest';

import { floorSummaryBadges, unitTone, unitToneLabel } from './unit-tone.util';

describe('owner billing unit tones', () => {
  it('renders a sold condo unit with overdue owner bills as destructive', () => {
    const unit = { status: 'SOLD' as const, hasOverdueBills: true };
    expect(unitTone(unit)).toBe('destructive');
    expect(unitToneLabel(unit)).toBe('Overdue');
  });

  it('keeps a sold condo unit without overdue bills green', () => {
    const unit = { status: 'SOLD' as const, hasOverdueBills: false };
    expect(unitTone(unit)).toBe('success');
    expect(unitToneLabel(unit)).toBe('Sold');
  });

  it('labels condo floor summary buckets for sold, overdue, and available units', () => {
    expect(floorSummaryBadges('CONDO', { total: 4, settled: 2, overdue: 1, vacant: 1 })).toEqual([
      { tone: 'success', label: 'Sold', count: 2 },
      { tone: 'destructive', label: 'Overdue', count: 1 },
      { tone: 'vacant', label: 'Available', count: 1 },
    ]);
  });
});
