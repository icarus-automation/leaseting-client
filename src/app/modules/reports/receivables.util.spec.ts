import { describe, expect, it } from 'vitest';

import type { AgingBucketTotals } from '../../core/models/report.types';
import { AGING_BUCKETS, bucketMeta, bucketShares } from './receivables.util';

const totals = (overrides: Partial<AgingBucketTotals> = {}): AgingBucketTotals => ({
  current: '0.00',
  '1-30': '0.00',
  '31-60': '0.00',
  '61-90': '0.00',
  '90+': '0.00',
  ...overrides,
});

const sum = (shares: { percent: number }[]) => shares.reduce((total, share) => total + share.percent, 0);

describe('receivables.util', () => {
  describe('bucketMeta', () => {
    it('escalates the tone with the age of the debt', () => {
      expect(bucketMeta('current').tone).toBe('neutral');
      expect(bucketMeta('1-30').tone).toBe('warning');
      expect(bucketMeta('90+').tone).toBe('destructive');
    });

    it('pairs every bucket with a label, so colour is never the only signal', () => {
      expect(AGING_BUCKETS.every((bucket) => bucket.label.length > 0 && bucket.short.length > 0)).toBe(true);
    });
  });

  describe('bucketShares', () => {
    it('is empty when nothing is owed', () => {
      expect(bucketShares(totals(), '0.00')).toEqual([]);
    });

    it('splits the bar in proportion to the money', () => {
      const shares = bucketShares(totals({ current: '750.00', '1-30': '250.00' }), '1000.00');

      expect(shares).toEqual([
        { key: 'current', percent: 75 },
        { key: '1-30', percent: 25 },
      ]);
    });

    it('omits buckets holding nothing', () => {
      const shares = bucketShares(totals({ '31-60': '500.00' }), '500.00');

      expect(shares.map((share) => share.key)).toEqual(['31-60']);
    });

    it('keeps a tiny balance visible instead of collapsing it to a hairline', () => {
      const shares = bucketShares(totals({ current: '99900.00', '90+': '100.00' }), '100000.00');
      const ancient = shares.find((share) => share.key === '90+');

      expect(ancient?.percent).toBeGreaterThanOrEqual(4);
    });

    it('takes the lift back off the largest segment so the bar still fills exactly once', () => {
      const shares = bucketShares(totals({ current: '99900.00', '90+': '100.00' }), '100000.00');

      expect(sum(shares)).toBeCloseTo(100, 5);
    });

    it('leaves an already-proportional bar untouched', () => {
      const shares = bucketShares(
        totals({ current: '2500.00', '1-30': '2500.00', '31-60': '2500.00', '61-90': '2500.00' }),
        '10000.00',
      );

      expect(shares.every((share) => share.percent === 25)).toBe(true);
      expect(sum(shares)).toBe(100);
    });

    it('gives a lone bucket the whole bar', () => {
      expect(bucketShares(totals({ '90+': '4200.00' }), '4200.00')).toEqual([{ key: '90+', percent: 100 }]);
    });

    it('orders segments oldest-last, matching the table columns', () => {
      const shares = bucketShares(
        totals({ '90+': '1000.00', current: '1000.00', '31-60': '1000.00' }),
        '3000.00',
      );

      expect(shares.map((share) => share.key)).toEqual(['current', '31-60', '90+']);
    });
  });
});
