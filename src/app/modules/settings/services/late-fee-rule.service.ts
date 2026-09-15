import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { LateFeeRuleResponse, UpdateLateFeeRulePayload } from '../../../core/models/late-fee-rule.types';

@Injectable({ providedIn: 'root' })
export class LateFeeRuleService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/late-fee-rule`;

  get(): Observable<LateFeeRuleResponse> {
    return this.http.get<LateFeeRuleResponse>(this.base);
  }

  update(payload: UpdateLateFeeRulePayload): Observable<LateFeeRuleResponse> {
    return this.http.patch<LateFeeRuleResponse>(this.base, payload);
  }
}
