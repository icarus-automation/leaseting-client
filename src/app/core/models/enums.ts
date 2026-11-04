
export type BillType =
  | 'RENT'
  | 'ELECTRICITY'
  | 'WATER'
  | 'INTERNET'
  | 'ASSOCIATION_DUES'
  | 'OTHER'
  | 'PARKING_PASS';

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  RENT: 'Rent',
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  INTERNET: 'Internet',
  ASSOCIATION_DUES: 'Association Dues',
  OTHER: 'Other',
  PARKING_PASS: 'Parking Pass',
};

/** Every type, for filtering bill lists. */
export const BILL_TYPE_OPTIONS = (
  Object.entries(BILL_TYPE_LABELS) as [BillType, string][]
).map(([value, label]) => ({ value, label }));

/** Types staff raise by hand. A parking pass bill only comes from its pass, which it extends when paid. */
export const MANUAL_BILL_TYPE_OPTIONS = BILL_TYPE_OPTIONS.filter((option) => option.value !== 'PARKING_PASS');

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

export type UnitStatus = 'OCCUPIED' | 'VACANT' | 'SOLD' | 'AVAILABLE';

export type PropertyMode = 'RENTAL' | 'CONDO';

export type PricingBasis = 'FIXED' | 'PER_SQM';

export const PRICING_BASIS_LABELS: Record<PricingBasis, string> = {
  FIXED: 'Fixed',
  PER_SQM: 'Per sqm',
};

export type ParkingBillingBasis = 'PER_MINUTE' | 'PER_HOUR' | 'PER_DAY';

export const PARKING_BILLING_BASIS_LABELS: Record<ParkingBillingBasis, string> = {
  PER_MINUTE: 'Minute',
  PER_HOUR: 'Hour',
  PER_DAY: 'Day',
};

export const PARKING_BILLING_BASIS_OPTIONS = (
  Object.entries(PARKING_BILLING_BASIS_LABELS) as [ParkingBillingBasis, string][]
).map(([value, label]) => ({ value, label }));

export const PARKING_BILLING_BASIS_UNIT: Record<ParkingBillingBasis, string> = {
  PER_MINUTE: 'minute',
  PER_HOUR: 'hour',
  PER_DAY: 'day',
};

export type ParkingRoundingMode = 'CEIL' | 'NEAREST';

export const PARKING_ROUNDING_MODE_LABELS: Record<ParkingRoundingMode, string> = {
  CEIL: 'Ceil',
  NEAREST: 'Nearest',
};

export const PARKING_ROUNDING_MODE_OPTIONS = (
  Object.entries(PARKING_ROUNDING_MODE_LABELS) as [ParkingRoundingMode, string][]
).map(([value, label]) => ({ value, label }));
