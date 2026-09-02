import type { ParkingBillingPeriod } from '../../../core/models/enums';

/**
 * Display order for parking rate plans, mirroring the backend: live rows
 * first, then by how a stay lengthens, then name. Used when a row is
 * inserted client-side after a create or edit.
 */
const BILLING_PERIOD_ORDER: Record<ParkingBillingPeriod, number> = {
  HOURLY: 0,
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY: 3,
};

export function sortRatePlans<
  T extends { name: string; billingPeriod: ParkingBillingPeriod; isArchived: boolean },
>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      Number(a.isArchived) - Number(b.isArchived) ||
      BILLING_PERIOD_ORDER[a.billingPeriod] - BILLING_PERIOD_ORDER[b.billingPeriod] ||
      a.name.localeCompare(b.name),
  );
}
