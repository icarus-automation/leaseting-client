import { leaseBillsType } from './lease-utility-billing.util';

describe('leaseBillsType', () => {
  const waterOnly = { billsElectricity: false, billsWater: true };

  it('follows the lease setting for electricity and water', () => {
    expect(leaseBillsType(waterOnly, 'ELECTRICITY')).toBe(false);
    expect(leaseBillsType(waterOnly, 'WATER')).toBe(true);
  });

  it('always allows rent and the other charges', () => {
    for (const type of ['RENT', 'INTERNET', 'ASSOCIATION_DUES', 'OTHER'] as const) {
      expect(leaseBillsType({ billsElectricity: false, billsWater: false }, type)).toBe(true);
    }
  });
});
