import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  PaymentSubmissionFilters,
  PaymentSubmissionResponse,
} from '../../../core/models/payment-submission.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class PaymentSubmissionsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/payment-submissions`;

  list(filters: PaymentSubmissionFilters = {}): Observable<Paginated<PaymentSubmissionResponse>> {
    const params = toHttpParams({ page: 1, limit: 10, ...filters });
    return this.http.get<Paginated<PaymentSubmissionResponse>>(this.base, { params });
  }

  pendingCount(): Observable<{ pendingCount: number }> {
    return this.http.get<{ pendingCount: number }>(`${this.base}/pending-count`);
  }

  get(id: string): Observable<PaymentSubmissionResponse> {
    return this.http.get<PaymentSubmissionResponse>(`${this.base}/${id}`);
  }

  approve(id: string): Observable<PaymentSubmissionResponse> {
    return this.http.post<PaymentSubmissionResponse>(`${this.base}/${id}/approve`, {});
  }

  reject(id: string, reason: string): Observable<PaymentSubmissionResponse> {
    return this.http.post<PaymentSubmissionResponse>(`${this.base}/${id}/reject`, { reason });
  }

  proofUrl(id: string): string {
    return `${this.base}/${id}/proof`;
  }
}
