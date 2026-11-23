import { BILL_TYPE_LABELS, type BillType } from '../../core/models/enums';

/** The parts of any bill shape that say what it is for. */
export interface NamedBill {
  type: BillType;
  chargeName?: string | null;
  label?: string;
}

/**
 * What a bill is for: its charge's name (Key Deposit, Late fee, a parking pass) when it
 * has one, otherwise its type. An older API sends neither, so the type is the fallback.
 */
export function billName(bill: NamedBill): string {
  return bill.label || bill.chargeName || BILL_TYPE_LABELS[bill.type];
}
