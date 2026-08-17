import { computeRow, deriveRate, round2, round4 } from './utility-run-math.util';

describe('utility-run-math.util', () => {
  describe('deriveRate', () => {
    it('divides the provider total by its consumption at 4 decimals', () => {
      // Maynilad receipt: ₱27,493.93 over 189 cu.m.
      expect(deriveRate(27493.93, 189)).toBe(145.4705);
    });

    it('rejects non-positive inputs', () => {
      expect(deriveRate(0, 189)).toBeNull();
      expect(deriveRate(27493.93, 0)).toBeNull();
    });
  });

  describe('computeRow', () => {
    const rates = { ratePerUnit: 13.04, adminFeePct: 3, vatPct: 0, whtPct: 0 };

    it('mirrors the server math: subtotal + admin fee', () => {
      const row = computeRow(668, 804, rates);
      expect(row).not.toBeNull();
      // 136 × 13.04 = 1,773.44 + 3% (53.20) = 1,826.64
      expect(row!.consumed).toBe(136);
      expect(row!.subtotal).toBe(1773.44);
      expect(row!.adminFee).toBe(53.2);
      expect(row!.netDue).toBe(1826.64);
    });

    it('applies VAT and WHT on the subtotal, like the backend', () => {
      const row = computeRow(833, 907, { ratePerUnit: 13.64, adminFeePct: 0, vatPct: 12, whtPct: 2 });
      // Matches the backend spec's sample: 1,009.36 + 121.12 − 20.19.
      expect(row!.subtotal).toBe(1009.36);
      expect(row!.vat).toBe(121.12);
      expect(row!.wht).toBe(20.19);
      expect(row!.netDue).toBe(1110.29);
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
});
