import type { BillListItem } from '../../../core/models/bill.types';

export function queriedBillToOpen(
  bills: BillListItem[],
  billId: string | null,
  consumedQueryBillId: string | null,
): BillListItem | null {
  if (!billId || consumedQueryBillId === billId) return null;
  return bills.find((bill) => bill.id === billId) ?? null;
}
