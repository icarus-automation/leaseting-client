import type { AgingBucketKey, AgingBucketTotals, DelinquencyTier } from '../../core/models/report.types';

/**
 * How the aging buckets present.
 *
 * The escalation is deliberately a vocabulary rather than a gradient: nothing
 * for money that is not yet late, amber once it is, red once it has been late
 * long enough to be a problem. Every use pairs the tone with the bucket's own
 * label, so the colour is never carrying the meaning by itself.
 */

export type BucketTone = 'neutral' | 'warning' | 'destructive';

export interface BucketMeta {
  key: AgingBucketKey;
  label: string;
  /** Column heading — shorter, because the table already says "days". */
  short: string;
  tone: BucketTone;
}

export const AGING_BUCKETS: readonly BucketMeta[] = [
  { key: 'current', label: 'Not yet due', short: 'Not yet due', tone: 'neutral' },
  { key: '1-30', label: '1–30 days late', short: '1–30', tone: 'warning' },
  { key: '31-60', label: '31–60 days late', short: '31–60', tone: 'warning' },
  { key: '61-90', label: '61–90 days late', short: '61–90', tone: 'destructive' },
  { key: '90+', label: '90+ days late', short: '90+', tone: 'destructive' },
] as const;

export const OVERDUE_BUCKETS = AGING_BUCKETS.filter((bucket) => bucket.key !== 'current');

export function bucketMeta(key: AgingBucketKey): BucketMeta {
  return AGING_BUCKETS.find((bucket) => bucket.key === key) ?? AGING_BUCKETS[0];
}

/** Fill for the aging bar's segments. */
export function bucketFill(tone: BucketTone): string {
  switch (tone) {
    case 'destructive':
      return 'bg-destructive';
    case 'warning':
      return 'bg-warning';
    default:
      return 'bg-border-strong';
  }
}

/** Text colour for a figure sitting in that bucket. */
export function bucketText(tone: BucketTone): string {
  switch (tone) {
    case 'destructive':
      return 'text-destructive';
    case 'warning':
      return 'text-heading';
    default:
      return 'text-muted';
  }
}

/**
 * Share of the total each bucket holds, as a percentage.
 *
 * Segments below a floor still render, because a bar that silently drops the
 * ₱900 sitting at 90+ days is hiding the one number a manager most needs to
 * see. The floor is taken back off the largest segment so the row still sums
 * to 100%.
 */
export function bucketShares(buckets: AgingBucketTotals, total: string): { key: AgingBucketKey; percent: number }[] {
  const grand = Number(total);
  const present = AGING_BUCKETS.filter((bucket) => Number(buckets[bucket.key]) > 0);
  if (grand <= 0 || present.length === 0) return [];

  const MIN_PERCENT = 4;
  const shares = present.map((bucket) => ({
    key: bucket.key,
    percent: (Number(buckets[bucket.key]) / grand) * 100,
  }));

  const lifted = shares.map((share) => ({ ...share, percent: Math.max(share.percent, MIN_PERCENT) }));
  const overflow = lifted.reduce((sum, share) => sum + share.percent, 0) - 100;
  if (overflow <= 0) return lifted;

  const largest = lifted.reduce((max, share) => (share.percent > max.percent ? share : max), lifted[0]);
  largest.percent = Math.max(MIN_PERCENT, largest.percent - overflow);
  return lifted;
}

// ── Delinquency tiers ────────────────────────────────────────────────────────

export interface TierMeta {
  label: string;
  /** What the tier actually means, shown as a tooltip and in the legend. */
  hint: string;
  tone: 'destructive' | 'warning' | 'neutral';
}

export const TIER_META: Record<DelinquencyTier, TierMeta> = {
  critical: {
    label: 'Critical',
    hint: 'Overdue past 60 days, or late six times or more',
    tone: 'destructive',
  },
  chronic: {
    label: 'Chronic',
    hint: 'Late three or more times in the period',
    tone: 'warning',
  },
  watch: {
    label: 'Watch',
    hint: 'Currently behind, but no pattern yet',
    tone: 'neutral',
  },
};
