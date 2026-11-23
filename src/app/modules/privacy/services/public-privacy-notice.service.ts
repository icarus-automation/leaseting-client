import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { PublicPrivacyNotice } from '../../../core/models/privacy.types';

@Injectable({ providedIn: 'root' })
export class PublicPrivacyNoticeService {
  private readonly http = inject(HttpClient);

  /** No session needed: the API answers anyone with the organization's current version. */
  get(slug: string): Observable<PublicPrivacyNotice> {
    return this.http.get<PublicPrivacyNotice>(`${API_BASE_URL}/public/privacy-notices/${encodeURIComponent(slug)}`);
  }
}
