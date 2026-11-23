import type { BillListItem } from '../../../core/models/bill.types';
import { billName } from '../../../shared/utils/bill-name.util';
import type { UnitDetail, UnitOutstandingBill } from '../../../core/models/property.types';

export function billFromUnit(unit: UnitDetail, bill: UnitOutstandingBill): BillListItem | null {
  const lease = unit.activeLease;
  const ownership = unit.currentOwnership;
  if (!lease && !ownership) return null;
  const resident = lease?.resident ?? ownership!.resident;
  const source = {
    id: lease?.id ?? ownership!.id,
    resident: {
      id: resident.id,
      firstName: resident.firstName,
      lastName: resident.lastName,
    },
    unit: {
      id: unit.id,
      unitNo: unit.unitNo,
      property: { id: unit.propertyId, name: '' },
    },
  };
  return {
    id: bill.id,
    type: bill.type,
    amount: bill.amount,
    dueDate: bill.dueDate,
    status: 'UNPAID',
    paidAt: null,
    notes: null,
    leaseId: lease?.id ?? null,
    ...(ownership ? { ownershipId: ownership.id } : {}),
    createdAt: '',
    updatedAt: '',
    utilityDetail: null,
    chargeName: bill.chargeName ?? null,
    label: billName(bill),
    paidAmount: '0',
    balance: bill.amount,
    lease: lease ? source : null,
    ...(ownership ? { ownership: source } : {}),
  };
}
