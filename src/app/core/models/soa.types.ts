export type SoaSmsStatus = 'NOT_SENT' | 'SENT' | 'FAILED';

export interface SoaResponse {
  id: string;
  soaNo: string;
  /** ISO date — the day the statement was generated. */
  statementDate: string;
  totalDue: string;
  smsStatus: SoaSmsStatus;
  leaseId: string;
  createdAt: string;
  lease: {
    id: string;
    tenant: { id: string; firstName: string; lastName: string };
    unit: { id: string; unitNo: string; property: { id: string; name: string } };
  };
}

export interface GenerateSoaPayload {
  billIds: string[];
  sendSms?: boolean;
}

export interface SoaListFilters {
  page?: number;
  limit?: number;
  leaseId?: string;
  tenantId?: string;
}
