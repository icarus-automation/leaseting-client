// Property types are org-curated data now (see property-type.types.ts), not
// an enum — fetched from /property-types instead of hardcoded here.

export type BillType =
  | 'RENT'
  | 'ELECTRICITY'
  | 'WATER'
  | 'INTERNET'
  | 'ASSOCIATION_DUES'
  | 'OTHER';

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  RENT: 'Rent',
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  INTERNET: 'Internet',
  ASSOCIATION_DUES: 'Association Dues',
  OTHER: 'Other',
};

export const BILL_TYPE_OPTIONS = (
  Object.entries(BILL_TYPE_LABELS) as [BillType, string][]
).map(([value, label]) => ({ value, label }));

export type BillStatus = 'UNPAID' | 'PAID';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'GCASH' | 'CHECK' | 'OTHER';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank transfer',
  GCASH: 'GCash',
  CHECK: 'Check',
  OTHER: 'Other',
};

export const PAYMENT_METHOD_OPTIONS = (
  Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]
).map(([value, label]) => ({ value, label }));

export type PaymentSource = 'STAFF' | 'SUBMISSION' | 'ONBOARDING' | 'LEGACY';

export const PAYMENT_SOURCE_LABELS: Record<PaymentSource, string> = {
  STAFF: 'Staff collection',
  SUBMISSION: 'Residence Care',
  ONBOARDING: 'Onboarding',
  LEGACY: 'Legacy',
};

/** Derived occupancy — computed by the backend from active leases. */
export type UnitStatus = 'OCCUPIED' | 'VACANT';

export type ParkingBillingPeriod = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const PARKING_BILLING_PERIOD_LABELS: Record<ParkingBillingPeriod, string> = {
  HOURLY: 'Hourly',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export const PARKING_BILLING_PERIOD_OPTIONS = (
  Object.entries(PARKING_BILLING_PERIOD_LABELS) as [ParkingBillingPeriod, string][]
).map(([value, label]) => ({ value, label }));
