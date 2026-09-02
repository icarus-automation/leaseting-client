import type { ParkingBillingPeriod } from './enums';

/**
 * Org-curated parking rate board. Each plan has a billing period and one
 * amount per vehicle type. A missing amount means that type is not offered
 * on the plan. Archived plans leave the picker; history is untouched.
 */
export interface RatePlanAmountResponse {
  vehicleTypeId: string;
  vehicleTypeName: string;
  vehicleTypeIsArchived: boolean;
  /** Prisma Decimal — serialized as a string. */
  amount: string;
}

export interface RatePlanResponse {
  id: string;
  name: string;
  billingPeriod: ParkingBillingPeriod;
  isArchived: boolean;
  amounts: RatePlanAmountResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface RatePlanAmountPayload {
  vehicleTypeId: string;
  amount: number;
}

export interface CreateRatePlanPayload {
  name: string;
  billingPeriod: ParkingBillingPeriod;
  amounts: RatePlanAmountPayload[];
}

export type UpdateRatePlanPayload = Partial<CreateRatePlanPayload>;
