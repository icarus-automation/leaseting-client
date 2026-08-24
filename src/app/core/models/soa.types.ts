export type SoaSmsStatus = 'NOT_SENT' | 'SENT' | 'FAILED';

export interface SoaUtilityLine {
  kind: 'utility';
  label: string;
  coveredPeriod: string;
  previousReading: string;
  presentReading: string;
  consumed: string;
  multiplier: string;
  total: string;
  adminFeeRate: string;
  adminFee: string;
  vatRate: string;
  vat: string;
  whtRate: string;
  wht: string;
  netDue: string;
}

export interface SoaFlatLine {
  kind: 'flat';
  label: string;
  description: string;
  dueDate: string;
  netDue: string;
  /** Absent on non-rent lines and statements generated before itemisation. */
  breakdown?: { label: string; amount: string }[];
}

export type SoaLine = SoaUtilityLine | SoaFlatLine;

export interface SoaResponse {
  id: string;
  soaNo: string;
  /** ISO date — the day the statement was generated. */
  statementDate: string;
  totalDue: string;
  smsStatus: SoaSmsStatus;
  leaseId: string;
  createdAt: string;
  /** Frozen at generation time; historical lines simply lack `breakdown`. */
  lines: SoaLine[];
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
