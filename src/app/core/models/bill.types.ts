import type { BillStatus, BillType, PaymentMethod, PaymentSource } from './enums';

export interface UtilityDetail {
  periodFrom: string;
  periodTo: string;
  previousReading: string;
  presentReading: string;
  multiplier: string;
  adminFeeRate?: string;
  vatRate: string;
  whtRate: string;
  totalBillAmount?: string;
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
  utilityDetail: UtilityDetail | null;
  chargeName: string | null;
  label: string;
  paidAmount: string;
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
  paidOn: string;
  method: PaymentMethod;
  referenceNo: string | null;
  notes: string | null;
  hasReceipt: boolean;
  source: PaymentSource;
  isVoided: boolean;
  voidedAt: string | null;
  voidReason: string | null;
  createdByUserId: string | null;
  billId: string;
  submissionId: string | null;
  createdAt: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  referenceNo?: string;
  notes: string;
}

export interface CreateBillPayload {
  type: BillType;
  amount: number;
  dueDate: string;
  notes?: string;
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
  billId?: string;
  page?: number;
  limit?: number;
  leaseId?: string;
  tenantId?: string;
  status?: BillStatus;
  type?: BillType;
  dueToday?: boolean;
  overdue?: boolean;
  hasReading?: boolean;
  propertyId?: string;
  q?: string;
  dueFrom?: string;
  dueTo?: string;
  amountMin?: number;
  amountMax?: number;
}

interface BillsSummaryBucket {
  count: number;
  amountDue: string;
}

export interface BillsSummary {
  unpaid: BillsSummaryBucket;
  overdue: BillsSummaryBucket;
  dueToday: BillsSummaryBucket;
}

export interface UtilityRunPreviewRow {
  leaseId: string;
  unitNo: string;
  tenantName: string;
  dueDay: number;
  previousReading: string | null;
  lastPeriodTo: string | null;
}

export interface CreateUtilityRunPayload {
  propertyId: string;
  type: BillType;
  billingMonth: string;
  periodFrom: string;
  periodTo: string;
  adminFeeRate: number;
  vatRate: number;
  whtRate: number;
  ratePerUnit?: number;
  totalBillAmount?: number;
  totalConsumption?: number;
  rows: { leaseId: string; previousReading: number; presentReading: number }[];
}

export interface UtilityRunResult {
  created: number;
  skipped: { leaseId: string; unitNo: string; reason: string }[];
  totalAmount: string;
}

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
