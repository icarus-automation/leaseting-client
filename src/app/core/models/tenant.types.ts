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

/**
 * A tenant as the grid renders them: the record, plus what they owe now.
 *
 * The balance rides on the list because it is the one thing every list of
 * tenants gets read for, and because the filters that narrow this grid ("owes
 * more than ₱1,000") have to agree with the number printed beside them.
 */
export interface TenantListItem extends TenantResponse {
  /** Prisma Decimal — serialized as a string. */
  outstandingBalance: string;
  unpaidBillCount: number;
  /** Days past due on the oldest open bill; 0 when nothing is late. */
  maxDaysOverdue: number;
}

/** Everything the tenants grid can be narrowed by. */
export interface TenantListFilters {
  page?: number;
  limit?: number;
  /** Part of a first or last name. */
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
