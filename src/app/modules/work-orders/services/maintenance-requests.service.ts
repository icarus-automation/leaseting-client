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

/**
 * The staff maintenance request API: read the org's requests, Start one,
 * Resolve one.
 *
 * There is no create, edit, or reopen here. Tenants file from Residence Care,
 * and the API refuses every other change to a request.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceRequestsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/maintenance-requests`;

  /** Whole organization, newest first. */
  list(filters: MaintenanceRequestFilters = {}): Observable<Paginated<StaffMaintenanceRequest>> {
    return this.http.get<Paginated<StaffMaintenanceRequest>>(this.base, {
      params: toHttpParams({ page: 1, limit: 10, ...filters }),
    });
  }

  get(id: string): Observable<StaffMaintenanceRequest> {
    return this.http.get<StaffMaintenanceRequest>(`${this.base}/${id}`);
  }

  /** Open to In progress. The API takes no body. */
  start(id: string): Observable<StaffMaintenanceRequest> {
    return this.http.post<StaffMaintenanceRequest>(`${this.base}/${id}/start`, null);
  }

  /** In progress to Resolved. A blank note is left out, since the API would store null anyway. */
  resolve(id: string, resolveNote = ''): Observable<StaffMaintenanceRequest> {
    const note = resolveNote.trim();
    return this.http.post<StaffMaintenanceRequest>(
      `${this.base}/${id}/resolve`,
      note ? { resolveNote: note } : {},
    );
  }

  /**
   * One private photo as a blob, with the session cookie. A bare `<img src>`
   * does not reliably carry that cookie across origins, so callers show the
   * blob through an object URL.
   */
  photo(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob', withCredentials: true });
  }
}
