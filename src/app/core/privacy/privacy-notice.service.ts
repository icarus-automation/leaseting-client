import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../config/api';
import type { PrivacyNotice, PrivacyNoticeVersionDetail } from '../models/privacy.types';

@Injectable({ providedIn: 'root' })
export class PrivacyNoticeService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/privacy-notice`;

  get(): Observable<PrivacyNotice> {
    return this.http.get<PrivacyNotice>(this.base);
  }

  version(version: number): Observable<PrivacyNoticeVersionDetail> {
    return this.http.get<PrivacyNoticeVersionDetail>(`${this.base}/versions/${version}`);
  }

  /** Publishes `body` as the next version. Every version asks Residence Care users to agree again. */
  publish(body: string): Observable<PrivacyNotice> {
    return this.http.post<PrivacyNotice>(`${this.base}/versions`, { body });
  }
}
