import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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

  list(): Observable<ChargeItemResponse[]> {
    return this.http.get<ChargeItemResponse[]>(this.base).pipe(map((items) => items.map(withChargeItemDefaults)));
  }

  create(payload: CreateChargeItemPayload): Observable<ChargeItemResponse> {
    return this.http.post<ChargeItemResponse>(this.base, payload).pipe(map(withChargeItemDefaults));
  }

  update(id: string, payload: UpdateChargeItemPayload): Observable<ChargeItemResponse> {
    return this.http.patch<ChargeItemResponse>(`${this.base}/${id}`, payload).pipe(map(withChargeItemDefaults));
  }

  archive(id: string): Observable<ChargeItemResponse> {
    return this.http.delete<ChargeItemResponse>(`${this.base}/${id}`).pipe(map(withChargeItemDefaults));
  }

  restore(id: string): Observable<ChargeItemResponse> {
    return this.http.post<ChargeItemResponse>(`${this.base}/${id}/restore`, {}).pipe(map(withChargeItemDefaults));
  }
}

/**
 * An API from before charge frequency leaves `frequency` and `isSystem` out. The client
 * deploys first, so read such items as ordinary monthly ones until the API catches up.
 */
export function withChargeItemDefaults(item: ChargeItemResponse): ChargeItemResponse {
  return {
    ...item,
    frequency: item.frequency ?? 'MONTHLY',
    isSystem: item.isSystem ?? false,
    systemKey: item.systemKey ?? null,
  };
}
