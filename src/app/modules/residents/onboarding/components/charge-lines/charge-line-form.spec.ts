import { systemItemPurpose, type ChargeItemResponse } from '../../../../../core/models/charge-item.types';
import { withChargeItemDefaults } from '../../../../settings/services/charge-items.service';
import { chargeOptions } from './charge-line-form';

function item(overrides: Partial<ChargeItemResponse>): ChargeItemResponse {
  return {
    id: 'rent',
    name: 'Monthly Rent',
    billType: 'RENT',
    defaultAmount: null,
    isArchived: false,
    frequency: 'MONTHLY',
    isSystem: false,
    systemKey: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const catalog = [
  item({}),
  item({ id: 'parking', name: 'Parking', billType: 'OTHER', defaultAmount: '1500.00' }),
  item({ id: 'key', name: 'Key Deposit', billType: 'OTHER', frequency: 'ONE_TIME', defaultAmount: '1000.00' }),
  item({ id: 'late', name: 'Late fee', billType: 'OTHER', frequency: 'ONE_TIME', isSystem: true, systemKey: 'LATE_FEE' }),
  item({
    id: 'deposit',
    name: 'Security Deposit',
    billType: 'OTHER',
    frequency: 'ONE_TIME',
    isSystem: true,
    systemKey: 'SECURITY_DEPOSIT',
  }),
  item({ id: 'storage', name: 'Storage', billType: 'OTHER', isArchived: true }),
];

const labels = (options: { label: string }[]) => options.map((option) => option.label);

describe('chargeOptions for lease terms', () => {
  it('offers only live monthly items, since every lease line is billed each month', () => {
    expect(labels(chargeOptions(catalog, new Set()))).toEqual(['Monthly Rent', 'Parking']);
  });

  it('keeps an item a saved line already uses, marked, so the line can be swapped out', () => {
    expect(labels(chargeOptions(catalog, new Set(['key', 'late', 'storage'])))).toEqual([
      'Monthly Rent',
      'Parking',
      'Key Deposit (one-time)',
      'Late fee (system)',
      'Storage (archived)',
    ]);
  });

  it('carries the plain name and the default amount for the line', () => {
    expect(chargeOptions(catalog, new Set())[1]).toEqual({
      label: 'Parking',
      name: 'Parking',
      value: 'parking',
      billType: 'OTHER',
      defaultAmount: 1500,
    });
  });
});

describe('chargeOptions for move-in charges', () => {
  it('offers only live one-time items that are not system items', () => {
    expect(labels(chargeOptions(catalog, new Set(), 'ONE_TIME'))).toEqual(['Key Deposit']);
  });

  it('marks a saved monthly line instead of dropping it', () => {
    expect(labels(chargeOptions(catalog, new Set(['parking']), 'ONE_TIME'))).toEqual(['Parking (monthly)', 'Key Deposit']);
  });
});

describe('systemItemPurpose', () => {
  it('says what Leaseting bills as each system item', () => {
    expect(systemItemPurpose(catalog[3])).toBe('late fees post as it');
    expect(systemItemPurpose(catalog[4])).toBe('the onboarding deposit step bills as it');
  });
});

describe('withChargeItemDefaults', () => {
  it('reads an item from an API without frequency as an ordinary monthly item', () => {
    const older = { ...item({ id: 'parking', name: 'Parking' }), frequency: undefined, isSystem: undefined, systemKey: undefined };

    expect(withChargeItemDefaults(older as unknown as ChargeItemResponse)).toMatchObject({
      frequency: 'MONTHLY',
      isSystem: false,
      systemKey: null,
    });
  });
});
