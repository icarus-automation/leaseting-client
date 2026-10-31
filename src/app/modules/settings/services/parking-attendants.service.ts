import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  CreateParkingAttendantPayload,
  ParkingAttendantResponse,
} from '../../../core/models/parking-attendant.types';

/** Parking terminal logins. `id` is the attendant's user id (`Member.userId`). */
@Injectable({ providedIn: 'root' })
export class ParkingAttendantsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/parking-attendants`;

  create(payload: CreateParkingAttendantPayload): Observable<ParkingAttendantResponse> {
    return this.http.post<ParkingAttendantResponse>(this.base, payload);
  }

  /** `[]` gives every property back. */
  setPropertyAccess(id: string, propertyIds: string[]): Observable<ParkingAttendantResponse> {
    return this.http.put<ParkingAttendantResponse>(`${this.base}/${id}/property-access`, { propertyIds });
  }

  setPassword(id: string, password: string): Observable<ParkingAttendantResponse> {
    return this.http.post<ParkingAttendantResponse>(`${this.base}/${id}/password`, { password });
  }

  disable(id: string): Observable<ParkingAttendantResponse> {
    return this.http.post<ParkingAttendantResponse>(`${this.base}/${id}/disable`, {});
  }

  enable(id: string): Observable<ParkingAttendantResponse> {
    return this.http.post<ParkingAttendantResponse>(`${this.base}/${id}/enable`, {});
  }
}
