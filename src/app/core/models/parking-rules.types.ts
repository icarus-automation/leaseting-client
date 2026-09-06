import type { ParkingRoundingMode } from './enums';

/**
 * Org-scoped gate rules. One row per organization. lostTicketFee is stored
 * but unused in v1 — plate fallback uses the duration fee.
 */
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
