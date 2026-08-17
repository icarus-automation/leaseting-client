import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  OnboardingDetail,
  OnboardingListItem,
  OnboardingStatus,
  OnboardingStepData,
  OnboardingStepKey,
} from '../../../core/models/onboarding.types';

@Injectable({ providedIn: 'root' })
export class OnboardingsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/onboardings`;

  /** Both ids are optional prefills; see the backend CreateOnboardingDTO. */
  create(payload: { tenantId?: string; unitId?: string } = {}): Observable<OnboardingDetail> {
    return this.http.post<OnboardingDetail>(this.base, payload);
  }

  list(status?: OnboardingStatus): Observable<OnboardingListItem[]> {
    return this.http.get<OnboardingListItem[]>(this.base, status ? { params: { status } } : {});
  }

  get(id: string): Observable<OnboardingDetail> {
    return this.http.get<OnboardingDetail>(`${this.base}/${id}`);
  }

  /** Persists one step (validated per-step server-side) and advances the resume point. */
  updateStep(id: string, stepKey: OnboardingStepKey, data: OnboardingStepData): Observable<OnboardingDetail> {
    return this.http.patch<OnboardingDetail>(`${this.base}/${id}/steps/${stepKey}`, { data });
  }

  /** Creates the lease + opening bills + payments in one transaction. */
  complete(id: string): Observable<OnboardingDetail> {
    return this.http.post<OnboardingDetail>(`${this.base}/${id}/complete`, {});
  }

  cancel(id: string): Observable<OnboardingDetail> {
    return this.http.post<OnboardingDetail>(`${this.base}/${id}/cancel`, {});
  }
}
