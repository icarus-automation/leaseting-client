import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import type { GridId, GridQueryPayload, GridQueryResult } from '../models/grid-query.types';

/**
 * Turns a sentence typed over a data grid into that grid's filters.
 *
 * POST rather than GET: the sentence is a manager's own phrasing, and a search
 * box should not put it into access logs and browser history. Nothing is
 * persisted server-side — the response comes back as chips, and this client
 * decides what to apply.
 */
@Injectable({ providedIn: 'root' })
export class GridQueryService {
  private readonly http = inject(HttpClient);

  parse(grid: GridId, text: string): Observable<GridQueryResult> {
    const payload: GridQueryPayload = { grid, text };
    return this.http.post<GridQueryResult>(`${API_BASE_URL}/kit/grid-query`, payload);
  }
}
