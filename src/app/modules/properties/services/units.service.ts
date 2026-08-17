import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  CreateUnitPayload,
  UnitDetail,
  UnitPickerItem,
  UnitResponse,
  UpdateUnitPayload,
} from '../../../core/models/property.types';
import type { UnitStatus } from '../../../core/models/enums';

@Injectable({ providedIn: 'root' })
export class UnitsService {
  private readonly http = inject(HttpClient);

  create(floorId: string, payload: CreateUnitPayload): Observable<UnitResponse> {
    return this.http.post<UnitResponse>(`${API_BASE_URL}/floors/${floorId}/units`, payload);
  }

  /** Cross-property picker rows; filter by derived occupancy when given. */
  listAll(occupancy?: UnitStatus): Observable<UnitPickerItem[]> {
    const params = occupancy ? { params: { occupancy } } : {};
    return this.http.get<UnitPickerItem[]>(`${API_BASE_URL}/units`, params);
  }

  get(id: string): Observable<UnitDetail> {
    return this.http.get<UnitDetail>(`${API_BASE_URL}/units/${id}`);
  }

  /** Also the endpoint for saving `mapCoordinates` from the map-units editor. */
  update(id: string, payload: UpdateUnitPayload): Observable<UnitResponse> {
    return this.http.patch<UnitResponse>(`${API_BASE_URL}/units/${id}`, payload);
  }

  /** Soft archive. Backend rejects with 409 while the unit has an active lease. */
  archive(id: string): Observable<UnitResponse> {
    return this.http.delete<UnitResponse>(`${API_BASE_URL}/units/${id}`);
  }
}
