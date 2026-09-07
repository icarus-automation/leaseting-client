import {
  clockToMinutes,
  formatParkingWindow,
  minutesToClock,
  openingBandHint,
  toRatePlanPayload,
} from './parking-clock.util';

describe('parking clock helpers', () => {
  it('round-trips overnight 18:00 and 06:00', () => {
    expect(clockToMinutes('18:00')).toBe(1080);
    expect(clockToMinutes('06:00')).toBe(360);
    expect(minutesToClock(1080)).toBe('18:00');
    expect(minutesToClock(360)).toBe('06:00');
    expect(formatParkingWindow(1080, 360)).toBe('18:00–06:00');
  });

  it('labels opening bands in the plan’s billed unit', () => {
    expect(openingBandHint(0, 'PER_HOUR', 1, 3)).toBe('First 3 hours');
    expect(openingBandHint(1, 'PER_HOUR', 1, 2)).toBe('Next 2 hours');
    expect(openingBandHint(0, 'PER_MINUTE', 15, 4)).toBe('First 4 × 15 minutes');
  });

  it('builds the mall and overnight payloads', () => {
    const car = 'car-id';
    const mall = toRatePlanPayload({
      name: 'Mall',
      billingBasis: 'PER_HOUR',
      increment: 1,
      amounts: { [car]: 10 },
      durationTiers: [{ incrementCount: 3, amounts: { [car]: 50 } }],
      windowEnabled: false,
      windowStart: '18:00',
      windowEnd: '06:00',
      overtimeAmounts: {},
    });
    expect(mall.ok).toBe(true);
    if (mall.ok) {
      expect(mall.payload.durationTiers[0]).toEqual({
        incrementCount: 3,
        amounts: [{ vehicleTypeId: car, amount: 50 }],
      });
      expect(mall.payload.windowStartMinute).toBeNull();
    }

    const overnight = toRatePlanPayload({
      name: 'Overnight',
      billingBasis: 'PER_HOUR',
      increment: 1,
      amounts: { [car]: 150 },
      durationTiers: [{ incrementCount: 12, amounts: { [car]: 150 } }],
      windowEnabled: true,
      windowStart: '18:00',
      windowEnd: '06:00',
      overtimeAmounts: { [car]: 20 },
    });
    expect(overnight.ok).toBe(true);
    if (overnight.ok) {
      expect(overnight.payload.windowStartMinute).toBe(1080);
      expect(overnight.payload.windowEndMinute).toBe(360);
      expect(overnight.payload.overtimeAmounts[0]?.amount).toBe(20);
    }
  });

  it('blocks save when succeeding, band, or overtime prices are all blank', () => {
    const car = 'car-id';
    expect(
      toRatePlanPayload({
        name: 'Hourly',
        billingBasis: 'PER_HOUR',
        increment: 1,
        amounts: { [car]: null },
        durationTiers: [],
        windowEnabled: false,
        windowStart: '18:00',
        windowEnd: '06:00',
        overtimeAmounts: {},
      }).ok,
    ).toBe(false);

    expect(
      toRatePlanPayload({
        name: 'Mall',
        billingBasis: 'PER_HOUR',
        increment: 1,
        amounts: { [car]: 10 },
        durationTiers: [{ incrementCount: 3, amounts: { [car]: null } }],
        windowEnabled: false,
        windowStart: '18:00',
        windowEnd: '06:00',
        overtimeAmounts: {},
      }).ok,
    ).toBe(false);

    expect(
      toRatePlanPayload({
        name: 'Overnight',
        billingBasis: 'PER_HOUR',
        increment: 1,
        amounts: { [car]: 150 },
        durationTiers: [],
        windowEnabled: true,
        windowStart: '18:00',
        windowEnd: '06:00',
        overtimeAmounts: { [car]: null },
      }).ok,
    ).toBe(false);
  });
});
