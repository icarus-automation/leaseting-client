/**
 * How a tenant is paying. Decided server-side by thresholds, never by a model.
 *
 * `PAYMENT_DRIFT` is the band this exists for: a tenant who still pays every
 * month but later each time is invisible to an arrears report until the month
 * they miss entirely — and that is the month it stops being cheap to fix.
 */
export type PaymentBand = 'STABLE' | 'PAYMENT_DRIFT' | 'HIGH_DEFAULT_RISK' | 'INSUFFICIENT_DATA';

/**
 * Whether a lease looks likely to be renewed.
 *
 * Kept apart from {@link PaymentBand} because the two call for opposite
 * actions: a tenant heading for default should be chased, a good tenant
 * heading for the door should be kept.
 */
export type RetentionBand = 'LIKELY_RENEW' | 'UNCERTAIN' | 'LIKELY_LEAVE';

export interface BandedPayment {
  band: PaymentBand;
  /** The arithmetic in one line — what the badge is checked against. */
  reason: string;
  /** Metered consumption has collapsed while money is still owed. */
  abandonmentWatch: boolean;
}

export interface BandedRetention {
  band: RetentionBand;
  reason: string;
  daysToLeaseEnd: number;
}

export interface PaymentSignals {
  /** Days late per rent charge, oldest first. Negative means paid early. */
  latenessDays: number[];
  averageLatenessDays: number | null;
  latestLatenessDays: number | null;
  /** Extra days of lateness added per month, from a least-squares fit. */
  driftDaysPerPeriod: number | null;
  sampleSize: number;
}

export interface ConsumptionSignals {
  latest: number | null;
  baseline: number | null;
  /** How far recent consumption sits below baseline, 0–1. */
  dropRatio: number | null;
  quietPeriods: number;
}

export interface TenantRiskProfile {
  tenantId: string;
  leaseId: string | null;
  payment: BandedPayment;
  /** null outside the 120-day renewal window — there is nothing to say yet. */
  retention: BandedRetention | null;
  signals: {
    payment: PaymentSignals;
    consumption: ConsumptionSignals;
    /** Prisma Decimals — serialized as strings. */
    outstandingBalance: string;
    maxDaysOverdue: number;
    monthlyRent: string;
    tenureMonths: number;
    priorLeaseCount: number;
  };
  asOf: string;
}
