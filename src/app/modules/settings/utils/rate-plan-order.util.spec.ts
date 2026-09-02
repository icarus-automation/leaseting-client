import { sortRatePlans } from './rate-plan-order.util';
import type { ParkingBillingPeriod } from '../../../core/models/enums';

const plan = (name: string, billingPeriod: ParkingBillingPeriod, isArchived = false) => ({
  name,
  billingPeriod,
  isArchived,
});

describe('sortRatePlans', () => {
  it('orders live plans by stay length, then name', () => {
    const sorted = sortRatePlans([
      plan('Weekend', 'WEEKLY'),
      plan('Daily', 'DAILY'),
      plan('Overnight', 'HOURLY'),
      plan('Hourly', 'HOURLY'),
      plan('Monthly', 'MONTHLY'),
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
      plan('Daily', 'DAILY', true),
      plan('Hourly', 'HOURLY'),
    ]);

    expect(sorted.map((row) => row.name)).toEqual(['Hourly', 'Daily']);
  });
});
