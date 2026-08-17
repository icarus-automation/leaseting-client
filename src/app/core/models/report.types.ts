export interface CollectionsMonth {
  /** yyyy-MM. */
  month: string;
  total: string;
  count: number;
}

export interface AgingBucket {
  /** Days-overdue band, e.g. "1-30" or "90+". */
  bucket: string;
  count: number;
  /** Outstanding balance, not face value. */
  amount: string;
}

export interface PropertyOccupancy {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  occupiedUnits: number;
  /** 0–100, one decimal. */
  rate: number;
}

/**
 * Which ledger "Revenue by Tenant" reads.
 *
 * BILLED reports the charges raised, COLLECTED the payments received. A
 * November bill settled in December lands in a different month on each, which
 * is why the report carries the switch rather than picking one.
 */
export type RevenueBasis = 'BILLED' | 'COLLECTED';

/** One transaction line: a bill on the BILLED basis, a payment on COLLECTED. */
export interface RevenueRow {
  id: string;
  /** ISO date-only. Due date on BILLED, paid-on date on COLLECTED. */
  date: string;
  /** Bill type on BILLED ("Rent"), payment method on COLLECTED ("GCash"). */
  kind: string;
  memo: string;
  /** e.g. "Unit 3B · Sunrise Tower". */
  unitLabel: string;
  amount: string;
  /** BILLED only. */
  paid: string | null;
  balance: string | null;
  /** COLLECTED only. */
  referenceNo: string | null;
}

export interface RevenueTenantGroup {
  tenantId: string;
  tenantName: string;
  rows: RevenueRow[];
  subtotal: string;
  /** BILLED only. */
  subtotalPaid: string | null;
  subtotalBalance: string | null;
}

export interface RevenueByTenantReport {
  basis: RevenueBasis;
  /** Resolved window, echoed by the backend — label the printout from these. */
  from: string;
  to: string;
  groups: RevenueTenantGroup[];
  total: string;
  /** BILLED only. */
  totalPaid: string | null;
  totalBalance: string | null;
  rowCount: number;
}

export interface RevenueByTenantQuery {
  from: string;
  to: string;
  basis: RevenueBasis;
  propertyId?: string;
}

// ── Receivables (A/R aging) ──────────────────────────────────────────────────

/** `current` is everything not yet due; the rest are days past the due date. */
export type AgingBucketKey = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export type AgingBucketTotals = Record<AgingBucketKey, string>;

export interface AgingBillRow {
  billId: string;
  leaseId: string;
  unitId: string;
  /** ISO date-only. */
  dueDate: string;
  /** Negative while the bill is still within terms. */
  daysOverdue: number;
  bucket: AgingBucketKey;
  typeLabel: string;
  memo: string;
  unitLabel: string;
  amount: string;
  paid: string;
  /** What is still owed as of the report date — the figure that ages. */
  balance: string;
}

interface AgingGroupBase {
  tenantId: string;
  tenantName: string;
  contactNo: string;
  buckets: AgingBucketTotals;
  total: string;
  /** `total` less the `current` bucket. */
  overdue: string;
  oldestDaysOverdue: number;
  billCount: number;
}

export type AgingSummaryGroup = AgingGroupBase;

export interface AgingDetailGroup extends AgingGroupBase {
  rows: AgingBillRow[];
}

interface ArAgingBase {
  /** ISO date-only the figures are stated as of. */
  asOf: string;
  buckets: AgingBucketTotals;
  total: string;
  overdue: string;
  billCount: number;
  tenantCount: number;
}

export interface ArAgingSummary extends ArAgingBase {
  groups: AgingSummaryGroup[];
}

export interface ArAgingDetail extends ArAgingBase {
  groups: AgingDetailGroup[];
}

export interface ArAgingQuery {
  asOf: string;
  propertyId?: string;
  bucket?: AgingBucketKey;
}

// ── Delinquency & reminders ──────────────────────────────────────────────────

export type DelinquencyTier = 'watch' | 'chronic' | 'critical';

export type SmsDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

/** Who pushed the send: the nightly ladder, or a person on a report. */
export type SmsOrigin = 'SCHEDULED' | 'MANUAL';

export interface ReminderEntry {
  id: string;
  /** ISO date-only. */
  sentAt: string;
  stage: string;
  stageLabel: string;
  status: SmsDeliveryStatus;
  origin: SmsOrigin;
  billId: string | null;
  billLabel: string;
}

export interface DelinquencyTenant {
  tenantId: string;
  tenantName: string;
  contactNo: string;
  units: string[];
  tier: DelinquencyTier;

  billsConsidered: number;
  lateCount: number;
  onTimeCount: number;
  /** Averaged over settled-late bills only; null until one settles late. */
  avgDaysLate: number | null;
  maxDaysLate: number;

  openOverdueCount: number;
  openOverdueAmount: string;
  oldestDaysOverdue: number;
  /** Oldest open overdue bill — what the Send reminder action targets. */
  chaseBillId: string | null;

  reminders: ReminderEntry[];
  remindersSent: number;
  lastReminderAt: string | null;
  lastReminderStage: string | null;
}

export interface ReminderStageStat {
  stage: string;
  stageLabel: string;
  sent: number;
  /** Sends followed by a payment on that bill inside the attribution window. */
  converted: number;
  /** 0–100, one decimal. */
  rate: number;
}

export interface DelinquencyReport {
  asOf: string;
  windowFrom: string;
  months: number;
  tenants: DelinquencyTenant[];
  effectiveness: ReminderStageStat[];
  effectivenessWindowDays: number;
  totals: {
    tenantCount: number;
    chronicCount: number;
    criticalCount: number;
    openOverdue: string;
    remindersSent: number;
  };
  /** False when the SMS gateway is unconfigured — the send action hides. */
  smsEnabled: boolean;
}

export interface DelinquencyQuery {
  asOf: string;
  months: number;
  propertyId?: string;
}

/** What a hand-sent chase reports back. */
export interface ManualReminderResult {
  ok: boolean;
  stage: string;
  recipient: string;
  body: string;
  error: string | null;
}
