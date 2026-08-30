import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  BillDetail,
  BillListFilters,
  BillListItem,
  BillResponse,
  BillsSummary,
  CreateBillPayload,
  CreateUtilityRunPayload,
  PaymentResponse,
  ReceiptScanResult,
  RecordPaymentPayload,
  UtilityRunPreviewRow,
  UtilityRunResult,
} from '../../../core/models/bill.types';
import type { BillType } from '../../../core/models/enums';
import type { ManualReminderResult } from '../../../core/models/report.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class BillsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/bills`;

  list(filters: BillListFilters = {}): Observable<Paginated<BillListItem>> {
    const params = toHttpParams({ page: 1, limit: 10, ...filters });
    return this.http.get<Paginated<BillListItem>>(this.base, { params });
  }

  /** Open-bill counts and outstanding totals for the summary cards. */
  summary(): Observable<BillsSummary> {
    return this.http.get<BillsSummary>(`${this.base}/summary`);
  }

  /** Manually triggers the idempotent rent-bill generation for this org. */
  rentRun(): Observable<{ created: number; skipped: number }> {
    return this.http.post<{ created: number; skipped: number }>(`${this.base}/rent-run`, {});
  }

  /** Active leases of a property with carried-over meter readings. */
  utilityRunPreview(propertyId: string, type: BillType): Observable<UtilityRunPreviewRow[]> {
    const params = new HttpParams().set('propertyId', propertyId).set('type', type);
    return this.http.get<UtilityRunPreviewRow[]>(`${this.base}/utility-run/preview`, { params });
  }

  /** Creates one utility bill per row in a single transaction. */
  createUtilityRun(payload: CreateUtilityRunPayload): Observable<UtilityRunResult> {
    return this.http.post<UtilityRunResult>(`${this.base}/utility-run`, payload);
  }

  /** OCRs a Meralco/Maynilad bill photo into prefill values (501 when off). */
  scanReceipt(image: File): Observable<ReceiptScanResult> {
    const form = new FormData();
    form.append('image', image, image.name);
    return this.http.post<ReceiptScanResult>(`${this.base}/receipt-scan`, form);
  }

  get(id: string): Observable<BillDetail> {
    return this.http.get<BillDetail>(`${this.base}/${id}`);
  }

  create(leaseId: string, payload: CreateBillPayload): Observable<BillListItem> {
    return this.http.post<BillListItem>(`${API_BASE_URL}/leases/${leaseId}/bills`, payload);
  }

  getPaymentProof(paymentId: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/payments/${paymentId}/proof`, { responseType: 'blob' });
  }

  /**
   * Text this bill's tenant now, outside the nightly reminder ladder. Costs a
   * real SMS credit and reaches a real person — confirm before calling.
   */
  remind(id: string): Observable<ManualReminderResult> {
    return this.http.post<ManualReminderResult>(`${this.base}/${id}/remind`, {});
  }

  recordPayment(
    billId: string,
    payload: RecordPaymentPayload,
    receipt: File | null,
  ): Observable<PaymentResponse> {
    const form = new FormData();
    form.append('amount', String(payload.amount));
    form.append('paidOn', payload.paidOn);
    form.append('method', payload.method);
    if (payload.referenceNo) form.append('referenceNo', payload.referenceNo);
    form.append('notes', payload.notes);
    if (receipt) form.append('receipt', receipt, receipt.name);
    return this.http.post<PaymentResponse>(`${this.base}/${billId}/payments`, form);
  }

  paymentsFor(billId: string): Observable<PaymentResponse[]> {
    return this.http.get<PaymentResponse[]>(`${this.base}/${billId}/payments`);
  }

  /** Voids a confirmed payment. History stays; the bill reopens if needed. */
  voidPayment(paymentId: string, reason: string): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${API_BASE_URL}/payments/${paymentId}/void`, { reason });
  }

  /** Only UNPAID bills without recorded payments can be deleted — 409 otherwise. */
  delete(id: string): Observable<BillResponse> {
    return this.http.delete<BillResponse>(`${this.base}/${id}`);
  }
}
