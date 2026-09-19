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

export function billedHint(billingBasis: ParkingBillingBasis, increment: number): string {
  const unit = PARKING_BILLING_BASIS_UNIT[billingBasis];
  if (increment === 1) return `Billed per ${unit}`;
  return `Billed every ${increment} ${unit}s`;
}

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
