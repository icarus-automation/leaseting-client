import { format } from 'date-fns';

import type { BillListItem } from '../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../core/models/enums';
import { formatPhp } from '../../../shared/pipes/php-currency-pipe';
import { parseApiDate } from '../../../shared/utils/date.util';
import { billSourceOf } from '../../../shared/utils/bill-source.util';

export function deleteBillConfirmMessage(bill: BillListItem): string {
  const source = billSourceOf(bill);
  const resident = `${source.resident.firstName} ${source.resident.lastName}`;
  const type = BILL_TYPE_LABELS[bill.type];
  const due = format(parseApiDate(bill.dueDate), 'MMM d, yyyy');
  return `Delete the unpaid ${type} bill of ${formatPhp(bill.amount)} for ${resident} on Unit ${source.unit.unitNo}, due ${due}? This cannot be undone.`;
}
