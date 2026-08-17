import type { BillStatus, BillType } from './enums';

export interface TenantResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  contactNo: string;
  /** Absolute R2 URL, or null when no photo was uploaded. */
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
  /** Ordered by dueDate descending. */
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
  /** Ordered by startDate descending. */
  leases: TenantLeaseItem[];
  /** Ordered by createdAt descending. */
  documents: TenantDocumentItem[];
  /** Prisma Decimal — serialized as a string. */
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
