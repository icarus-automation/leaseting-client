import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { VehicleTypeResponse } from '../../../core/models/vehicle-type.types';

@Injectable({ providedIn: 'root' })
export class VehicleTypesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/vehicle-types`;

  list(): Observable<VehicleTypeResponse[]> {
    return this.http.get<VehicleTypeResponse[]>(this.base);
  }

  create(name: string): Observable<VehicleTypeResponse> {
    return this.http.post<VehicleTypeResponse>(this.base, { name });
  }

  rename(id: string, name: string): Observable<VehicleTypeResponse> {
    return this.http.patch<VehicleTypeResponse>(`${this.base}/${id}`, { name });
  }

  archive(id: string): Observable<VehicleTypeResponse> {
    return this.http.delete<VehicleTypeResponse>(`${this.base}/${id}`);
  }

  restore(id: string): Observable<VehicleTypeResponse> {
    return this.http.post<VehicleTypeResponse>(`${this.base}/${id}/restore`, {});
  }
}
