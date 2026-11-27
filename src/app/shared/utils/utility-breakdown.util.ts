import type { UtilityDetail, UtilityTaxBasis } from '../../core/models/bill.types';

/** One line of a utility bill. Withholding is negative: it comes off the total. */
export interface UtilityChargeLine {
  label: string;
  amount: number;
  isTotal: boolean;
}

/** A utility bill's amounts. Rates are fractions, such as 0.12 for 12%. */
export interface UtilityChargeAmounts {
  subtotal: number;
  adminFee: number;
  vat: number;
  vatRate: number;
  wht: number;
  whtRate: number;
  total: number;
}

export const UTILITY_TAX_BASIS_LABELS: Record<UtilityTaxBasis, string> = {
  WHOLE_CHARGE: 'Whole charge',
  ADMIN_FEE: 'Admin fee only',
};

/**
 * The lines every bill view shows, in order: Subtotal, Admin fee, VAT,
 * Withholding, then Total. Lines that come to zero are left out; Total always shows.
 */
export function utilityChargeLines(amounts: UtilityChargeAmounts): UtilityChargeLine[] {
  const lines = [
    { label: 'Subtotal', amount: amounts.subtotal },
    { label: 'Admin fee', amount: amounts.adminFee },
    { label: `VAT (${percentLabel(amounts.vatRate)})`, amount: amounts.vat },
    { label: `Withholding (${percentLabel(amounts.whtRate)})`, amount: -amounts.wht },
  ];
  return [
    ...lines.filter((line) => line.amount !== 0).map((line) => ({ ...line, isTotal: false })),
    { label: 'Total', amount: amounts.total, isTotal: true },
  ];
}

/** A stored bill's amounts, or null for a bill the API sent without them. */
export function storedUtilityAmounts(detail: UtilityDetail | null, total: string): UtilityChargeAmounts | null {
  if (!detail || detail.subtotal == null) return null;
  return {
    subtotal: Number(detail.subtotal),
    adminFee: Number(detail.adminFee ?? 0),
    vat: Number(detail.vat ?? 0),
    vatRate: Number(detail.vatRate),
    wht: Number(detail.wht ?? 0),
    whtRate: Number(detail.whtRate),
    total: Number(total),
  };
}

/** A fraction as a short percent: 0.12 is "12%", 0.125 is "12.5%". */
export function percentLabel(rate: number | string): string {
  const value = Number(rate) * 100;
  return Number.isFinite(value) ? `${Number(value.toFixed(2))}%` : `${rate}`;
}
