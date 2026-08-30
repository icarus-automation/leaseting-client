import type { BillListItem } from '../../../core/models/bill.types';
import type { UnitDetail, UnitOutstandingBill } from '../../../core/models/property.types';

/** Enough of a bill list row for the Record Payment dialog to open from the unit panel. */
export function billFromUnit(unit: UnitDetail, bill: UnitOutstandingBill): BillListItem | null {
  const lease = unit.activeLease;
  if (!lease) return null;
  return {
    id: bill.id,
    type: bill.type,
    amount: bill.amount,
    dueDate: bill.dueDate,
    status: 'UNPAID',
    paidAt: null,
    notes: null,
    leaseId: lease.id,
    createdAt: '',
    updatedAt: '',
    utilityDetail: null,
    paidAmount: '0',
    balance: bill.amount,
    lease: {
      id: lease.id,
      tenant: {
        id: lease.tenant.id,
        firstName: lease.tenant.firstName,
        lastName: lease.tenant.lastName,
      },
      unit: {
        id: unit.id,
        unitNo: unit.unitNo,
        property: { id: unit.propertyId, name: '' },
      },
    },
  };
}
