export type PaymentBand = 'STABLE' | 'PAYMENT_DRIFT' | 'HIGH_DEFAULT_RISK' | 'INSUFFICIENT_DATA';

export type RetentionBand = 'LIKELY_RENEW' | 'UNCERTAIN' | 'LIKELY_LEAVE';

export interface BandedPayment {
  band: PaymentBand;
  reason: string;
  abandonmentWatch: boolean;
}

export interface BandedRetention {
  band: RetentionBand;
  reason: string;
  daysToLeaseEnd: number;
}

export interface PaymentSignals {
  latenessDays: number[];
  averageLatenessDays: number | null;
  latestLatenessDays: number | null;
  driftDaysPerPeriod: number | null;
  sampleSize: number;
}

export interface ConsumptionSignals {
  latest: number | null;
  baseline: number | null;
  dropRatio: number | null;
  quietPeriods: number;
}

export interface TenantRiskProfile {
  tenantId: string;
  leaseId: string | null;
  payment: BandedPayment;
  retention: BandedRetention | null;
  signals: {
    payment: PaymentSignals;
    consumption: ConsumptionSignals;
    outstandingBalance: string;
    maxDaysOverdue: number;
    monthlyRent: string;
    tenureMonths: number;
    priorLeaseCount: number;
  };
  asOf: string;
}
