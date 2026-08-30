import type { BillStatus, BillType } from './enums';
import type { PaymentResponse } from './bill.types';

export type PaymentSubmissionStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface PaymentSubmissionResponse {
  id: string;
  status: PaymentSubmissionStatus;
  amount: string;
  paidOn: string;
  referenceNo: string | null;
  tenantNote: string | null;
  destinationName: string;
  accountName: string;
  accountNumber: string;
  destinationId: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  cancelledAt: string | null;
  billId: string;
  leaseId: string;
  tenantId: string;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: { id: string; firstName: string; lastName: string };
  bill?: {
    id: string;
    type: BillType;
    amount: string;
    dueDate: string;
    status: BillStatus;
    lease: {
      unit: { unitNo: string; property: { id: string; name: string } };
    };
  };
  payment?: PaymentResponse | null;
}

export interface PaymentSubmissionFilters {
  page?: number;
  limit?: number;
  status?: PaymentSubmissionStatus;
  tenantId?: string;
  billId?: string;
  propertyId?: string;
}
