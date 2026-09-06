import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  CreateParkingTerminalPayload,
  ParkingTerminalResponse,
  UpdateParkingTerminalPayload,
} from '../../../core/models/parking-terminal.types';

@Injectable({ providedIn: 'root' })
export class ParkingTerminalsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/parking-terminals`;

  list(propertyId?: string): Observable<ParkingTerminalResponse[]> {
    const params = propertyId ? new HttpParams().set('propertyId', propertyId) : undefined;
    return this.http.get<ParkingTerminalResponse[]>(this.base, { params });
  }

  create(payload: CreateParkingTerminalPayload): Observable<ParkingTerminalResponse> {
    return this.http.post<ParkingTerminalResponse>(this.base, payload);
  }

  update(id: string, payload: UpdateParkingTerminalPayload): Observable<ParkingTerminalResponse> {
    return this.http.patch<ParkingTerminalResponse>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<ParkingTerminalResponse> {
    return this.http.delete<ParkingTerminalResponse>(`${this.base}/${id}`);
  }
}
