import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';
import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';
import type { ParkingPass, ParkingPassPayment } from '../../../core/models/parking-pass.types';
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
