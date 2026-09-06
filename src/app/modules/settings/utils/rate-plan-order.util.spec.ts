import { billedHint, sortRatePlans } from './rate-plan-order.util';
import type { ParkingBillingBasis } from '../../../core/models/enums';

const plan = (
  name: string,
  billingBasis: ParkingBillingBasis,
  increment: number,
  isArchived = false,
) => ({ name, billingBasis, increment, isArchived });

describe('sortRatePlans', () => {
  it('orders live plans by slice length, then name', () => {
    const sorted = sortRatePlans([
      plan('Weekend', 'PER_DAY', 7),
      plan('Daily', 'PER_DAY', 1),
      plan('Overnight', 'PER_HOUR', 8),
      plan('Hourly', 'PER_HOUR', 1),
      plan('Monthly', 'PER_DAY', 30),
    ]);

    expect(sorted.map((row) => row.name)).toEqual([
      'Hourly',
      'Overnight',
      'Daily',
      'Weekend',
      'Monthly',
    ]);
  });

  it('pins archived plans after live ones', () => {
    const sorted = sortRatePlans([
      plan('Daily', 'PER_DAY', 1, true),
      plan('Hourly', 'PER_HOUR', 1),
    ]);

    expect(sorted.map((row) => row.name)).toEqual(['Hourly', 'Daily']);
  });
});

describe('billedHint', () => {
  it('uses per-unit wording for a single increment', () => {
    expect(billedHint('PER_HOUR', 1)).toBe('Billed per hour');
  });

  it('uses every-N wording for multi-unit increments', () => {
    expect(billedHint('PER_DAY', 7)).toBe('Billed every 7 days');
  });
});
