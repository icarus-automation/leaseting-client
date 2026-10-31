import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type { AuditEvent, AuditEventFilters } from '../../../core/models/audit-event.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class AuditEventsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/audit-events`;

  /** Newest first. Read-only: no route edits or deletes an event. */
  list(filters: AuditEventFilters = {}): Observable<Paginated<AuditEvent>> {
    const params = toHttpParams({ page: 1, limit: 20, ...filters });
    return this.http.get<Paginated<AuditEvent>>(this.base, { params });
  }
}
