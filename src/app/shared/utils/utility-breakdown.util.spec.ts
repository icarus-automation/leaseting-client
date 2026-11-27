import type { UtilityDetail } from '../../core/models/bill.types';
import { percentLabel, storedUtilityAmounts, utilityChargeLines } from './utility-breakdown.util';

const STORED: UtilityDetail = {
  periodFrom: '2026-10-01',
  periodTo: '2026-10-31',
  previousReading: '520.00',
  presentReading: '590.00',
  multiplier: '13',
  adminFeeRate: '0.1',
  vatRate: '0.12',
  taxBasis: 'WHOLE_CHARGE',
  whtRate: '0.02',
  consumed: '70.00',
  subtotal: '910.00',
  adminFee: '91.00',
  vat: '120.12',
  wht: '20.02',
};

describe('utilityChargeLines', () => {
  it('lists Subtotal, Admin fee, VAT, Withholding as a minus, then Total', () => {
    const lines = utilityChargeLines(storedUtilityAmounts(STORED, '1101.10')!);
    expect(lines.map(({ label, amount }) => [label, amount])).toEqual([
      ['Subtotal', 910],
      ['Admin fee', 91],
      ['VAT (12%)', 120.12],
      ['Withholding (2%)', -20.02],
      ['Total', 1101.1],
    ]);
    expect(lines.filter((line) => line.isTotal).map((line) => line.label)).toEqual(['Total']);
  });

  it('adds up to the total', () => {
    const lines = utilityChargeLines(storedUtilityAmounts(STORED, '1101.10')!);
    const sum = lines.filter((line) => !line.isTotal).reduce((total, line) => total + line.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(1101.1);
  });

  it('shows only Subtotal and Total when there is no admin fee, VAT or withholding', () => {
    const plain = { ...STORED, adminFeeRate: '0', adminFee: '0.00', vatRate: '0', vat: '0.00', whtRate: '0', wht: '0.00' };
    expect(utilityChargeLines(storedUtilityAmounts(plain, '910.00')!).map((line) => line.label)).toEqual(['Subtotal', 'Total']);
  });
});

describe('storedUtilityAmounts', () => {
  it('is null for a bill sent without amounts, or no reading at all', () => {
    const rateOnly = { ...STORED, subtotal: undefined };
    expect(storedUtilityAmounts(rateOnly, '1101.10')).toBeNull();
    expect(storedUtilityAmounts(null, '500.00')).toBeNull();
  });
});

describe('percentLabel', () => {
  it('shows a fraction as a short percent', () => {
    expect(percentLabel('0.12')).toBe('12%');
    expect(percentLabel(0.125)).toBe('12.5%');
    expect(percentLabel('0.0125')).toBe('1.25%');
  });
});
