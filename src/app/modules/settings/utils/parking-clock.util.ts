import type {
  CreateRatePlanPayload,
  RatePlanAmountResponse,
  RatePlanDurationTierPayload,
} from '../../../core/models/rate-plan.types';
import type { ParkingBillingBasis } from '../../../core/models/enums';
import { PARKING_BILLING_BASIS_UNIT } from '../../../core/models/enums';

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

export function clockToMinutes(value: string): number | null {
  const match = CLOCK.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatParkingWindow(startMinute: number, endMinute: number): string {
  return `${minutesToClock(startMinute)}–${minutesToClock(endMinute)}`;
}

export function pricedAmounts(
  group: Record<string, number | null>,
): { vehicleTypeId: string; amount: number }[] {
  return Object.entries(group).flatMap(([vehicleTypeId, amount]) =>
    typeof amount === 'number' ? [{ vehicleTypeId, amount }] : [],
  );
}

export function compactAmountLine(amounts: RatePlanAmountResponse[]): string {
  return amounts.map((row) => `${row.vehicleTypeName} ₱${Number(row.amount).toFixed(0)}`).join(', ');
}

export function openingBandHint(
  index: number,
  billingBasis: ParkingBillingBasis,
  planIncrement: number,
  incrementCount: number,
): string {
  const unit = PARKING_BILLING_BASIS_UNIT[billingBasis];
  const span =
    planIncrement === 1
      ? `${incrementCount} ${unit}${incrementCount === 1 ? '' : 's'}`
      : `${incrementCount} × ${planIncrement} ${unit}${planIncrement === 1 ? '' : 's'}`;
  return index === 0 ? `First ${span}` : `Next ${span}`;
}

export function toDurationTierPayloads(
  tiers: { incrementCount: number; amounts: Record<string, number | null> }[],
): RatePlanDurationTierPayload[] {
  return tiers.map((tier) => ({
    incrementCount: tier.incrementCount,
    amounts: pricedAmounts(tier.amounts),
  }));
}

export type RatePlanPayloadResult =
  | { ok: true; payload: CreateRatePlanPayload }
  | { ok: false; error: string };

export function toRatePlanPayload(args: {
  name: string;
  billingBasis: ParkingBillingBasis;
  increment: number;
  amounts: Record<string, number | null>;
  durationTiers: { incrementCount: number; amounts: Record<string, number | null> }[];
  windowEnabled: boolean;
  windowStart: string;
  windowEnd: string;
  overtimeAmounts: Record<string, number | null>;
}): RatePlanPayloadResult {
  const amounts = pricedAmounts(args.amounts);
  if (amounts.length === 0) {
    return { ok: false, error: 'Set a price for at least one vehicle type.' };
  }

  const durationTiers = toDurationTierPayloads(args.durationTiers);
  if (durationTiers.some((tier) => tier.amounts.length === 0)) {
    return { ok: false, error: 'Set a price for at least one vehicle type on each opening band.' };
  }

  if (!args.windowEnabled) {
    return {
      ok: true,
      payload: {
        name: args.name.trim(),
        billingBasis: args.billingBasis,
        increment: args.increment,
        amounts,
        durationTiers,
        windowStartMinute: null,
        windowEndMinute: null,
        overtimeAmounts: [],
      },
    };
  }

  const windowStartMinute = clockToMinutes(args.windowStart);
  const windowEndMinute = clockToMinutes(args.windowEnd);
  if (windowStartMinute === null || windowEndMinute === null) {
    return { ok: false, error: 'Enter a valid window start and end.' };
  }
  if (windowStartMinute === windowEndMinute) {
    return { ok: false, error: 'Window start and end must differ.' };
  }

  const overtimeAmounts = pricedAmounts(args.overtimeAmounts);
  if (overtimeAmounts.length === 0) {
    return { ok: false, error: 'Set an overtime price for at least one vehicle type.' };
  }

  return {
    ok: true,
    payload: {
      name: args.name.trim(),
      billingBasis: args.billingBasis,
      increment: args.increment,
      amounts,
      durationTiers,
      windowStartMinute,
      windowEndMinute,
      overtimeAmounts,
    },
  };
}
