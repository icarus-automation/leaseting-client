import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type { GenerateSoaPayload, SoaListFilters, SoaResponse } from '../../../core/models/soa.types';

@Injectable({ providedIn: 'root' })
export class SoaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/soa`;

  generate(leaseId: string, payload: GenerateSoaPayload): Observable<SoaResponse> {
    return this.http.post<SoaResponse>(`${API_BASE_URL}/leases/${leaseId}/soa`, payload);
  }

  list(filters: SoaListFilters = {}): Observable<Paginated<SoaResponse>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('limit', filters.limit ?? 10);
    if (filters.leaseId) params = params.set('leaseId', filters.leaseId);
    if (filters.tenantId) params = params.set('tenantId', filters.tenantId);
    return this.http.get<Paginated<SoaResponse>>(this.base, { params });
  }

  resendSms(id: string): Observable<SoaResponse> {
    return this.http.post<SoaResponse>(`${this.base}/${id}/resend-sms`, {});
  }

  /**
   * Authenticated download link (session cookie rides along on navigation).
   * Used as a plain href so the browser handles the file save.
   */
  downloadUrl(id: string): string {
    return `${this.base}/${id}/download`;
  }
}
