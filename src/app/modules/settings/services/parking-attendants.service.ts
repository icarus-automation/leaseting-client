import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { ParkingAttendantResponse } from '../../../core/models/parking-attendant.types';

@Injectable({ providedIn: 'root' })
export class ParkingAttendantsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/parking-attendants`;

  list(): Observable<ParkingAttendantResponse[]> {
    return this.http.get<ParkingAttendantResponse[]>(this.base);
  }

  create(name: string, email: string, password: string): Observable<ParkingAttendantResponse> {
    return this.http.post<ParkingAttendantResponse>(this.base, { name, email, password });
  }

  /** Also signs out every handheld still holding the old password. */
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
