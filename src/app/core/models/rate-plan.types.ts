import { ParkingBillingBasis } from './enums';

/**
 * Org-curated parking rate board. Each plan has a billing basis, an increment
 * of that basis, succeeding amounts per vehicle type, optional opening
 * duration tiers (flat bands), and an optional clock window with overtime
 * ₱/hour. A missing succeeding amount means that type is not offered.
 * Archived plans leave the picker; history is untouched.
 */
export interface RatePlanAmountResponse {
  vehicleTypeId: string;
  vehicleTypeName: string;
  vehicleTypeIsArchived: boolean;
  /** Prisma Decimal — serialized as a string. */
  amount: string;
}

export interface RatePlanDurationTierResponse {
  incrementCount: number;
  amounts: RatePlanAmountResponse[];
}

export interface RatePlanResponse {
  id: string;
  name: string;
  billingBasis: ParkingBillingBasis;
  increment: number;
  /** Derived: basis unit minutes × increment. Terminal fee math uses this. */
  incrementMinutes: number;
  windowStartMinute: number | null;
  windowEndMinute: number | null;
  isArchived: boolean;
  amounts: RatePlanAmountResponse[];
  durationTiers: RatePlanDurationTierResponse[];
  overtimeAmounts: RatePlanAmountResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RatePlanAmountPayload {
  vehicleTypeId: string;
  amount: number;
}

export interface RatePlanDurationTierPayload {
  incrementCount: number;
  amounts: RatePlanAmountPayload[];
}

export interface CreateRatePlanPayload {
  name: string;
  billingBasis: ParkingBillingBasis;
  increment: number;
  amounts: RatePlanAmountPayload[];
  durationTiers: RatePlanDurationTierPayload[];
  windowStartMinute: number | null;
  windowEndMinute: number | null;
  overtimeAmounts: RatePlanAmountPayload[];
}

export type UpdateRatePlanPayload = Partial<CreateRatePlanPayload>;
