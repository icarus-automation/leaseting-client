import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { PropertyTypeResponse } from '../../../core/models/property-type.types';

@Injectable({ providedIn: 'root' })
export class PropertyTypesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/property-types`;

  /** Full org list, archived included (Settings shows both; pickers filter). */
  list(): Observable<PropertyTypeResponse[]> {
    return this.http.get<PropertyTypeResponse[]>(this.base);
  }

  create(name: string): Observable<PropertyTypeResponse> {
    return this.http.post<PropertyTypeResponse>(this.base, { name });
  }

  rename(id: string, name: string): Observable<PropertyTypeResponse> {
    return this.http.patch<PropertyTypeResponse>(`${this.base}/${id}`, { name });
  }

  /** Soft archive — the type leaves pickers but stays on existing properties. */
  archive(id: string): Observable<PropertyTypeResponse> {
    return this.http.delete<PropertyTypeResponse>(`${this.base}/${id}`);
  }

  restore(id: string): Observable<PropertyTypeResponse> {
    return this.http.post<PropertyTypeResponse>(`${this.base}/${id}/restore`, {});
  }
}
