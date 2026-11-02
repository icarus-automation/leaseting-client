import type { BillStatus, BillType } from './enums';

export interface ResidentResponse {
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

export interface ResidentListItem extends ResidentResponse {
  outstandingBalance: string;
  unpaidBillCount: number;
  maxDaysOverdue: number;
}

export interface ResidentListFilters {
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

export interface ResidentLeaseBillItem {
  id: string;
  type: BillType;
  amount: string;
  dueDate: string;
  status: BillStatus;
  paidAt: string | null;
}

export interface ResidentLeaseItem {
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
  bills: ResidentLeaseBillItem[];
}

export interface ResidentDocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  label: string | null;
  url: string;
  createdAt: string;
}

export interface ResidentOwnershipItem {
  id: string;
  startDate: string;
  endDate: string | null;
  price: string | null;
  unit: {
    id: string;
    unitNo: string;
    property: { id: string; name: string };
  };
}

export interface ResidentDetail extends ResidentResponse {
  leases: ResidentLeaseItem[];
  ownerships: ResidentOwnershipItem[];
  documents: ResidentDocumentItem[];
  outstandingBalance: string;
  unpaidBillCount: number;
  nextDueDate: string | null;
}

export interface CreateResidentPayload {
  firstName: string;
  lastName: string;
  email?: string;
  contactNo: string;
  notes?: string;
}

export type UpdateResidentPayload = Partial<CreateResidentPayload>;
