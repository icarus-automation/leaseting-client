import type { BillStatus, BillType, PricingBasis } from './enums';
import type { ChargeLine } from './charge-item.types';

export interface LeaseRentSnapshot {
  rentPricingBasis: PricingBasis;
  rentFloorAreaSqm: number | null;
  rentRatePerSqm: number | null;
}

export interface LeaseResponse extends LeaseRentSnapshot {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
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
  bills: LeaseBillItem[];
}

export interface LeaseListFilters {
  page?: number;
  limit?: number;
  unitId?: string;
  tenantId?: string;
  propertyId?: string;
  q?: string;
  active?: boolean;
  expiringInDays?: number;
  endFrom?: string;
  endTo?: string;
}
