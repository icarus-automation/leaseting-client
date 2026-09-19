
export interface UtilityRowMath {
  consumed: number;
  subtotal: number;
  adminFee: number;
  vat: number;
  wht: number;
  netDue: number;
}

export interface UtilityRates {
  ratePerUnit: number;
  adminFeePct: number;
  vatPct: number;
  whtPct: number;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function deriveRate(totalBillAmount: number, totalConsumption: number): number | null {
  if (totalBillAmount <= 0 || totalConsumption <= 0) return null;
  return round4(totalBillAmount / totalConsumption);
}

export function computeRow(
  previousReading: number,
  presentReading: number,
  rates: UtilityRates,
): UtilityRowMath | null {
  if (presentReading < previousReading || rates.ratePerUnit <= 0) return null;
  const consumed = presentReading - previousReading;
  const subtotal = round2(consumed * rates.ratePerUnit);
  const adminFee = round2(subtotal * (rates.adminFeePct / 100));
  const vat = round2(subtotal * (rates.vatPct / 100));
  const wht = round2(subtotal * (rates.whtPct / 100));
  return { consumed, subtotal, adminFee, vat, wht, netDue: round2(subtotal + adminFee + vat - wht) };
}
