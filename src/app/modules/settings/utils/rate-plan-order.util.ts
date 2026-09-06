import type { ParkingBillingBasis } from '../../../core/models/enums';
import { PARKING_BILLING_BASIS_UNIT } from '../../../core/models/enums';

const BILLING_BASIS_MINUTES: Record<ParkingBillingBasis, number> = {
  PER_MINUTE: 1,
  PER_HOUR: 60,
  PER_DAY: 1440,
};

export function ratePlanIncrementMinutes(
  billingBasis: ParkingBillingBasis,
  increment: number,
): number {
  return BILLING_BASIS_MINUTES[billingBasis] * increment;
}

/** "Billed per hour" / "Billed every 7 days". */
export function billedHint(billingBasis: ParkingBillingBasis, increment: number): string {
  const unit = PARKING_BILLING_BASIS_UNIT[billingBasis];
  if (increment === 1) return `Billed per ${unit}`;
  return `Billed every ${increment} ${unit}s`;
}

/**
 * Display order for parking rate plans, mirroring the backend: live rows
 * first, then by how long one billed slice is, then name. Used when a row is
 * inserted client-side after a create or edit.
 */
export function sortRatePlans<
  T extends {
    name: string;
    billingBasis: ParkingBillingBasis;
    increment: number;
    isArchived: boolean;
  },
>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.isArchived) - Number(b.isArchived) ||
      ratePlanIncrementMinutes(a.billingBasis, a.increment) -
        ratePlanIncrementMinutes(b.billingBasis, b.increment) ||
      a.name.localeCompare(b.name),
  );
}
