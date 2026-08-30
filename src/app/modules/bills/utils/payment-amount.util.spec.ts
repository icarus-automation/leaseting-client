import { finiteAmount } from './payment-amount.util';

describe('finiteAmount', () => {
  it('keeps a zero balance so currency inputs are not reset to null', () => {
    expect(finiteAmount('0')).toBe(0);
    expect(finiteAmount('0.00')).toBe(0);
  });

  it('returns null for empty or invalid values', () => {
    expect(finiteAmount('')).toBeNull();
    expect(finiteAmount(undefined)).toBeNull();
    expect(finiteAmount('n/a')).toBeNull();
  });
});
