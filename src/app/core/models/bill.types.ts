import type { BillStatus, BillType, PaymentMethod } from './enums';

/**
 * Meter-reading breakdown for ELECTRICITY/WATER bills. Numeric values travel
 * as strings; the backend derives the bill amount (net due) from them.
 */
export interface UtilityDetail {
  /** ISO dates (yyyy-MM-dd) — the covered period. */
  periodFrom: string;
  periodTo: string;
  previousReading: string;
  presentReading: string;
  /** Rate per consumed unit (₱/kWh or ₱/cu.m). */
  multiplier: string;
  /** Fraction, e.g. "0.03" — landlord admin fee on the subtotal. Absent on legacy bills. */
  adminFeeRate?: string;
  /** Fraction, e.g. "0.12" — VAT added on top of the total. */
  vatRate: string;
  /** Fraction, e.g. "0.02" — withholding tax deducted from the total. */
  whtRate: string;
  /** Audit-only: provider bill total behind a derived rate (Maynilad mode). */
  totalBillAmount?: string;
  /** Audit-only: provider bill total consumption behind a derived rate. */
  totalConsumption?: string;
}

export interface BillResponse {
  id: string;
  type: BillType;
  amount: string;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
  notes: string | null;
  leaseId: string;
  createdAt: string;
  updatedAt: string;
  /** Meter-reading breakdown for utility bills; null for flat amounts. */
  utilityDetail: UtilityDetail | null;
  /** Sum of recorded payments; legacy bills settled before payments show "0". */
  paidAmount: string;
  /** What's still owed. Always "0" on PAID bills. */
  balance: string;
}

export interface BillListItem extends BillResponse {
  lease: {
    id: string;
    tenant: { id: string; firstName: string; lastName: string };
    unit: {
      id: string;
      unitNo: string;
      property: { id: string; name: string };
    };
  };
}

export interface BillDetail extends BillListItem {
  payments: PaymentResponse[];
}

export interface PaymentResponse {
  id: string;
  amount: string;
  /** ISO date (yyyy-MM-dd). */
  paidOn: string;
  method: PaymentMethod;
  referenceNo: string | null;
  notes: string | null;
  /** Proof of payment served through the media proxy; null when none uploaded. */
  receiptUrl: string | null;
  billId: string;
  createdAt: string;
}

export interface RecordPaymentPayload {
  /** Must be ≥ 0.01, max 2 decimal places, ≤ the bill's open balance. */
  amount: number;
  /** ISO date (yyyy-MM-dd). */
  paidOn: string;
  method: PaymentMethod;
  referenceNo?: string;
  notes?: string;
}

export interface CreateBillPayload {
  type: BillType;
  /** Must be ≥ 0.01, max 2 decimal places. Ignored when utilityDetail is set. */
  amount: number;
  /** ISO date (yyyy-MM-dd). */
  dueDate: string;
  notes?: string;
  /** Electricity/water only — the server computes the amount from it. */
  utilityDetail?: {
    periodFrom: string;
    periodTo: string;
    previousReading: number;
    presentReading: number;
    multiplier: number;
    adminFeeRate?: number;
    vatRate: number;
    whtRate: number;
    totalBillAmount?: number;
    totalConsumption?: number;
  };
}

export interface BillListFilters {
  page?: number;
  limit?: number;
  leaseId?: string;
  /** All bills across the tenant's leases (tenant-profile deep link). */
  tenantId?: string;
  status?: BillStatus;
  type?: BillType;
  /** Unpaid bills due today. */
  dueToday?: boolean;
  /** Unpaid bills past their due date. */
  overdue?: boolean;
  /** Only bills carrying a meter-reading breakdown. */
  hasReading?: boolean;
  /** Every bill raised against a unit in this property. */
  propertyId?: string;
  /** Part of the billed tenant's name. */
  q?: string;
  /** Inclusive due-date window (yyyy-MM-dd). */
  dueFrom?: string;
  dueTo?: string;
  /** Bounds on the bill's face amount, not its open balance. */
  amountMin?: number;
  amountMax?: number;
}

interface BillsSummaryBucket {
  count: number;
  /** Outstanding balance (amount − payments), not face value. */
  amountDue: string;
}

export interface BillsSummary {
  unpaid: BillsSummaryBucket;
  overdue: BillsSummaryBucket;
  dueToday: BillsSummaryBucket;
}

/** One lease's row in the utility billing-run preview. */
export interface UtilityRunPreviewRow {
  leaseId: string;
  unitNo: string;
  tenantName: string;
  /** The lease's monthly due day — the bill falls due on it, like rent. */
  dueDay: number;
  /** The last utility bill's present reading — this run's starting point. */
  previousReading: string | null;
  /** End of the period that reading covered (yyyy-MM-dd). */
  lastPeriodTo: string | null;
}

export interface CreateUtilityRunPayload {
  propertyId: string;
  type: BillType;
  /** yyyy-MM — the billed month. Each bill's due date is the tenant's lease
   *  due day in this month (server-computed), so there's no due-date field. */
  billingMonth: string;
  periodFrom: string;
  periodTo: string;
  adminFeeRate: number;
  vatRate: number;
  whtRate: number;
  /** Electricity path — direct ₱/kWh. Mutually exclusive with the totals. */
  ratePerUnit?: number;
  /** Water path — rate is derived as total ÷ consumption. */
  totalBillAmount?: number;
  totalConsumption?: number;
  rows: { leaseId: string; previousReading: number; presentReading: number }[];
}

export interface UtilityRunResult {
  created: number;
  skipped: { leaseId: string; unitNo: string; reason: string }[];
  totalAmount: string;
}

/** AI extraction from a provider bill photo — every field may be null. */
export interface ReceiptScanResult {
  provider: 'meralco' | 'maynilad' | null;
  totalAmountDue: number | null;
  ratePerKwh: number | null;
  totalConsumption: number | null;
  previousReading: number | null;
  presentReading: number | null;
  billingPeriodFrom: string | null;
  billingPeriodTo: string | null;
  dueDate: string | null;
}
