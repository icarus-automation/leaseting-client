import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  LeaseDetail,
  LeaseListFilters,
  LeaseListItem,
  LeaseResponse,
} from '../../../core/models/lease.types';

@Injectable({ providedIn: 'root' })
export class LeasesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/leases`;

  list(filters: LeaseListFilters = {}): Observable<Paginated<LeaseListItem>> {
    let params = new HttpParams()
      .set('page', filters.page ?? 1)
      .set('limit', filters.limit ?? 10);
    if (filters.unitId) params = params.set('unitId', filters.unitId);
    if (filters.tenantId) params = params.set('tenantId', filters.tenantId);
    if (filters.active !== undefined) params = params.set('active', filters.active);
    return this.http.get<Paginated<LeaseListItem>>(this.base, { params });
  }

  get(id: string): Observable<LeaseDetail> {
    return this.http.get<LeaseDetail>(`${this.base}/${id}`);
  }

  terminate(id: string): Observable<LeaseResponse> {
    return this.http.post<LeaseResponse>(`${this.base}/${id}/terminate`, {});
  }
}
