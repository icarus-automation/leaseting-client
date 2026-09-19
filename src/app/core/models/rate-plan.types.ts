import { ParkingBillingBasis } from './enums';

export interface RatePlanAmountResponse {
  vehicleTypeId: string;
  vehicleTypeName: string;
  vehicleTypeIsArchived: boolean;
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
