import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  CreateTenantPayload,
  TenantDetail,
  TenantDocumentItem,
  TenantListFilters,
  TenantListItem,
  TenantResponse,
  UpdateTenantPayload,
} from '../../../core/models/tenant.types';
import type { PortalAccessResponse } from '../../../core/models/portal-access.types';
import type { TenantRiskProfile } from '../../../core/models/risk.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/tenants`;

  list(options: TenantListFilters = {}): Observable<Paginated<TenantListItem>> {
    const params = toHttpParams({ page: 1, limit: 10, ...options });
    return this.http.get<Paginated<TenantListItem>>(this.base, { params });
  }

  /**
   * How this tenant is paying, and whether the lease looks like it will renew.
   *
   * A separate call from {@link get} on purpose: the bands need a year of
   * bills and their payments, and the profile is useful before they arrive.
   */
  risk(id: string): Observable<TenantRiskProfile> {
    return this.http.get<TenantRiskProfile>(`${this.base}/${id}/risk`);
  }

  get(id: string): Observable<TenantDetail> {
    return this.http.get<TenantDetail>(`${this.base}/${id}`);
  }

  create(payload: CreateTenantPayload, photo: File | null = null): Observable<TenantResponse> {
    return this.http.post<TenantResponse>(this.base, toFormData(payload, photo));
  }

  update(
    id: string,
    payload: UpdateTenantPayload,
    photo: File | null = null,
    removePhoto = false,
  ): Observable<TenantResponse> {
    return this.http.patch<TenantResponse>(`${this.base}/${id}`, toFormData(payload, photo, removePhoto));
  }

  /** Soft archive. Backend rejects with 409 while the tenant has an active lease. */
  archive(id: string): Observable<TenantResponse> {
    return this.http.delete<TenantResponse>(`${this.base}/${id}`);
  }

  uploadDocument(tenantId: string, file: File, label?: string): Observable<TenantDocumentItem> {
    const form = new FormData();
    form.append('file', file);
    if (label) form.append('label', label);
    return this.http.post<TenantDocumentItem>(`${this.base}/${tenantId}/documents`, form);
  }

  deleteDocument(documentId: string): Observable<TenantDocumentItem> {
    return this.http.delete<TenantDocumentItem>(`${API_BASE_URL}/tenant-documents/${documentId}`);
  }

  getPortalAccess(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.get<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access`);
  }

  activatePortalAccess(tenantId: string, email: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/activate`, {
      email,
    });
  }

  resetPortalAccess(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/reset`, {});
  }

  disablePortalAccess(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/disable`, {});
  }

  reactivatePortalAccess(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/reactivate`, {});
  }
}

/**
 * Tenant create/update are multipart endpoints (optional `photo` file field).
 * Content-Type stays unset so the browser writes the multipart boundary.
 */
function toFormData(payload: UpdateTenantPayload, photo: File | null, removePhoto = false): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }
  if (photo) form.append('photo', photo);
  else if (removePhoto) form.append('removePhoto', 'true');
  return form;
}
