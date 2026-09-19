import type { BillStatus, BillType } from './enums';

export interface TenantResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  contactNo: string;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListItem extends TenantResponse {
  outstandingBalance: string;
  unpaidBillCount: number;
  maxDaysOverdue: number;
}

export interface TenantListFilters {
  page?: number;
  limit?: number;
  q?: string;
  scope?: 'active' | 'archived' | 'all';
  propertyId?: string;
  hasBalance?: boolean;
  balanceMin?: number;
  billType?: BillType;
  overdueOnly?: boolean;
}

export interface TenantLeaseBillItem {
  id: string;
  type: BillType;
  amount: string;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
}

export interface TenantLeaseItem {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  dueDay: number;
  terminatedAt: string | null;
  unit: {
    id: string;
    unitNo: string;
    property: { id: string; name: string };
  };
  bills: TenantLeaseBillItem[];
}

export interface TenantDocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  url: string;
  createdAt: string;
}

export interface TenantDetail extends TenantResponse {
  leases: TenantLeaseItem[];
  documents: TenantDocumentItem[];
  outstandingBalance: string;
  unpaidBillCount: number;
  nextDueDate: string | null;
}

export interface CreateTenantPayload {
  firstName: string;
  lastName: string;
  email?: string;
  contactNo: string;
  notes?: string;
}

export type UpdateTenantPayload = Partial<CreateTenantPayload>;
