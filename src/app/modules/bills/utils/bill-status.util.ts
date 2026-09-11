import type { BillResponse } from '../../../core/models/bill.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';
import { isPastDue } from '../../../shared/utils/date.util';

export function billIsOverdue(bill: Pick<BillResponse, 'status' | 'dueDate'>): boolean {
  return bill.status !== 'PAID' && isPastDue(bill.dueDate);
}

/** Paid → Overdue → Partial → Unpaid. Partial is unpaid with any recorded amount. */
export function billStatusBadge(
  bill: Pick<BillResponse, 'status' | 'dueDate' | 'paidAmount'>,
): { label: string; tone: BadgeTone } {
  if (bill.status === 'PAID') return { label: 'Paid', tone: 'success' };
  if (billIsOverdue(bill)) return { label: 'Overdue', tone: 'destructive' };
  return Number(bill.paidAmount) > 0
    ? { label: 'Partial', tone: 'vacant' }
    : { label: 'Unpaid', tone: 'warning' };
}
