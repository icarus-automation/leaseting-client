import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import { SKIP_CACHE_HEADER } from '../../../core/http/cache.interceptor';
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
import { appendPaymentMethod } from '../../../shared/ui/payment-method-fields/payment-method-form';
import { toHttpParams } from '../../../shared/utils/http-params.util';
import { withPaymentDefaults } from '../utils/payment-method-display.util';

@Injectable({ providedIn: 'root' })
export class BillsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/bills`;

  list(filters: BillListFilters = {}): Observable<Paginated<BillListItem>> {
    const params = toHttpParams({ page: 1, limit: 10, ...filters });
    return this.http.get<Paginated<BillListItem>>(this.base, { params });
  }

  summary(): Observable<BillsSummary> {
    return this.http.get<BillsSummary>(`${this.base}/summary`);
  }

  /**
   * How many bills `rentRun` would create now. Creates nothing. Never cached:
   * the confirm shows the count at the moment someone decides to run.
   */
  rentRunPreview(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/rent-run/preview`, {
      headers: { [SKIP_CACHE_HEADER]: 'true' },
    });
  }

  /** How many bills `duesRun` would create now. Creates nothing, never cached. */
  duesRunPreview(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/dues-run/preview`, {
      headers: { [SKIP_CACHE_HEADER]: 'true' },
    });
  }

  rentRun(): Observable<{ created: number; skipped: number }> {
    return this.http.post<{ created: number; skipped: number }>(`${this.base}/rent-run`, {});
  }

  duesRun(): Observable<{ created: number; skipped: number }> {
    return this.http.post<{ created: number; skipped: number }>(`${this.base}/dues-run`, {});
  }

  utilityRunPreview(propertyId: string, type: BillType): Observable<UtilityRunPreviewRow[]> {
    const params = new HttpParams().set('propertyId', propertyId).set('type', type);
    return this.http.get<UtilityRunPreviewRow[]>(`${this.base}/utility-run/preview`, { params });
  }

  createUtilityRun(payload: CreateUtilityRunPayload): Observable<UtilityRunResult> {
    return this.http.post<UtilityRunResult>(`${this.base}/utility-run`, payload);
  }

  scanReceipt(image: File): Observable<ReceiptScanResult> {
    const form = new FormData();
    form.append('image', image, image.name);
    return this.http.post<ReceiptScanResult>(`${this.base}/receipt-scan`, form);
  }

  get(id: string): Observable<BillDetail> {
    return this.http
      .get<BillDetail>(`${this.base}/${id}`)
      .pipe(map((detail) => ({ ...detail, payments: detail.payments.map(withPaymentDefaults) })));
  }

  create(leaseId: string, payload: CreateBillPayload): Observable<BillListItem> {
    return this.http.post<BillListItem>(`${API_BASE_URL}/leases/${leaseId}/bills`, payload);
  }

  getPaymentProof(paymentId: string): Observable<Blob> {
    return this.http.get(`${API_BASE_URL}/payments/${paymentId}/proof`, { responseType: 'blob' });
  }

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
    appendPaymentMethod(form, payload);
    if (payload.referenceNo) form.append('referenceNo', payload.referenceNo);
    form.append('notes', payload.notes);
    if (receipt) form.append('receipt', receipt, receipt.name);
    return this.http.post<PaymentResponse>(`${this.base}/${billId}/payments`, form).pipe(map(withPaymentDefaults));
  }

  paymentsFor(billId: string): Observable<PaymentResponse[]> {
    return this.http
      .get<PaymentResponse[]>(`${this.base}/${billId}/payments`)
      .pipe(map((payments) => payments.map(withPaymentDefaults)));
  }

  voidPayment(paymentId: string, reason: string): Observable<PaymentResponse> {
    return this.http
      .post<PaymentResponse>(`${API_BASE_URL}/payments/${paymentId}/void`, { reason })
      .pipe(map(withPaymentDefaults));
  }

  delete(id: string): Observable<BillResponse> {
    return this.http.delete<BillResponse>(`${this.base}/${id}`);
  }
}
