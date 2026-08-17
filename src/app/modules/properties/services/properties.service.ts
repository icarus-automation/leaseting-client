import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  CreatePropertyPayload,
  PropertyDetail,
  PropertyListItem,
  PropertyResponse,
} from '../../../core/models/property.types';

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/properties`;

  list(page = 1, limit = 12): Observable<Paginated<PropertyListItem>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<Paginated<PropertyListItem>>(this.base, { params });
  }

  get(id: string): Observable<PropertyDetail> {
    return this.http.get<PropertyDetail>(`${this.base}/${id}`);
  }

  create(payload: CreatePropertyPayload, image: File | null): Observable<PropertyResponse> {
    return this.http.post<PropertyResponse>(this.base, toFormData(payload, image));
  }

  update(
    id: string,
    payload: Partial<CreatePropertyPayload>,
    image: File | null,
    removeImage = false,
  ): Observable<PropertyResponse> {
    return this.http.patch<PropertyResponse>(
      `${this.base}/${id}`,
      toFormData(payload, image, removeImage),
    );
  }

  /** Soft archive. Backend rejects with 409 while the property has active leases. */
  archive(id: string): Observable<PropertyResponse> {
    return this.http.delete<PropertyResponse>(`${this.base}/${id}`);
  }
}

/**
 * Property create/update are multipart endpoints (optional `image` file field).
 * Content-Type stays unset so the browser writes the multipart boundary.
 */
function toFormData(
  payload: Partial<CreatePropertyPayload>,
  image: File | null,
  removeImage = false,
): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }
  if (image) form.append('image', image);
  else if (removeImage) form.append('removeImage', 'true');
  return form;
}
