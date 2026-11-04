import { apiErrorCode, apiErrorMessage } from '../../../core/models/api.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';
import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';
import {
  PARKING_PASS_BILL_REVIEW_LABELS,
  type ParkingPass,
  type ParkingPassBill,
  type ParkingPassBillReviewReason,
  type ParkingPassPayment,
} from '../../../core/models/parking-pass.types';
import { effectiveDestinationsForProperty } from '../../bills/utils/staff-collection-methods.util';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A `YYYY-MM-DD` date, shown without shifting it across a timezone. */
export function formatPassDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  const monthIndex = Number(month) - 1;
  const label = MONTHS[monthIndex];
  if (!year || !label || !day) return iso;
  return `${label} ${Number(day)}, ${year}`;
}

export function paymentRemainingCents(payment: Pick<ParkingPassPayment, 'amount' | 'refundedAmount'>): number {
  return Math.round(Number(payment.amount) * 100) - Math.round(Number(payment.refundedAmount) * 100);
}

/**
 * Fills the billing fields an API from before parking pass billing leaves out, so the
 * page keeps working while the client is deployed ahead of the API.
 */
export function withBillingDefaults(pass: ParkingPass): ParkingPass {
  return {
    ...pass,
    autoRenew: pass.autoRenew ?? false,
    openBills: pass.openBills ?? [],
    payments: pass.payments.map((payment) => ({ ...payment, billId: payment.billId ?? null })),
  };
}

export const BILL_PAID_REFUND_UNSUPPORTED = 'BILL_PAID_REFUND_UNSUPPORTED';

export const BILL_PAID_REFUND_MESSAGE = "This month was paid through a bill. Bill refunds aren't supported yet.";

/** Months with money left on them, including months paid through a bill, which cannot be refunded yet. */
export function paymentsWithRemainder(pass: Pick<ParkingPass, 'payments'>): ParkingPassPayment[] {
  return pass.payments.filter((payment) => paymentRemainingCents(payment) > 0);
}

/** A month paid through its bill holds its money on the bill, so it cannot be refunded on the pass. */
export function refundablePayments(pass: Pick<ParkingPass, 'payments'>): ParkingPassPayment[] {
  return paymentsWithRemainder(pass).filter((payment) => payment.billId === null);
}

/** The API's own words for a bill-paid month, instead of a generic failure. */
export function refundErrorMessage(error: unknown): string {
  if (apiErrorCode(error) === BILL_PAID_REFUND_UNSUPPORTED) return BILL_PAID_REFUND_MESSAGE;
  return apiErrorMessage(error, 'Could not refund the payment.');
}

export function isLinked(pass: Pick<ParkingPass, 'leaseId' | 'ownershipId'>): boolean {
  return pass.leaseId !== null || pass.ownershipId !== null;
}

/** The bill for the pass's next month, when one is waiting and needs no review. */
export function waitingBill(pass: Pick<ParkingPass, 'openBills'>): ParkingPassBill | null {
  return pass.openBills.find((bill) => !bill.needsReview) ?? null;
}

/** With auto-renew off, an admin can still raise the next month's bill on an open linked pass. */
export function canBillByHand(pass: Pick<ParkingPass, 'leaseId' | 'ownershipId' | 'endedAt' | 'autoRenew' | 'openBills'>): boolean {
  return isLinked(pass) && pass.endedAt === null && !pass.autoRenew && waitingBill(pass) === null;
}

export function reviewReasonLabel(reason: ParkingPassBillReviewReason | null): string {
  return reason ? PARKING_PASS_BILL_REVIEW_LABELS[reason] : '';
}

export function passStatus(pass: Pick<ParkingPass, 'valid' | 'endedAt'>): { tone: BadgeTone; label: string } {
  if (pass.endedAt) return { tone: 'neutral', label: 'Ended' };
  if (pass.valid) return { tone: 'success', label: 'Valid' };
  return { tone: 'warning', label: 'Lapsed' };
}

/** Cash, then each destination the property would offer on a bill. */
export function passPaymentOptions(
  destinations: PaymentDestinationResponse[],
  propertyId: string,
): { value: string; label: string }[] {
  const rows = effectiveDestinationsForProperty(destinations, propertyId);
  return [{ value: 'cash', label: 'Cash' }, ...rows.map((row) => ({ value: row.id, label: row.displayName }))];
}

export function destinationIdFromPayment(value: string): string | undefined {
  return value === 'cash' ? undefined : value;
}
