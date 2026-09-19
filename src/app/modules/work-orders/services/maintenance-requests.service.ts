import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  MaintenanceRequestFilters,
  StaffMaintenanceRequest,
} from '../../../core/models/maintenance-request.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class MaintenanceRequestsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/maintenance-requests`;

  list(filters: MaintenanceRequestFilters = {}): Observable<Paginated<StaffMaintenanceRequest>> {
    return this.http.get<Paginated<StaffMaintenanceRequest>>(this.base, {
      params: toHttpParams({ page: 1, limit: 10, ...filters }),
    });
  }

  get(id: string): Observable<StaffMaintenanceRequest> {
    return this.http.get<StaffMaintenanceRequest>(`${this.base}/${id}`);
  }

  start(id: string): Observable<StaffMaintenanceRequest> {
    return this.http.post<StaffMaintenanceRequest>(`${this.base}/${id}/start`, null);
  }

  resolve(id: string, resolveNote = ''): Observable<StaffMaintenanceRequest> {
    const note = resolveNote.trim();
    return this.http.post<StaffMaintenanceRequest>(
      `${this.base}/${id}/resolve`,
      note ? { resolveNote: note } : {},
    );
  }

  photo(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob', withCredentials: true });
  }
}
