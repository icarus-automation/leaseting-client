import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  CreateTenantPayload,
  TenantDetail,
  TenantDocumentItem,
  TenantResponse,
  UpdateTenantPayload,
} from '../../../core/models/tenant.types';

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/tenants`;

  list(options: { page?: number; limit?: number; q?: string } = {}): Observable<Paginated<TenantResponse>> {
    let params = new HttpParams()
      .set('page', options.page ?? 1)
      .set('limit', options.limit ?? 10);
    if (options.q) params = params.set('q', options.q);
    return this.http.get<Paginated<TenantResponse>>(this.base, { params });
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
