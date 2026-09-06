import { ParkingBillingBasis } from './enums';

/**
 * Org-curated parking rate board. Each plan has a billing basis, an increment
 * of that basis, and one amount per vehicle type. A missing amount means that
 * type is not offered on the plan. Archived plans leave the picker; history
 * is untouched.
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
  billingBasis: ParkingBillingBasis;
  increment: number;
  /** Derived: basis unit minutes × increment. Terminal fee math uses this. */
  incrementMinutes: number;
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
  billingBasis: ParkingBillingBasis;
  increment: number;
  amounts: RatePlanAmountPayload[];
}

export type UpdateRatePlanPayload = Partial<CreateRatePlanPayload>;
