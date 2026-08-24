import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  ChargeItemResponse,
  CreateChargeItemPayload,
  UpdateChargeItemPayload,
} from '../../../core/models/charge-item.types';

@Injectable({ providedIn: 'root' })
export class ChargeItemsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/charge-items`;

  /** Full org list, archived included (Settings shows both; pickers filter). */
  list(): Observable<ChargeItemResponse[]> {
    return this.http.get<ChargeItemResponse[]>(this.base);
  }

  create(payload: CreateChargeItemPayload): Observable<ChargeItemResponse> {
    return this.http.post<ChargeItemResponse>(this.base, payload);
  }

  update(id: string, payload: UpdateChargeItemPayload): Observable<ChargeItemResponse> {
    return this.http.patch<ChargeItemResponse>(`${this.base}/${id}`, payload);
  }

  /** Soft archive — the item leaves the pickers but stays on existing leases. */
  archive(id: string): Observable<ChargeItemResponse> {
    return this.http.delete<ChargeItemResponse>(`${this.base}/${id}`);
  }

  restore(id: string): Observable<ChargeItemResponse> {
    return this.http.post<ChargeItemResponse>(`${this.base}/${id}/restore`, {});
  }
}
