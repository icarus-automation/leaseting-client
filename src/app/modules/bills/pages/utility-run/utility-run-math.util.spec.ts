import { computeRow, consumedReading, deriveRate, round2, round4, utilityRowState } from './utility-run-math.util';

describe('utility-run-math.util', () => {
  describe('deriveRate', () => {
    it('divides the provider total by its consumption at 4 decimals', () => {
      expect(deriveRate(27493.93, 189)).toBe(145.4705);
    });

    it('rejects non-positive inputs', () => {
      expect(deriveRate(0, 189)).toBeNull();
      expect(deriveRate(27493.93, 0)).toBeNull();
    });
  });

  describe('computeRow', () => {
    const rates = { ratePerUnit: 13.04, adminFeePct: 3, vatPct: 0, taxBasis: 'WHOLE_CHARGE' as const, whtPct: 0 };

    it('mirrors the server math: subtotal + admin fee', () => {
      const row = computeRow(668, 804, rates);
      expect(row).not.toBeNull();
      expect(row!.consumed).toBe(136);
      expect(row!.subtotal).toBe(1773.44);
      expect(row!.adminFee).toBe(53.2);
      expect(row!.netDue).toBe(1826.64);
    });

    it('applies VAT and WHT on the subtotal when there is no admin fee, like the backend', () => {
      const row = computeRow(833, 907, { ratePerUnit: 13.64, adminFeePct: 0, vatPct: 12, taxBasis: 'WHOLE_CHARGE', whtPct: 2 });
      expect(row!.subtotal).toBe(1009.36);
      expect(row!.vat).toBe(121.12);
      expect(row!.wht).toBe(20.19);
      expect(row!.netDue).toBe(1110.29);
    });

    it('charges VAT and withholding on usage plus admin fee for the whole charge', () => {
      const row = computeRow(833, 907, { ratePerUnit: 13.64, adminFeePct: 3, vatPct: 12, taxBasis: 'WHOLE_CHARGE', whtPct: 2 });
      expect(row!.vat).toBe(124.76);
      expect(row!.wht).toBe(20.79);
      expect(row!.netDue).toBe(1143.61);
    });

    it('charges VAT and withholding on the admin fee alone when told to', () => {
      const row = computeRow(833, 907, { ratePerUnit: 13.64, adminFeePct: 3, vatPct: 12, taxBasis: 'ADMIN_FEE', whtPct: 2 });
      expect(row!.vat).toBe(3.63);
      expect(row!.wht).toBe(0.61);
      expect(row!.netDue).toBe(1042.66);
    });

    it('matches the docs example: 70 kWh at ₱13 with 10% fee, 12% VAT, 2% withholding', () => {
      const docs = { ratePerUnit: 13, adminFeePct: 10, vatPct: 12, whtPct: 2 };
      expect(computeRow(520, 590, { ...docs, taxBasis: 'WHOLE_CHARGE' })).toMatchObject({ subtotal: 910, adminFee: 91, vat: 120.12, wht: 20.02, netDue: 1101.1 });
      expect(computeRow(520, 590, { ...docs, taxBasis: 'ADMIN_FEE' })).toMatchObject({ vat: 10.92, wht: 1.82, netDue: 1010.1 });
    });

    it('returns null for backwards readings or a missing rate', () => {
      expect(computeRow(804, 668, rates)).toBeNull();
      expect(computeRow(668, 804, { ...rates, ratePerUnit: 0 })).toBeNull();
    });

    it('allows zero consumption (renders ₱0, submit-side skips it)', () => {
      expect(computeRow(668, 668, rates)!.netDue).toBe(0);
    });
  });

  describe('rounding', () => {
    it('round2/round4 behave on binary-float edges', () => {
      expect(round2(1.005)).toBe(1.01);
      expect(round4(145.47052910052909)).toBe(145.4705);
    });
  });

  describe('utilityRowState', () => {
    const rates = { ratePerUnit: 13.04, adminFeePct: 0, vatPct: 0, taxBasis: 'WHOLE_CHARGE' as const, whtPct: 0 };

    it('needs a reading while Present is blank, whatever else is missing', () => {
      expect(utilityRowState(668, null, rates)).toEqual({ state: 'needs-reading' });
      expect(utilityRowState(null, null, null)).toEqual({ state: 'needs-reading' });
    });

    it('warns about a missing previous reading before anything else', () => {
      expect(utilityRowState(null, 804, null)).toEqual({ state: 'warning', warning: 'No previous reading' });
    });

    it('warns when Present is lower than Previous', () => {
      expect(utilityRowState(804, 668, rates)).toEqual({ state: 'warning', warning: 'Lower than previous' });
    });

    it('asks for a rate once both readings are fine', () => {
      expect(utilityRowState(668, 804, null)).toEqual({ state: 'warning', warning: 'Set a rate first' });
      expect(utilityRowState(668, 804, { ...rates, ratePerUnit: 0 })).toEqual({ state: 'warning', warning: 'Set a rate first' });
    });

    it('is ready with the same math as computeRow', () => {
      expect(utilityRowState(668, 804, rates)).toEqual({ state: 'ready', math: computeRow(668, 804, rates) });
      expect(utilityRowState(500, 500, rates)).toMatchObject({ state: 'ready', math: { consumed: 0, netDue: 0 } });
    });
  });

  describe('consumedReading', () => {
    it('is the difference once both readings are in and the meter went up', () => {
      expect(consumedReading(2900.2, 2956.5)).toBe(56.3);
      expect(consumedReading(null, 10)).toBeNull();
      expect(consumedReading(10, null)).toBeNull();
      expect(consumedReading(10, 9)).toBeNull();
    });
  });
});
