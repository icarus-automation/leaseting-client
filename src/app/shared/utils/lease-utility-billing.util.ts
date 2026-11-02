import type { BillType } from '../../core/models/enums';
import type { LeaseUtilityBilling } from '../../core/models/lease.types';

/** Whether Leaseting bills `type` on the lease. Charges other than electricity and water always are. */
export function leaseBillsType(lease: LeaseUtilityBilling, type: BillType): boolean {
  if (type === 'ELECTRICITY') return lease.billsElectricity;
  if (type === 'WATER') return lease.billsWater;
  return true;
}
