import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { CreateFloorPayload, FloorDetail, FloorResponse } from '../../../core/models/property.types';

@Injectable({ providedIn: 'root' })
export class FloorsService {
  private readonly http = inject(HttpClient);

  create(
    propertyId: string,
    payload: CreateFloorPayload,
    planImage: File | null,
  ): Observable<FloorResponse> {
    return this.http.post<FloorResponse>(
      `${API_BASE_URL}/properties/${propertyId}/floors`,
      toFormData(payload, planImage),
    );
  }

  get(id: string): Observable<FloorDetail> {
    return this.http.get<FloorDetail>(`${API_BASE_URL}/floors/${id}`);
  }

  update(
    id: string,
    payload: Partial<CreateFloorPayload>,
    planImage: File | null,
    removePlanImage = false,
  ): Observable<FloorResponse> {
    return this.http.patch<FloorResponse>(
      `${API_BASE_URL}/floors/${id}`,
      toFormData(payload, planImage, removePlanImage),
    );
  }

  /** Hard delete. Backend rejects with 409 while the floor still has units. */
  delete(id: string): Observable<FloorResponse> {
    return this.http.delete<FloorResponse>(`${API_BASE_URL}/floors/${id}`);
  }
}

/** Floor endpoints are multipart (`planImage` file field); numbers go as strings. */
function toFormData(
  payload: Partial<CreateFloorPayload>,
  planImage: File | null,
  removePlanImage = false,
): FormData {
  const form = new FormData();
  if (payload.level !== undefined) form.append('level', String(payload.level));
  if (payload.name !== undefined && payload.name !== '') form.append('name', payload.name);
  if (planImage) form.append('planImage', planImage);
  else if (removePlanImage) form.append('removePlanImage', 'true');
  return form;
}
