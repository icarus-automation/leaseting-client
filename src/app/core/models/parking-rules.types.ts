import type { ParkingRoundingMode } from './enums';

export interface ParkingRulesResponse {
  id: string;
  graceMinutes: number;
  roundingMode: ParkingRoundingMode;
  defaultTransientRatePlanId: string | null;
  lostTicketFee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateParkingRulesPayload {
  graceMinutes: number;
  roundingMode: ParkingRoundingMode;
  defaultTransientRatePlanId: string;
}
