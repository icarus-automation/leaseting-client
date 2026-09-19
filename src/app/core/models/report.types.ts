export interface CollectionsMonth {
  month: string;
  total: string;
  count: number;
}

export interface AgingBucket {
  bucket: string;
  count: number;
  amount: string;
}

export interface PropertyOccupancy {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  occupiedUnits: number;
  rate: number;
}

export type RevenueBasis = 'BILLED' | 'COLLECTED';

export interface RevenueRow {
  id: string;
  date: string;
  kind: string;
  memo: string;
  unitLabel: string;
  amount: string;
  paid: string | null;
  balance: string | null;
  referenceNo: string | null;
}

export interface RevenueTenantGroup {
  tenantId: string;
  tenantName: string;
  rows: RevenueRow[];
  subtotal: string;
  subtotalPaid: string | null;
  subtotalBalance: string | null;
}

export interface RevenueByTenantReport {
  basis: RevenueBasis;
  from: string;
  to: string;
  groups: RevenueTenantGroup[];
  total: string;
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


export type AgingBucketKey = 'current' | '1-30' | '31-60' | '61-90' | '90+';

export type AgingBucketTotals = Record<AgingBucketKey, string>;

export interface AgingBillRow {
  billId: string;
  leaseId: string;
  unitId: string;
  dueDate: string;
  daysOverdue: number;
  bucket: AgingBucketKey;
  typeLabel: string;
  memo: string;
  unitLabel: string;
  amount: string;
  paid: string;
  balance: string;
}

interface AgingGroupBase {
  tenantId: string;
  tenantName: string;
  contactNo: string;
  buckets: AgingBucketTotals;
  total: string;
  overdue: string;
  oldestDaysOverdue: number;
  billCount: number;
}

export type AgingSummaryGroup = AgingGroupBase;

export interface AgingDetailGroup extends AgingGroupBase {
  rows: AgingBillRow[];
}

interface ArAgingBase {
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
  asOf?: string;
  propertyId?: string;
  bucket?: AgingBucketKey;
}


export type DelinquencyTier = 'watch' | 'chronic' | 'critical';

export type SmsDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export type SmsOrigin = 'SCHEDULED' | 'MANUAL';

export interface ReminderEntry {
  id: string;
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
  avgDaysLate: number | null;
  maxDaysLate: number;

  openOverdueCount: number;
  openOverdueAmount: string;
  oldestDaysOverdue: number;
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
  converted: number;
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
  smsEnabled: boolean;
}

export interface DelinquencyQuery {
  asOf?: string;
  months: number;
  propertyId?: string;
}

export interface ManualReminderResult {
  ok: boolean;
  stage: string;
  recipient: string;
  body: string;
  error: string | null;
}


export interface ParkingReportQuery {
  from: string;
  to: string;
  propertyId?: string;
  terminalId?: string;
}

export type ParkingRevenueGrouping =
  | 'day'
  | 'property'
  | 'terminal'
  | 'attendant'
  | 'vehicle-type'
  | 'rate-plan'
  | 'shift';

export interface ParkingRevenueGroupRow {
  key: string;
  label: string;
  sublabel: string | null;
  exits: number;
  collected: string;
  billedMinutes: number;
  averageFee: string;
  share: number;
}

export interface ParkingRevenueReport {
  from: string;
  to: string;
  totals: {
    exits: number;
    collected: string;
    billedMinutes: number;
    averageFee: string;
    averageStayMinutes: number;
  };
  breakdowns: Record<ParkingRevenueGrouping, ParkingRevenueGroupRow[]>;
}

export type ShiftVarianceState = 'balanced' | 'short' | 'over';

export interface ShiftCashRow {
  shiftId: string;
  status: 'DECLARED' | 'CONFIRMED';
  propertyId: string;
  propertyName: string;
  terminalId: string;
  terminalName: string;
  attendantId: string;
  attendantName: string;
  openedAt: string;
  declaredAt: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
  expectedCash: string;
  declaredCash: string;
  variance: string;
  state: ShiftVarianceState;
  paidExits: number;
  note: string | null;
}

export interface ShiftCashVarianceReport {
  from: string;
  to: string;
  totals: {
    shifts: number;
    expected: string;
    declared: string;
    variance: string;
    shortAmount: string;
    overAmount: string;
    shortCount: number;
    overCount: number;
    balancedCount: number;
    awaitingConfirm: number;
    confirmed: number;
  };
  rows: ShiftCashRow[];
}

export interface ParkingVoidRow {
  sessionId: string;
  ticketCode: string;
  plateNumber: string;
  entryAt: string;
  voidedAt: string;
  minutesInPark: number;
  propertyId: string;
  propertyName: string;
  terminalId: string;
  terminalName: string;
  vehicleTypeName: string;
  entryAttendantName: string;
  voidedById: string | null;
  voidedByName: string;
  reason: string;
}

export interface ParkingVoidActorRow {
  actorId: string;
  actorName: string;
  voids: number;
  share: number;
}

export interface ParkingVoidReport {
  from: string;
  to: string;
  totals: {
    voids: number;
    actors: number;
    terminals: number;
    averageMinutesInPark: number;
  };
  byActor: ParkingVoidActorRow[];
  rows: ParkingVoidRow[];
}
