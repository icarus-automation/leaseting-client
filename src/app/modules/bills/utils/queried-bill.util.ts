import type { BillListItem } from '../../../core/models/bill.types';

/** `?billId=` should open that row's bill once, not after every reload. */
export function queriedBillToOpen(
  bills: BillListItem[],
  billId: string | null,
  alreadyOpenedId: string | null,
): BillListItem | null {
  if (!billId || alreadyOpenedId === billId) return null;
  return bills.find((bill) => bill.id === billId) ?? null;
}
