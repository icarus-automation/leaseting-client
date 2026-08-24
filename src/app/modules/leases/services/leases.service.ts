import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  LeaseDetail,
  LeaseListFilters,
  LeaseListItem,
  LeaseResponse,
} from '../../../core/models/lease.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class LeasesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/leases`;

  list(filters: LeaseListFilters = {}): Observable<Paginated<LeaseListItem>> {
    const params = toHttpParams({ page: 1, limit: 10, ...filters });
    return this.http.get<Paginated<LeaseListItem>>(this.base, { params });
  }

  get(id: string): Observable<LeaseDetail> {
    return this.http.get<LeaseDetail>(`${this.base}/${id}`);
  }

  terminate(id: string): Observable<LeaseResponse> {
    return this.http.post<LeaseResponse>(`${this.base}/${id}/terminate`, {});
  }
}
