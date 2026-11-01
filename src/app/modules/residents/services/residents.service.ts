import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  CreateResidentPayload,
  ResidentDetail,
  ResidentDocumentItem,
  ResidentListFilters,
  ResidentListItem,
  ResidentResponse,
  UpdateResidentPayload,
} from '../../../core/models/resident.types';
import type { ResidentRiskProfile } from '../../../core/models/risk.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class ResidentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/residents`;

  list(options: ResidentListFilters = {}): Observable<Paginated<ResidentListItem>> {
    const params = toHttpParams({ page: 1, limit: 10, ...options });
    return this.http.get<Paginated<ResidentListItem>>(this.base, { params });
  }

  risk(id: string): Observable<ResidentRiskProfile> {
    return this.http.get<ResidentRiskProfile>(`${this.base}/${id}/risk`);
  }

  get(id: string): Observable<ResidentDetail> {
    return this.http.get<ResidentDetail>(`${this.base}/${id}`);
  }

  create(payload: CreateResidentPayload, photo: File | null = null): Observable<ResidentResponse> {
    return this.http.post<ResidentResponse>(this.base, toFormData(payload, photo));
  }

  update(
    id: string,
    payload: UpdateResidentPayload,
    photo: File | null = null,
    removePhoto = false,
  ): Observable<ResidentResponse> {
    return this.http.patch<ResidentResponse>(`${this.base}/${id}`, toFormData(payload, photo, removePhoto));
  }

  archive(id: string): Observable<ResidentResponse> {
    return this.http.delete<ResidentResponse>(`${this.base}/${id}`);
  }

  uploadDocument(residentId: string, file: File, label?: string): Observable<ResidentDocumentItem> {
    const form = new FormData();
    form.append('file', file);
    if (label) form.append('label', label);
    return this.http.post<ResidentDocumentItem>(`${this.base}/${residentId}/documents`, form);
  }

  deleteDocument(documentId: string): Observable<ResidentDocumentItem> {
    return this.http.delete<ResidentDocumentItem>(`${API_BASE_URL}/resident-documents/${documentId}`);
  }
}

function toFormData(payload: UpdateResidentPayload, photo: File | null, removePhoto = false): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }
  if (photo) form.append('photo', photo);
  else if (removePhoto) form.append('removePhoto', 'true');
  return form;
}
