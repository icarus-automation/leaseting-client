import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  ParkingOverviewSession,
  ParkingOverviewSessionQuery,
  ParkingOverviewShift,
  ParkingOverviewShiftQuery,
  ParkingOverviewScope,
  ParkingOverviewSummary,
} from '../../../core/models/parking-overview.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

/**
 * The staff parking API. Read the floor, void a wrong entry, sign off a till.
 *
 * There is deliberately no `parkingIn` or `parkingOut` here, and there is no
 * endpoint to call if one were added: entry and exit belong to the guard at the
 * barrier, on the handheld, and the web client is not given a way to fake
 * either.
 */
@Injectable({ providedIn: 'root' })
export class ParkingOverviewService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/parking-overview`;

  summary(scope: ParkingOverviewScope): Observable<ParkingOverviewSummary> {
    return this.http.get<ParkingOverviewSummary>(`${this.base}/summary`, {
      params: toHttpParams({ ...scope }),
    });
  }

  sessions(query: ParkingOverviewSessionQuery): Observable<ParkingOverviewSession[]> {
    return this.http.get<ParkingOverviewSession[]>(`${this.base}/sessions`, {
      params: toHttpParams({ ...query }),
    });
  }

  /** Open stays only. The backend refuses a collected exit, reason required. */
  voidSession(id: string, reason: string): Observable<ParkingOverviewSession> {
    return this.http.post<ParkingOverviewSession>(`${this.base}/sessions/${id}/void`, { reason });
  }

  shifts(query: ParkingOverviewShiftQuery): Observable<ParkingOverviewShift[]> {
    return this.http.get<ParkingOverviewShift[]>(`${this.base}/shifts`, {
      params: toHttpParams({ ...query }),
    });
  }

  confirmShift(id: string): Observable<ParkingOverviewShift> {
    return this.http.post<ParkingOverviewShift>(`${this.base}/shifts/${id}/confirm`, {});
  }
}
