import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  OwnershipResponse,
  ResaleResult,
  ResellUnitPayload,
  SellUnitPayload,
} from '../../../core/models/ownership.types';

@Injectable({ providedIn: 'root' })
export class OwnershipsService {
  private readonly http = inject(HttpClient);

  sell(unitId: string, payload: SellUnitPayload): Observable<OwnershipResponse> {
    return this.http.post<OwnershipResponse>(`${API_BASE_URL}/units/${unitId}/ownerships`, payload);
  }

  resell(unitId: string, payload: ResellUnitPayload): Observable<ResaleResult> {
    return this.http.post<ResaleResult>(`${API_BASE_URL}/units/${unitId}/ownerships/resale`, payload);
  }

  list(unitId: string): Observable<OwnershipResponse[]> {
    return this.http.get<OwnershipResponse[]>(`${API_BASE_URL}/units/${unitId}/ownerships`);
  }
}
