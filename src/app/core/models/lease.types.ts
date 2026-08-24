import type { BillStatus, BillType } from './enums';
import type { ChargeLine } from './charge-item.types';

export interface LeaseResponse {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  /** null for older, hand-entered, or malformed rent charge snapshots. */
  rentCharges: ChargeLine[] | null;
  dueDay: number;
  terminatedAt: string | null;
  notes: string | null;
  unitId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaseListItem extends LeaseResponse {
  tenant: { id: string; firstName: string; lastName: string };
  unit: {
    id: string;
    unitNo: string;
    property: { id: string; name: string };
  };
}

export interface LeaseBillItem {
  id: string;
  type: BillType;
  amount: string;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
}

export interface LeaseDetail extends LeaseListItem {
  /** Ordered by dueDate descending. */
  bills: LeaseBillItem[];
}

export interface LeaseListFilters {
  page?: number;
  limit?: number;
  unitId?: string;
  tenantId?: string;
  propertyId?: string;
  /** Part of the tenant's name. */
  q?: string;
  /** true = in force now; false = past, ended or future. */
  active?: boolean;
  /** The renewal horizon in days, at most 365. */
  expiringInDays?: number;
  /** Inclusive end-date window (yyyy-MM-dd). */
  endFrom?: string;
  endTo?: string;
}
