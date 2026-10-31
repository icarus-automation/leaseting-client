import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Role } from '../../../core/models/role.types';
import type { RoleWritePayload } from '../utils/role-access.util';

export type { RoleWritePayload };

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/roles`;

  list(): Observable<Role[]> {
    return this.http.get<Role[]>(this.base);
  }

  get(roleId: string): Observable<Role> {
    return this.http.get<Role>(`${this.base}/${roleId}`);
  }

  create(payload: RoleWritePayload): Observable<Role> {
    return this.http.post<Role>(this.base, payload);
  }

  update(roleId: string, payload: RoleWritePayload): Observable<Role> {
    return this.http.patch<Role>(`${this.base}/${roleId}`, payload);
  }

  setActive(roleId: string, isActive: boolean): Observable<Role> {
    return this.http.patch<Role>(`${this.base}/${roleId}/active`, { isActive });
  }

  remove(roleId: string): Observable<Role> {
    return this.http.delete<Role>(`${this.base}/${roleId}`);
  }
}
