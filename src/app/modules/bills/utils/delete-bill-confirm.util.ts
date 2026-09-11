import { format } from 'date-fns';

import type { BillListItem } from '../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../core/models/enums';
import { formatPhp } from '../../../shared/pipes/php-currency-pipe';

/** Names the unpaid bill and states that delete cannot be undone. */
export function deleteBillConfirmMessage(bill: BillListItem): string {
  const tenant = `${bill.lease.tenant.firstName} ${bill.lease.tenant.lastName}`;
  const type = BILL_TYPE_LABELS[bill.type];
  const due = format(new Date(`${bill.dueDate}T00:00:00`), 'MMM d, yyyy');
  return `Delete the unpaid ${type} bill of ${formatPhp(bill.amount)} for ${tenant} on Unit ${bill.lease.unit.unitNo}, due ${due}? This cannot be undone.`;
}
