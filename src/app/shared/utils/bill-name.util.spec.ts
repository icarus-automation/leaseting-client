import { billName } from './bill-name.util';

describe('billName', () => {
  it("uses the API's label, then the charge name, then the bill type", () => {
    expect(billName({ type: 'OTHER', chargeName: 'Key Deposit', label: 'Key Deposit' })).toBe('Key Deposit');
    expect(billName({ type: 'OTHER', chargeName: 'Late fee' })).toBe('Late fee');
    expect(billName({ type: 'RENT', chargeName: null })).toBe('Rent');
    expect(billName({ type: 'WATER' })).toBe('Water');
  });
});
