import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  CreateRatePlanPayload,
  RatePlanResponse,
  UpdateRatePlanPayload,
} from '../../../core/models/rate-plan.types';

@Injectable({ providedIn: 'root' })
export class RatePlansService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/rate-plans`;

  /** Full org list, archived included (Settings shows both; pickers filter). */
  list(): Observable<RatePlanResponse[]> {
    return this.http.get<RatePlanResponse[]>(this.base);
  }

  create(payload: CreateRatePlanPayload): Observable<RatePlanResponse> {
    return this.http.post<RatePlanResponse>(this.base, payload);
  }

  update(id: string, payload: UpdateRatePlanPayload): Observable<RatePlanResponse> {
    return this.http.patch<RatePlanResponse>(`${this.base}/${id}`, payload);
  }

  /** Soft archive — the plan leaves the picker; history that used it is untouched. */
  archive(id: string): Observable<RatePlanResponse> {
    return this.http.delete<RatePlanResponse>(`${this.base}/${id}`);
  }

  restore(id: string): Observable<RatePlanResponse> {
    return this.http.post<RatePlanResponse>(`${this.base}/${id}/restore`, {});
  }
}
