export interface ParkingPassPrice {
  vehicleTypeId: string;
  vehicleTypeName: string;
  amount: string;
}

export interface ParkingPassPrices {
  propertyId: string;
  graceDays: number;
  prices: ParkingPassPrice[];
}

export interface ReplaceParkingPassPrices {
  graceDays: number;
  prices: { vehicleTypeId: string; amount: number }[];
}

export interface ParkingPassRefund {
  id: string;
  amount: string;
  reason: string;
  refundedById: string;
  createdAt: string;
}

export interface ParkingPassPayment {
  id: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  method: string;
  destinationId: string | null;
  destinationName: string | null;
  takenById: string;
  shiftId: string | null;
  /** The PARKING_PASS bill this month was paid through. Such a month cannot be refunded here. */
  billId: string | null;
  refundedAmount: string;
  refunds: ParkingPassRefund[];
  createdAt: string;
}

/** Why an open pass bill could not be cancelled: it has payments or a submission. */
export type ParkingPassBillReviewReason = 'pass-ended' | 'month-covered' | 'auto-renew-off';

export const PARKING_PASS_BILL_REVIEW_LABELS: Record<ParkingPassBillReviewReason, string> = {
  'pass-ended': 'The pass has ended',
  'month-covered': 'That month is already paid',
  'auto-renew-off': 'Auto-renew is off',
};

/** An unpaid PARKING_PASS bill on the pass. */
export interface ParkingPassBill {
  id: string;
  amount: string;
  paidAmount: string;
  balance: string;
  dueDate: string;
  billingPeriod: string | null;
  needsReview: boolean;
  reviewReason: ParkingPassBillReviewReason | null;
}

export interface ParkingPass {
  id: string;
  plateDisplay: string;
  plateKey: string;
  holderName: string;
  holderContact: string | null;
  propertyId: string;
  propertyName: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  leaseId: string | null;
  ownershipId: string | null;
  paidUntil: string;
  graceDays: number;
  valid: boolean;
  /** Always false on a pass with no lease or ownership. */
  autoRenew: boolean;
  endedAt: string | null;
  endReason: string | null;
  payments: ParkingPassPayment[];
  /** Unpaid PARKING_PASS bills, oldest due first. */
  openBills: ParkingPassBill[];
}

export interface SellParkingPassPayload {
  propertyId: string;
  vehicleTypeId: string;
  plate: string;
  holderName?: string;
  holderContact?: string;
  leaseId?: string;
  destinationId?: string;
}

export interface RenewParkingPassPayload {
  destinationId?: string;
}
