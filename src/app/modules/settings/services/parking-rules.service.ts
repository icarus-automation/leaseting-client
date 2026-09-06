import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { ParkingRulesResponse, UpdateParkingRulesPayload } from '../../../core/models/parking-rules.types';

@Injectable({ providedIn: 'root' })
export class ParkingRulesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/parking-rules`;

  get(): Observable<ParkingRulesResponse> {
    return this.http.get<ParkingRulesResponse>(this.base);
  }

  update(payload: UpdateParkingRulesPayload): Observable<ParkingRulesResponse> {
    return this.http.patch<ParkingRulesResponse>(this.base, payload);
  }
}
