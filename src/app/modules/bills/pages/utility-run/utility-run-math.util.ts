
import type { UtilityTaxBasis } from '../../../../core/models/bill.types';

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
  /** What VAT and withholding are charged on. The API uses the whole charge when none is sent. */
  taxBasis: UtilityTaxBasis;
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
  const taxBase = rates.taxBasis === 'ADMIN_FEE' ? adminFee : round2(subtotal + adminFee);
  const vat = round2(taxBase * (rates.vatPct / 100));
  const wht = round2(taxBase * (rates.whtPct / 100));
  return { consumed, subtotal, adminFee, vat, wht, netDue: round2(subtotal + adminFee + vat - wht) };
}

export type UtilityRowWarning = 'Lower than previous' | 'No previous reading' | 'Set a rate first';

/** Whether a row can be billed, and if not, the one thing it still needs. */
export type UtilityRowState =
  | { state: 'ready'; math: UtilityRowMath }
  | { state: 'needs-reading' }
  | { state: 'warning'; warning: UtilityRowWarning };

/**
 * A row with no present reading just needs one. A row with a present reading
 * names what stops it: the previous reading first, then the rate.
 */
export function utilityRowState(
  previousReading: number | null,
  presentReading: number | null,
  rates: UtilityRates | null,
): UtilityRowState {
  if (presentReading == null) return { state: 'needs-reading' };
  if (previousReading == null) return { state: 'warning', warning: 'No previous reading' };
  if (presentReading < previousReading) return { state: 'warning', warning: 'Lower than previous' };
  if (rates == null || rates.ratePerUnit <= 0) return { state: 'warning', warning: 'Set a rate first' };
  const math = computeRow(previousReading, presentReading, rates);
  return math ? { state: 'ready', math } : { state: 'warning', warning: 'Set a rate first' };
}

/** Units used, once both readings are in and the meter went up. */
export function consumedReading(previousReading: number | null, presentReading: number | null): number | null {
  if (previousReading == null || presentReading == null || presentReading < previousReading) return null;
  return round2(presentReading - previousReading);
}
