import type { PaymentResponse } from '../../../core/models/bill.types';
import { paymentMethodLabel } from '../../../core/models/enums';

/**
 * How a payment was received, as history shows it: "Online · BDO Savings",
 * "Check · BPI · No. 004512", or "Cash".
 */
export function paymentMethodSummary(
  payment: Pick<PaymentResponse, 'method' | 'destination' | 'checkBank' | 'checkNumber'>,
): string {
  const parts = [paymentMethodLabel(payment.method)];
  if (payment.destination) parts.push(payment.destination.displayName);
  if (payment.method === 'CHECK') {
    if (payment.checkBank) parts.push(payment.checkBank);
    if (payment.checkNumber) parts.push(`No. ${payment.checkNumber}`);
  }
  return parts.join(' · ');
}

/**
 * Fills the destination and check fields an API that is not deployed yet leaves out.
 * The client deploys before the API, so bill payments can arrive in the old shape.
 */
export function withPaymentDefaults(payment: PaymentResponse): PaymentResponse {
  return {
    ...payment,
    destinationId: payment.destinationId ?? null,
    destination: payment.destination ?? null,
    checkNumber: payment.checkNumber ?? null,
    checkBank: payment.checkBank ?? null,
    checkDate: payment.checkDate ?? null,
  };
}
