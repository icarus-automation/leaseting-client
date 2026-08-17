import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { KitUsageReport } from '../kit-usage.types';

@Injectable({ providedIn: 'root' })
export class KitUsageService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/kit/usage`;

  report(days: number): Observable<KitUsageReport> {
    return this.http.get<KitUsageReport>(this.base, {
      params: new HttpParams().set('days', days),
    });
  }
}
